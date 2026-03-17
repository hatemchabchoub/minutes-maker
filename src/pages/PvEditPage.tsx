import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Plus, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import ParentPvSelector from "@/components/pv/ParentPvSelector";

interface OffenderRow {
  id?: string;
  name_or_company: string;
  identifier: string;
  person_type: string;
  city: string;
  address: string;
  _deleted?: boolean;
}

interface ViolationRow {
  id?: string;
  violation_label: string;
  violation_category: string;
  legal_basis: string;
  severity_level: string;
  _deleted?: boolean;
}

interface SeizureRow {
  id?: string;
  goods_category: string;
  goods_type: string;
  quantity: string;
  unit: string;
  estimated_value: string;
  seizure_type: string;
  _deleted?: boolean;
}

const PvEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  // General fields
  const [pvNumber, setPvNumber] = useState("");
  const [pvDate, setPvDate] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [officerId, setOfficerId] = useState("");
  const [referralType, setReferralType] = useState("");
  const [referralSourceId, setReferralSourceId] = useState("");
  const [pvType, setPvType] = useState("");
  const [parentPvId, setParentPvId] = useState("");
  const [notes, setNotes] = useState("");
  const [customsViolation, setCustomsViolation] = useState(false);
  const [currencyViolation, setCurrencyViolation] = useState(false);
  const [publicLawViolation, setPublicLawViolation] = useState(false);
  const [seizureRenewal, setSeizureRenewal] = useState(false);

  // Sub-records
  const [offenders, setOffenders] = useState<OffenderRow[]>([]);
  const [violations, setViolations] = useState<ViolationRow[]>([]);
  const [seizures, setSeizures] = useState<SeizureRow[]>([]);

  // Lookups
  const { data: departments } = useQuery({
    queryKey: ["ref-departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name_fr, name_ar, code").eq("active", true).order("name_fr");
      return data || [];
    },
  });
  const { data: officers } = useQuery({
    queryKey: ["ref-officers-all"],
    queryFn: async () => {
      const { data } = await supabase.from("officers").select("id, full_name, badge_number, rank_label").eq("active", true).order("full_name");
      return data || [];
    },
  });
  const { data: referralSources } = useQuery({
    queryKey: ["ref-referral-sources"],
    queryFn: async () => {
      const { data } = await supabase.from("referral_sources").select("id, label_fr, label_ar").eq("active", true);
      return data || [];
    },
  });

  // Load PV data
  const { data: pv, isLoading } = useQuery({
    queryKey: ["pv-edit", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("pv").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: existingOffenders } = useQuery({
    queryKey: ["pv-offenders-edit", id],
    queryFn: async () => {
      const { data } = await supabase.from("offenders").select("*").eq("pv_id", id!).order("display_order");
      return data || [];
    },
    enabled: !!id,
  });

  const { data: existingViolations } = useQuery({
    queryKey: ["pv-violations-edit", id],
    queryFn: async () => {
      const { data } = await supabase.from("violations").select("*").eq("pv_id", id!).order("display_order");
      return data || [];
    },
    enabled: !!id,
  });

  const { data: existingSeizures } = useQuery({
    queryKey: ["pv-seizures-edit", id],
    queryFn: async () => {
      const { data } = await supabase.from("seizures").select("*").eq("pv_id", id!).order("display_order");
      return data || [];
    },
    enabled: !!id,
  });

  // Populate form
  useEffect(() => {
    if (pv) {
      setPvNumber(pv.pv_number || "");
      setPvDate(pv.pv_date || "");
      setDepartmentId(pv.department_id || "");
      setOfficerId(pv.officer_id || "");
      setReferralType(pv.referral_type || "");
      setReferralSourceId(pv.referral_source_id || "");
      setPvType(pv.pv_type || "");
      setNotes(pv.notes || "");
      setCustomsViolation(pv.customs_violation || false);
      setCurrencyViolation(pv.currency_violation || false);
      setPublicLawViolation(pv.public_law_violation || false);
      setSeizureRenewal(pv.seizure_renewal || false);
    }
  }, [pv]);

  useEffect(() => {
    if (existingOffenders) {
      setOffenders(existingOffenders.map(o => ({
        id: o.id, name_or_company: o.name_or_company, identifier: o.identifier || "",
        person_type: o.person_type || "physical", city: o.city || "", address: o.address || "",
      })));
    }
  }, [existingOffenders]);

  useEffect(() => {
    if (existingViolations) {
      setViolations(existingViolations.map(v => ({
        id: v.id, violation_label: v.violation_label, violation_category: v.violation_category || "",
        legal_basis: v.legal_basis || "", severity_level: v.severity_level || "",
      })));
    }
  }, [existingViolations]);

  useEffect(() => {
    if (existingSeizures) {
      setSeizures(existingSeizures.map(s => ({
        id: s.id, goods_category: s.goods_category || "", goods_type: s.goods_type || "",
        quantity: String(s.quantity || 0), unit: s.unit || "",
        estimated_value: String(s.estimated_value || 0), seizure_type: s.seizure_type || "actual",
      })));
    }
  }, [existingSeizures]);

  const updateOffender = (i: number, field: keyof OffenderRow, value: string) => {
    const u = [...offenders]; u[i] = { ...u[i], [field]: value }; setOffenders(u);
  };
  const updateViolation = (i: number, field: keyof ViolationRow, value: string) => {
    const u = [...violations]; u[i] = { ...u[i], [field]: value }; setViolations(u);
  };
  const updateSeizure = (i: number, field: keyof SeizureRow, value: string) => {
    const u = [...seizures]; u[i] = { ...u[i], [field]: value }; setSeizures(u);
  };
  const markDeletedOffender = (i: number) => {
    if (offenders[i].id) {
      const u = [...offenders]; u[i] = { ...u[i], _deleted: true }; setOffenders(u);
    } else {
      setOffenders(offenders.filter((_, idx) => idx !== i));
    }
  };
  const markDeletedViolation = (i: number) => {
    if (violations[i].id) {
      const u = [...violations]; u[i] = { ...u[i], _deleted: true }; setViolations(u);
    } else {
      setViolations(violations.filter((_, idx) => idx !== i));
    }
  };
  const markDeletedSeizure = (i: number) => {
    if (seizures[i].id) {
      const u = [...seizures]; u[i] = { ...u[i], _deleted: true }; setSeizures(u);
    } else {
      setSeizures(seizures.filter((_, idx) => idx !== i));
    }
  };

  const totalActual = seizures.filter(s => !s._deleted && s.seizure_type === "actual").reduce((s, r) => s + (parseFloat(r.estimated_value) || 0), 0);
  const totalVirtual = seizures.filter(s => !s._deleted && s.seizure_type === "virtual").reduce((s, r) => s + (parseFloat(r.estimated_value) || 0), 0);
  const totalPrecautionary = seizures.filter(s => !s._deleted && s.seizure_type === "precautionary").reduce((s, r) => s + (parseFloat(r.estimated_value) || 0), 0);

  const handleSave = async () => {
    if (!user || !id) return;
    setSaving(true);
    try {
      // Update PV
      const { error: pvErr } = await supabase.from("pv").update({
        pv_number: pvNumber,
        pv_date: pvDate,
        department_id: departmentId || null,
        officer_id: officerId || null,
        referral_type: referralType || null,
        referral_source_id: referralSourceId || null,
        pv_type: pvType || null,
        customs_violation: customsViolation,
        currency_violation: currencyViolation,
        public_law_violation: publicLawViolation,
        seizure_renewal: seizureRenewal,
        total_actual_seizure: totalActual,
        total_virtual_seizure: totalVirtual,
        total_precautionary_seizure: totalPrecautionary,
        notes: notes || null,
        updated_by: user.id,
      }).eq("id", id);
      if (pvErr) throw pvErr;

      // Offenders: delete, update, insert
      for (const o of offenders.filter(o => o._deleted && o.id)) {
        await supabase.from("offenders").delete().eq("id", o.id!);
      }
      const activeOffenders = offenders.filter(o => !o._deleted);
      for (let i = 0; i < activeOffenders.length; i++) {
        const o = activeOffenders[i];
        const payload = { name_or_company: o.name_or_company, identifier: o.identifier || null, person_type: o.person_type, city: o.city || null, address: o.address || null, display_order: i + 1 };
        if (o.id) {
          await supabase.from("offenders").update(payload).eq("id", o.id);
        } else if (o.name_or_company.trim()) {
          await supabase.from("offenders").insert({ ...payload, pv_id: id });
        }
      }

      // Violations
      for (const v of violations.filter(v => v._deleted && v.id)) {
        await supabase.from("violations").delete().eq("id", v.id!);
      }
      const activeViolations = violations.filter(v => !v._deleted);
      for (let i = 0; i < activeViolations.length; i++) {
        const v = activeViolations[i];
        const payload = { violation_label: v.violation_label, violation_category: v.violation_category || null, legal_basis: v.legal_basis || null, severity_level: v.severity_level || null, display_order: i + 1 };
        if (v.id) {
          await supabase.from("violations").update(payload).eq("id", v.id);
        } else if (v.violation_label.trim()) {
          await supabase.from("violations").insert({ ...payload, pv_id: id });
        }
      }

      // Seizures
      for (const s of seizures.filter(s => s._deleted && s.id)) {
        await supabase.from("seizures").delete().eq("id", s.id!);
      }
      const activeSeizures = seizures.filter(s => !s._deleted);
      for (let i = 0; i < activeSeizures.length; i++) {
        const s = activeSeizures[i];
        const payload = { goods_category: s.goods_category || null, goods_type: s.goods_type || null, quantity: parseFloat(s.quantity) || 0, unit: s.unit || null, estimated_value: parseFloat(s.estimated_value) || 0, seizure_type: s.seizure_type || "actual", display_order: i + 1 };
        if (s.id) {
          await supabase.from("seizures").update(payload).eq("id", s.id);
        } else if (s.goods_type.trim() || parseFloat(s.estimated_value) > 0) {
          await supabase.from("seizures").insert({ ...payload, pv_id: id });
        }
      }

      // Audit log is now handled by server-side trigger

      queryClient.invalidateQueries({ queryKey: ["pv-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["pv-list"] });
      toast.success("تم تحديث المحضر بنجاح");
      navigate(`/pv/${id}`);
    } catch (err: any) {
      toast.error("خطأ: " + (err.message || "خطأ غير معروف"));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-muted-foreground">جاري التحميل...</div>;
  }

  const formatCurrency = (v: number) => new Intl.NumberFormat("fr-TN", { minimumFractionDigits: 3 }).format(v);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to={`/pv/${id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold">تعديل المحضر</h1>
          <p className="text-sm text-muted-foreground font-mono-data">{pv?.internal_reference}</p>
        </div>
      </div>

      {/* General Info */}
      <div className="surface-elevated p-6 space-y-4">
        <h2 className="text-sm font-medium">المعلومات العامة</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>عدد المحضر</Label>
            <Input value={pvNumber} onChange={(e) => setPvNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>تاريخ المحضر</Label>
            <Input type="date" value={pvDate} onChange={(e) => setPvDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>القسم</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger><SelectValue placeholder="اختيار" /></SelectTrigger>
              <SelectContent>
                {departments?.map(d => <SelectItem key={d.id} value={d.id}>{d.name_ar || d.name_fr}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>الضابط</Label>
            <Select value={officerId} onValueChange={setOfficerId}>
              <SelectTrigger><SelectValue placeholder="اختيار" /></SelectTrigger>
              <SelectContent>
                {officers?.map(o => <SelectItem key={o.id} value={o.id}>{o.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>طبيعة الإحالة</Label>
            <Select value={referralType} onValueChange={setReferralType}>
              <SelectTrigger><SelectValue placeholder="اختيار" /></SelectTrigger>
               <SelectContent>
                 <SelectItem value="internal">هياكل داخلية</SelectItem>
                 <SelectItem value="external">هياكل خارجية</SelectItem>
                 <SelectItem value="flagrante">مباشرة</SelectItem>
               </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>المصدر</Label>
            <Select value={referralSourceId} onValueChange={setReferralSourceId}>
              <SelectTrigger><SelectValue placeholder="اختيار" /></SelectTrigger>
              <SelectContent>
                {referralSources?.map(r => <SelectItem key={r.id} value={r.id}>{r.label_ar || r.label_fr}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>نوع الوثيقة</Label>
            <Select value={pvType} onValueChange={setPvType}>
              <SelectTrigger><SelectValue placeholder="اختيار" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="محضر">محضر</SelectItem>
                <SelectItem value="ضلع">ضلع</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={customsViolation} onCheckedChange={(v) => setCustomsViolation(!!v)} />مخالفة ديوانية</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={currencyViolation} onCheckedChange={(v) => setCurrencyViolation(!!v)} />مخالفة صرفية</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={publicLawViolation} onCheckedChange={(v) => setPublicLawViolation(!!v)} />حق عام</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={seizureRenewal} onCheckedChange={(v) => setSeizureRenewal(!!v)} />تجديد حجز</label>
        </div>
        <div className="space-y-2">
          <Label>ملاحظات</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
      </div>

      {/* Offenders */}
      <div className="surface-elevated p-6 space-y-4">
        <h2 className="text-sm font-medium">المخالفون</h2>
        {offenders.filter(o => !o._deleted).map((o, i) => {
          const realIndex = offenders.indexOf(o);
          return (
            <div key={realIndex} className="border border-border rounded-sm p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">#{i + 1}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => markDeletedOffender(realIndex)}><Trash2 className="h-3 w-3" /></Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input value={o.name_or_company} onChange={(e) => updateOffender(realIndex, "name_or_company", e.target.value)} placeholder="الإسم / الشركة" />
                <Input value={o.identifier} onChange={(e) => updateOffender(realIndex, "identifier", e.target.value)} placeholder="المعرف" />
                <Select value={o.person_type} onValueChange={(v) => updateOffender(realIndex, "person_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical">شخص طبيعي</SelectItem>
                    <SelectItem value="legal">شخص معنوي</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={o.city} onChange={(e) => updateOffender(realIndex, "city", e.target.value)} placeholder="المدينة" />
              </div>
            </div>
          );
        })}
        <Button variant="outline" size="sm" onClick={() => setOffenders([...offenders, { name_or_company: "", identifier: "", person_type: "physical", city: "", address: "" }])}>
          <Plus className="h-4 w-4" />إضافة
        </Button>
      </div>

      {/* Violations */}
      <div className="surface-elevated p-6 space-y-4">
        <h2 className="text-sm font-medium">المخالفات</h2>
        {violations.filter(v => !v._deleted).map((v, i) => {
          const realIndex = violations.indexOf(v);
          return (
            <div key={realIndex} className="border border-border rounded-sm p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">#{i + 1}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => markDeletedViolation(realIndex)}><Trash2 className="h-3 w-3" /></Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input value={v.violation_label} onChange={(e) => updateViolation(realIndex, "violation_label", e.target.value)} placeholder="وصف المخالفة" />
                <Select value={v.violation_category} onValueChange={(val) => updateViolation(realIndex, "violation_category", val)}>
                  <SelectTrigger><SelectValue placeholder="الصنف" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Douane">ديوانية</SelectItem>
                    <SelectItem value="Change">صرفية</SelectItem>
                    <SelectItem value="Droit commun">حق عام</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={v.legal_basis} onChange={(e) => updateViolation(realIndex, "legal_basis", e.target.value)} placeholder="الأساس القانوني" />
                <Select value={v.severity_level} onValueChange={(val) => updateViolation(realIndex, "severity_level", val)}>
                  <SelectTrigger><SelectValue placeholder="الخطورة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mineur">بسيط</SelectItem>
                    <SelectItem value="Moyen">متوسط</SelectItem>
                    <SelectItem value="Grave">خطير</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}
        <Button variant="outline" size="sm" onClick={() => setViolations([...violations, { violation_label: "", violation_category: "", legal_basis: "", severity_level: "" }])}>
          <Plus className="h-4 w-4" />إضافة
        </Button>
      </div>

      {/* Seizures */}
      <div className="surface-elevated p-6 space-y-4">
        <h2 className="text-sm font-medium">المحجوزات</h2>
        {seizures.filter(s => !s._deleted).map((s, i) => {
          const realIndex = seizures.indexOf(s);
          return (
            <div key={realIndex} className="border border-border rounded-sm p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">#{i + 1}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => markDeletedSeizure(realIndex)}><Trash2 className="h-3 w-3" /></Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input value={s.goods_category} onChange={(e) => updateSeizure(realIndex, "goods_category", e.target.value)} placeholder="الصنف" />
                <Input value={s.goods_type} onChange={(e) => updateSeizure(realIndex, "goods_type", e.target.value)} placeholder="النوع" />
                <Select value={s.seizure_type} onValueChange={(v) => updateSeizure(realIndex, "seizure_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actual">فعلي</SelectItem>
                    <SelectItem value="virtual">صوري</SelectItem>
                    <SelectItem value="precautionary">تحفظي</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" value={s.quantity} onChange={(e) => updateSeizure(realIndex, "quantity", e.target.value)} placeholder="الكمية" />
                <Input value={s.unit} onChange={(e) => updateSeizure(realIndex, "unit", e.target.value)} placeholder="الوحدة" />
                <Input type="number" step="0.001" value={s.estimated_value} onChange={(e) => updateSeizure(realIndex, "estimated_value", e.target.value)} placeholder="القيمة" />
              </div>
            </div>
          );
        })}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => setSeizures([...seizures, { goods_category: "", goods_type: "", quantity: "", unit: "", estimated_value: "", seizure_type: "actual" }])}>
            <Plus className="h-4 w-4" />إضافة
          </Button>
          <span className="text-sm font-medium">المجموع: <span className="font-mono-data">{formatCurrency(totalActual + totalVirtual + totalPrecautionary)}</span></span>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t">
        <Link to={`/pv/${id}`}>
          <Button variant="outline">إلغاء</Button>
        </Link>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
        </Button>
      </div>
    </div>
  );
};

export default PvEditPage;
