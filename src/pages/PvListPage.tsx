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
  FilePlus, Search, Download, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
} from "lucide-react";
import { exportPvToExcel } from "@/lib/excel-export";

type CaseStatus = "draft" | "under_review" | "validated" | "archived";
const PAGE_SIZE = 50;

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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
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
    queryKey: ["pv-list", page, statusFilter, search, user?.id, profile?.department_id, roles],
    queryFn: async () => {
      let query = supabase
        .from("pv")
        .select(`
          id, internal_reference, pv_number, pv_date, case_status, pv_type, parent_pv_id,
          total_actual_seizure, total_virtual_seizure, total_precautionary_seizure, total_seizure,
          customs_violation, currency_violation, public_law_violation, seizure_renewal,
          source_import_type, notes, created_at,
          departments (id, name_fr, name_ar, code),
          officers (id, full_name, badge_number, rank_label)
        `, { count: "exact" })
        .order("pv_number", { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      // Role-based visibility filtering
      if (isAdmin || isNationalSupervisor) {
        // Admin and national supervisor see all PVs
      } else if (isDeptSupervisor || isViewer) {
        // Department supervisor and viewer see PVs in their department
        if (profile?.department_id) {
          query = query.eq("department_id", profile.department_id);
        }
      } else if (isOfficer) {
        // Officer sees only PVs they created
        if (user?.id) {
          query = query.eq("created_by", user.id);
        }
      }

      if (statusFilter !== "all") query = query.eq("case_status", statusFilter);
      if (search) query = query.or(`pv_number.ilike.%${search}%,internal_reference.ilike.%${search}%`);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
  });

  const pvIds = pvData?.data?.map(p => p.id) || [];

  const { data: violationsByPv } = useQuery({
    queryKey: ["violation-labels", pvIds],
    enabled: pvIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("violations")
        .select("pv_id, violation_label")
        .in("pv_id", pvIds);
      const map: Record<string, string[]> = {};
      data?.forEach(v => {
        if (!map[v.pv_id]) map[v.pv_id] = [];
        if (!map[v.pv_id].includes(v.violation_label)) map[v.pv_id].push(v.violation_label);
      });
      return map;
    },
  });

  const totalPages = Math.ceil((pvData?.count || 0) / PAGE_SIZE);

  // Group PVs: parent PVs first, children under them
  const groupedPvs = (() => {
    if (!pvData?.data) return [];
    const all = pvData.data as any[];
    // Find parent PVs (no parent_pv_id) and child PVs
    const parents = all.filter(p => !p.parent_pv_id);
    const childrenMap: Record<string, any[]> = {};
    all.filter(p => p.parent_pv_id).forEach(p => {
      if (!childrenMap[p.parent_pv_id]) childrenMap[p.parent_pv_id] = [];
      childrenMap[p.parent_pv_id].push(p);
    });
    // Also handle orphan children (parent not on this page)
    const orphanChildren = all.filter(p => p.parent_pv_id && !parents.find(pp => pp.id === p.parent_pv_id));
    
    const result: { pv: any; isChild: boolean; childCount: number }[] = [];
    parents.forEach(p => {
      const children = childrenMap[p.id] || [];
      result.push({ pv: p, isChild: false, childCount: children.length });
      if (expandedGroups.has(p.id)) {
        children.forEach(c => result.push({ pv: c, isChild: true, childCount: 0 }));
      }
    });
    // Add orphans at the end
    orphanChildren.forEach(c => result.push({ pv: c, isChild: true, childCount: 0 }));
    return result;
  })();

  const toggleGroup = (parentId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId); else next.add(parentId);
      return next;
    });
  };

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
    <div className="p-6 space-y-4 page-enter">
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
            <Button size="sm" className="bg-gradient-to-l from-primary to-primary-glow hover:shadow-lg hover:shadow-primary/20 transition-all duration-300">
              <FilePlus className="h-4 w-4" />
              محضر جديد
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 surface-glass p-3">
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
      <div className="surface-glass overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allOnPageSelected}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>القسم</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>عدد المحضر</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead>الضابط</TableHead>
              <TableHead className="min-w-[200px]">المخالفات</TableHead>
              <TableHead className="text-end">حجز فعلي</TableHead>
              <TableHead className="text-end">حجز صوري</TableHead>
              <TableHead className="text-end">حجز تحفظي</TableHead>
              <TableHead className="text-end">المجموع</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="w-[100px]">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                  جاري التحميل...
                </TableCell>
              </TableRow>
            ) : (pvData?.data?.length || 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                  لا توجد سجلات
                </TableCell>
              </TableRow>
            ) : groupedPvs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={14} className="text-center text-muted-foreground py-8">
                  لا توجد سجلات
                </TableCell>
              </TableRow>
            ) : (
              groupedPvs.map(({ pv, isChild, childCount }) => (
                <TableRow key={pv.id} className={`${selectedIds.has(pv.id) ? "bg-muted/50" : ""} ${isChild ? "bg-muted/20" : ""}`}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(pv.id)}
                      onCheckedChange={() => toggleSelect(pv.id)}
                    />
                  </TableCell>
                  <TableCell className="text-xs">
                    {isChild && <span className="text-muted-foreground me-1">↳</span>}
                    {(pv as any).departments?.name_ar || (pv as any).departments?.name_fr || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {!isChild && childCount > 0 && (
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => toggleGroup(pv.id)}>
                          {expandedGroups.has(pv.id) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>
                      )}
                      <span className={`text-xs px-1.5 py-0.5 rounded ${pv.pv_type === "ضلع" ? "bg-accent/10 text-accent-foreground" : "bg-primary/10 text-primary"}`}>
                        {pv.pv_type || "محضر"}
                      </span>
                      {!isChild && childCount > 0 && (
                        <span className="text-[10px] text-muted-foreground">({childCount})</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{pv.pv_number}</TableCell>
                  <TableCell className="text-sm">{pv.pv_date}</TableCell>
                  <TableCell className="text-xs max-w-[100px] truncate">{pv.officers?.full_name || '—'}</TableCell>
                  <TableCell className="text-xs max-w-[220px]">
                    {violationsByPv?.[pv.id]?.length ? (
                      <div className="space-y-0.5">
                        {violationsByPv[pv.id].map((label, i) => (
                          <span key={i} className="inline-block bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[11px] me-1 mb-0.5">{label}</span>
                        ))}
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-end font-mono text-sm">{formatCurrency(pv.total_actual_seizure || 0)}</TableCell>
                  <TableCell className="text-end font-mono text-sm">{formatCurrency(pv.total_virtual_seizure || 0)}</TableCell>
                  <TableCell className="text-end font-mono text-sm">{formatCurrency(pv.total_precautionary_seizure || 0)}</TableCell>
                  <TableCell className="text-end font-mono text-sm font-semibold">{formatCurrency(pv.total_seizure || 0)}</TableCell>
                  <TableCell><StatusBadge status={pv.case_status as CaseStatus} /></TableCell>
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