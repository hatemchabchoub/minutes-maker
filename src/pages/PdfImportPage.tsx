import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Upload, FileText, Loader2, CheckCircle2, XCircle, AlertTriangle,
  Eye, RotateCcw, ArrowRight, Shield,
} from "lucide-react";
import { toast } from "sonner";

type Stage = "upload" | "processing" | "review" | "prefill";

const confidenceColor = (score: number) => {
  if (score >= 80) return "bg-primary/10 text-primary border-primary/20";
  if (score >= 50) return "bg-accent/10 text-accent-foreground border-accent/20";
  return "bg-destructive/10 text-destructive border-destructive/20";
};

const confidenceLabel = (score: number) => {
  if (score >= 80) return "عالية";
  if (score >= 50) return "متوسطة";
  return "ضعيفة";
};

const FIELD_LABELS: Record<string, string> = {
  pv_number: "عدد المحضر",
  pv_date: "التاريخ",
  department_name: "القسم",
  officer_name: "الضابط",
  officer_badge: "الرقم",
  officer_rank: "الرتبة",
  referral_type: "طبيعة الإحالة",
  referral_source: "مصدر الإحالة",
  pv_type: "محضر/ضلع",
  customs_violation: "مخالفة ديوانية",
  currency_violation: "مخالفة صرفية",
  public_law_violation: "حق عام",
  seizure_renewal: "تجديد حجز",
  total_actual_seizure: "المحجوز الفعلي",
  total_virtual_seizure: "المحجوز الصوري",
  total_precautionary_seizure: "المحجوز التحفظي",
  notes: "ملاحظات",
  offenders: "المخالفون",
  violations: "المخالفات",
  seizures: "المحجوزات",
};

const PdfImportPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<Stage>("upload");
  const [importId, setImportId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [fileName, setFileName] = useState("");

  // Extracted data for review
  const [extractedData, setExtractedData] = useState<any>(null);
  const [confidenceData, setConfidenceData] = useState<any>({});
  const [overallConfidence, setOverallConfidence] = useState(0);
  const [fieldCandidates, setFieldCandidates] = useState<any[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  // Recent imports
  const { data: recentImports } = useQuery({
    queryKey: ["recent-imports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("document_imports")
        .select("*")
        .eq("import_type", "pdf")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("صيغة غير مدعومة. استخدم PDF أو JPG أو PNG.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("الملف كبير جدا (الحد الأقصى 20 ميقا)");
      return;
    }

    setUploading(true);
    setFileName(file.name);

    try {
      // Upload to storage
      const storagePath = `ocr-imports/${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("pv-attachments")
        .upload(storagePath, file);
      if (uploadErr) throw uploadErr;

      // Create import record
      const { data: importRec, error: importErr } = await supabase
        .from("document_imports")
        .insert({
          import_type: "pdf",
          source_file_name: file.name,
          storage_path: storagePath,
          uploaded_by: user.id,
          status: "pending",
        })
        .select("id")
        .single();
      if (importErr) throw importErr;

      setImportId(importRec.id);
      toast.success("تم تحميل الملف بنجاح");

      // Start extraction
      setStage("processing");
      setExtracting(true);

      const { data: extractResult, error: extractErr } = await supabase.functions.invoke("ocr-extract", {
        body: { import_id: importRec.id },
      });

      if (extractErr) throw new Error(extractErr.message);
      if (extractResult?.error) throw new Error(extractResult.error);

      setExtractedData(extractResult.extracted);
      setConfidenceData(extractResult.confidence || {});
      setOverallConfidence(extractResult.overall_confidence || 50);

      // Load field candidates
      const { data: candidates } = await (supabase as any)
        .from("document_field_candidates")
        .select("*")
        .eq("import_id", importRec.id)
        .order("field_name");
      setFieldCandidates(candidates || []);

      // Pre-populate edited values
      const edits: Record<string, string> = {};
      candidates?.forEach((c: any) => {
        edits[c.field_name] = c.extracted_value || "";
      });
      setEditedValues(edits);

      setStage("review");
      queryClient.invalidateQueries({ queryKey: ["recent-imports"] });
      toast.success(`اكتمل الاستخراج — الثقة: ${extractResult.overall_confidence}%`);
    } catch (err: any) {
      toast.error("خطأ: " + (err.message || "خطأ غير معروف"));
      setStage("upload");
    } finally {
      setUploading(false);
      setExtracting(false);
    }
  }, [user, queryClient]);

  const handlePrefill = () => {
    // Build prefill data from edited values
    const data = { ...extractedData };
    Object.entries(editedValues).forEach(([key, val]) => {
      if (key === "offenders" || key === "violations" || key === "seizures") {
        try { data[key] = JSON.parse(val); } catch { /* keep original */ }
      } else {
        data[key] = val;
      }
    });

    // Navigate to wizard with prefill data
    navigate("/pv/new", { state: { prefill: data, importId } });
    toast.success("تم ملء البيانات مسبقا في الاستمارة");
  };

  const handleReset = () => {
    setStage("upload");
    setImportId(null);
    setExtractedData(null);
    setConfidenceData({});
    setFieldCandidates([]);
    setEditedValues({});
    setFileName("");
  };

  const scalarFields = fieldCandidates.filter(
    (f) => !["offenders", "violations", "seizures"].includes(f.field_name)
  );
  const arrayFields = fieldCandidates.filter((f) =>
    ["offenders", "violations", "seizures"].includes(f.field_name)
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          استخراج تلقائي ذكي — Smart Document Intake
        </h1>
        <p className="text-sm text-muted-foreground">
          قم بتحميل ملف PDF أو صورة محضر لاستخراج البيانات المهيكلة تلقائيا عبر الذكاء الاصطناعي
        </p>
      </div>

      {/* Upload Stage */}
      {stage === "upload" && (
        <div className="space-y-6">
          <div className="surface-elevated p-12 flex flex-col items-center gap-4 border-2 border-dashed border-border">
            <div className="p-4 bg-primary/10 rounded-sm">
              <FileText className="h-10 w-10 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium">قم بتحميل وثيقة محضر</p>
              <p className="text-sm text-muted-foreground mt-1">
                PDF أو JPG أو PNG — وثائق ممسوحة، استمارات رسمية، وثائق ثنائية اللغة عربي/فرنسي
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                سيقوم الذكاء الاصطناعي بتحليل الوثيقة واستخراج الحقول المهيكلة تلقائيا
              </p>
            </div>
            <label className="cursor-pointer">
              <Button asChild disabled={uploading}>
                <span>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? "جاري التحميل..." : "اختيار ملف"}
                </span>
              </Button>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>

          {/* Recent imports */}
          {recentImports && recentImports.length > 0 && (
            <div className="surface-elevated">
              <div className="px-4 py-3 border-b">
                <h2 className="text-sm font-medium">عمليات الاستيراد الأخيرة</h2>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead>الملف</TableHead>
                     <TableHead>الحالة</TableHead>
                     <TableHead>الثقة</TableHead>
                     <TableHead>التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentImports.map((imp: any) => (
                    <TableRow key={imp.id}>
                      <TableCell className="text-sm">{imp.source_file_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          imp.status === "extracted" ? "border-primary/30 text-primary" :
                          imp.status === "error" ? "border-destructive/30 text-destructive" :
                          "border-border"
                        }>
                          {imp.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono-data text-sm">
                        {imp.confidence_score ? `${imp.confidence_score}%` : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {imp.created_at ? new Date(imp.created_at).toLocaleDateString("ar-TN") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Processing Stage */}
      {stage === "processing" && (
        <div className="surface-elevated p-12 flex flex-col items-center gap-6">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
          <div className="text-center">
            <p className="font-medium text-lg">جاري التحليل...</p>
            <p className="text-sm text-muted-foreground mt-2">
              الذكاء الاصطناعي يحلل الوثيقة «{fileName}» ويستخرج البيانات المهيكلة
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              اكتشاف حقول المحضر، المخالفين، المخالفات والمحجوزات...
            </p>
          </div>
          <Progress value={extracting ? 60 : 100} className="w-full max-w-md" />
        </div>
      )}

      {/* Review Stage */}
      {stage === "review" && (
        <div className="space-y-4">
          {/* Summary bar */}
          <div className="surface-elevated p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {fieldCandidates.length} حقل مستخرج
                </p>
              </div>
              <div className={`px-3 py-1 rounded-sm text-xs font-medium border ${confidenceColor(overallConfidence)}`}>
                <Shield className="h-3 w-3 inline me-1" />
                الثقة: {overallConfidence}% — {confidenceLabel(overallConfidence)}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
                وثيقة جديدة
              </Button>
              <Button size="sm" onClick={handlePrefill}>
                <ArrowRight className="h-4 w-4" />
                ملء المحضر مسبقا
              </Button>
            </div>
          </div>

          {/* Scalar fields */}
          <div className="surface-elevated p-6">
            <h2 className="text-sm font-medium mb-4">الحقول المستخرجة</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {scalarFields.map((field: any) => {
                const conf = field.confidence || 50;
                return (
                  <div key={field.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">
                        {FIELD_LABELS[field.field_name] || field.field_name}
                      </Label>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${confidenceColor(conf)}`}>
                        {conf}%
                      </span>
                    </div>
                    <Input
                      value={editedValues[field.field_name] || ""}
                      onChange={(e) =>
                        setEditedValues((prev) => ({ ...prev, [field.field_name]: e.target.value }))
                      }
                      className={conf < 50 ? "border-destructive/30" : ""}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Array fields (offenders, violations, seizures) */}
          {arrayFields.map((field: any) => {
            let items: any[] = [];
            try {
              items = JSON.parse(field.extracted_value || "[]");
            } catch {
              items = [];
            }
            const conf = field.confidence || 50;

            return (
              <div key={field.id} className="surface-elevated p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium">
                    {FIELD_LABELS[field.field_name] || field.field_name} ({items.length})
                  </h2>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${confidenceColor(conf)}`}>
                    {conf}%
                  </span>
                </div>

                {field.field_name === "offenders" && items.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                         <TableHead>الاسم / الشركة</TableHead>
                         <TableHead>المعرف</TableHead>
                         <TableHead>النوع</TableHead>
                         <TableHead>المدينة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{item.name_or_company || "—"}</TableCell>
                          <TableCell className="font-mono-data text-sm">{item.identifier || "—"}</TableCell>
                          <TableCell>{item.person_type === "physical" ? "شخص طبيعي" : item.person_type === "legal" ? "شخص معنوي" : item.person_type || "—"}</TableCell>
                          <TableCell>{item.city || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {field.field_name === "violations" && items.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                         <TableHead>المخالفة</TableHead>
                         <TableHead>الصنف</TableHead>
                         <TableHead>الأساس القانوني</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-sm">{item.violation_label || "—"}</TableCell>
                          <TableCell>{item.violation_category || "—"}</TableCell>
                          <TableCell className="text-xs">{item.legal_basis || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {field.field_name === "seizures" && items.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                         <TableHead>نوع البضاعة</TableHead>
                         <TableHead className="text-end">الكمية</TableHead>
                         <TableHead>الوحدة</TableHead>
                         <TableHead className="text-end">القيمة</TableHead>
                         <TableHead>نوع الحجز</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{item.goods_type || item.goods_category || "—"}</TableCell>
                          <TableCell className="text-end font-mono-data">{item.quantity || "—"}</TableCell>
                          <TableCell>{item.unit || "—"}</TableCell>
                          <TableCell className="text-end font-mono-data">{item.estimated_value?.toLocaleString() || "—"}</TableCell>
                          <TableCell className="text-xs">{item.seizure_type || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {items.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    لم يتم اكتشاف أي عنصر
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PdfImportPage;
