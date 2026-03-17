import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/StatusBadge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  FilePlus, Search, Download, Eye, Pencil, Trash2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { exportPvToExcel } from "@/lib/excel-export";

type CaseStatus = "draft" | "under_review" | "validated" | "archived";
const PAGE_SIZE = 25;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("fr-TN", { minimumFractionDigits: 3 }).format(value);

const PvListPage = () => {
  const { user, profile, roles, isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();

  const isNationalSupervisor = roles.includes("national_supervisor");
  const isDeptSupervisor = roles.includes("department_supervisor");
  const isOfficer = roles.includes("officer");
  const isViewer = roles.includes("viewer");

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await exportPvToExcel({ statusFilter, search });
      toast.success("تم تصدير الملف بنجاح");
    } catch (err: any) {
      toast.error(err.message || "خطأ في التصدير");
    } finally {
      setExporting(false);
    }
  }, [statusFilter, search]);

  const { data: pvData, isLoading } = useQuery({
    queryKey: ["pv-list", page, statusFilter, search],
    queryFn: async () => {
      let query = supabase
        .from("pv")
        .select(`
          id, internal_reference, pv_number, pv_date, case_status, pv_type,
          total_actual_seizure, total_virtual_seizure, total_precautionary_seizure, total_seizure,
          customs_violation, currency_violation, public_law_violation, seizure_renewal,
          source_import_type, notes, created_at,
          departments (id, name_fr, name_ar, code),
          officers (id, full_name, badge_number, rank_label)
        `, { count: "exact" })
        .order("pv_date", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter !== "all") query = query.eq("case_status", statusFilter);
      if (search) query = query.or(`pv_number.ilike.%${search}%,internal_reference.ilike.%${search}%`);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
  });

  const pvIds = pvData?.data?.map(p => p.id) || [];

  const { data: violationCounts } = useQuery({
    queryKey: ["violation-counts", pvIds],
    enabled: pvIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("violations").select("pv_id").in("pv_id", pvIds);
      const counts: Record<string, number> = {};
      data?.forEach(v => { counts[v.pv_id] = (counts[v.pv_id] || 0) + 1; });
      return counts;
    },
  });

  const totalPages = Math.ceil((pvData?.count || 0) / PAGE_SIZE);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!pvData?.data) return;
    const allOnPage = pvData.data.map((p: any) => p.id);
    const allSelected = allOnPage.every((id: string) => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      allOnPage.forEach((id: string) => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase.from("pv").delete().in("id", ids);
      if (error) throw error;
      toast.success(`تم حذف ${ids.length} محضر بنجاح`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["pv-list"] });
    } catch (err: any) {
      toast.error(err.message || "خطأ في الحذف");
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const allOnPageSelected = pvData?.data && pvData.data.length > 0 &&
    pvData.data.every((p: any) => selectedIds.has(p.id));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">محاضر التحقيق</h1>
          <p className="text-sm text-muted-foreground">
            {pvData?.count || 0} سجل
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="h-4 w-4" />
              حذف ({selectedIds.size})
            </Button>
          )}
          <Link to="/pv/new">
            <Button size="sm">
              <FilePlus className="h-4 w-4" />
              محضر جديد
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 surface-elevated p-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بعدد المحضر أو المرجع..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="ps-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="draft">مسودة</SelectItem>
            <SelectItem value="under_review">قيد المراجعة</SelectItem>
            <SelectItem value="validated">مصادق عليه</SelectItem>
            <SelectItem value="archived">مؤرشف</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          <Download className="h-4 w-4" />
          {exporting ? "جاري التصدير..." : "تصدير"}
        </Button>
      </div>

      {/* Table */}
      <div className="surface-elevated">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allOnPageSelected}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>المرجع الداخلي</TableHead>
              <TableHead>عدد المحضر</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead>القسم</TableHead>
              <TableHead>الضابط</TableHead>
              <TableHead className="text-center">المخالفات</TableHead>
              <TableHead className="text-end">المحجوز الكلي</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>المصدر</TableHead>
              <TableHead className="w-[100px]">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  جاري التحميل...
                </TableCell>
              </TableRow>
            ) : (pvData?.data?.length || 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                  لا توجد سجلات
                </TableCell>
              </TableRow>
            ) : (
              pvData?.data?.map((pv: any) => (
                <TableRow key={pv.id} className={selectedIds.has(pv.id) ? "bg-muted/50" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(pv.id)}
                      onCheckedChange={() => toggleSelect(pv.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs font-medium">{pv.internal_reference}</TableCell>
                  <TableCell className="font-mono text-sm">{pv.pv_number}</TableCell>
                  <TableCell className="text-sm">{pv.pv_date}</TableCell>
                  <TableCell className="text-xs max-w-[120px] truncate">{pv.departments?.name_ar || '—'}</TableCell>
                  <TableCell className="text-xs max-w-[100px] truncate">{pv.officers?.full_name || '—'}</TableCell>
                  <TableCell className="text-center text-sm">{violationCounts?.[pv.id] || 0}</TableCell>
                  <TableCell className="text-end font-mono text-sm">{formatCurrency(pv.total_seizure || 0)}</TableCell>
                  <TableCell><StatusBadge status={pv.case_status as CaseStatus} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{pv.source_import_type || 'يدوي'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link to={`/pv/${pv.id}`}><Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button></Link>
                      <Link to={`/pv/${pv.id}/edit`}><Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button></Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between px-4 py-3 border-t">
          <p className="text-xs text-muted-foreground">
            الصفحة {page + 1} من {Math.max(totalPages, 1)}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف {selectedIds.size} محضر؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "جاري الحذف..." : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PvListPage;