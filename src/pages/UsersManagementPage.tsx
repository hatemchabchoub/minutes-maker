import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Pencil, Search, UserCog, ShieldCheck } from "lucide-react";

type AppRole = "admin" | "national_supervisor" | "department_supervisor" | "officer" | "viewer";

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "مدير",
  national_supervisor: "مشرف وطني",
  department_supervisor: "مشرف قسم",
  officer: "ضابط",
  viewer: "مطالع",
};

interface FonctionRow {
  id: string;
  label_ar: string;
  label_fr: string | null;
  mapped_role: string | null;
  active: boolean | null;
}

interface UserRow {
  id: string;
  auth_user_id: string;
  full_name: string | null;
  email: string | null;
  department_id: string | null;
  unit_id: string | null;
  active: boolean | null;
  roles: AppRole[];
  department_name?: string;
}

export default function UsersManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [selectedFonction, setSelectedFonction] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [userActive, setUserActive] = useState(true);

  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name_fr, name_ar, code")
        .eq("active", true)
        .order("name_fr");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all users with roles
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("*, departments(name_fr, name_ar)")
        .order("full_name");
      if (pErr) throw pErr;

      const { data: allRoles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rErr) throw rErr;

      const roleMap = new Map<string, AppRole[]>();
      allRoles?.forEach((r: any) => {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role);
        roleMap.set(r.user_id, existing);
      });

      return (profiles || []).map((p: any) => ({
        id: p.id,
        auth_user_id: p.auth_user_id,
        full_name: p.full_name,
        email: p.email,
        department_id: p.department_id,
        unit_id: p.unit_id,
        active: p.active,
        roles: roleMap.get(p.auth_user_id) || [],
        department_name: p.departments?.name_ar || p.departments?.name_fr || null,
      })) as UserRow[];
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async ({
      user,
      roles,
      departmentId,
      active,
    }: {
      user: UserRow;
      roles: AppRole[];
      departmentId: string | null;
      active: boolean;
    }) => {
      // Update profile
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({
          department_id: departmentId || null,
          active,
        })
        .eq("id", user.id);
      if (profileErr) throw profileErr;

      // Sync roles: delete all then re-insert
      const { error: delErr } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user.auth_user_id);
      if (delErr) throw delErr;

      if (roles.length > 0) {
        const { error: insErr } = await supabase
          .from("user_roles")
          .insert(roles.map((role) => ({ user_id: user.auth_user_id, role })));
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      toast.success("تم تحديث المستخدم بنجاح");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditUser(null);
    },
    onError: (err: any) => {
      toast.error("خطأ: " + (err.message || "خطأ غير معروف"));
    },
  });

  const openEdit = (user: UserRow) => {
    setEditUser(user);
    setSelectedRoles([...user.roles]);
    setSelectedDept(user.department_id || "");
    setUserActive(user.active !== false);
  };

  const handleSave = () => {
    if (!editUser) return;
    saveMutation.mutate({
      user: editUser,
      roles: selectedRoles,
      departmentId: selectedDept === "none" ? null : selectedDept || null,
      active: userActive,
    });
  };

  const toggleRole = (role: AppRole) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const filtered = (users || []).filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.department_name?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            إدارة المستخدمين
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            عرض وتعديل الأدوار والأقسام لجميع المستخدمين
          </p>
        </div>
        <div className="relative">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو البريد..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pe-9 w-64"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="surface-elevated p-8 text-center text-sm text-muted-foreground">
          جاري التحميل...
        </div>
      ) : (
        <div className="surface-elevated rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>البريد الإلكتروني</TableHead>
                <TableHead>القسم</TableHead>
                <TableHead>الأدوار</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="w-[80px]">إجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    لا يوجد مستخدمون
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
                    <TableCell className="text-xs font-mono-data">{user.email || "—"}</TableCell>
                    <TableCell>{user.department_name || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length === 0 ? (
                          <span className="text-xs text-muted-foreground">بدون دور</span>
                        ) : (
                          user.roles.map((role) => (
                            <Badge
                              key={role}
                              variant={role === "admin" ? "default" : "secondary"}
                              className="text-[10px]"
                            >
                              {ROLE_LABELS[role]}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.active !== false ? "default" : "destructive"} className="text-[10px]">
                        {user.active !== false ? "نشط" : "معطل"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              تعديل المستخدم
            </DialogTitle>
          </DialogHeader>

          {editUser && (
            <div className="space-y-5 py-2">
              {/* User info */}
              <div className="space-y-1 p-3 bg-muted/50 rounded-md">
                <p className="text-sm font-medium">{editUser.full_name || "—"}</p>
                <p className="text-xs text-muted-foreground">{editUser.email}</p>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between">
                <Label>الحساب نشط</Label>
                <Switch checked={userActive} onCheckedChange={setUserActive} />
              </div>

              {/* Department */}
              <div className="space-y-2">
                <Label>القسم</Label>
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختيار القسم" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— بدون قسم —</SelectItem>
                    {departments?.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name_ar || d.name_fr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Roles */}
              <div className="space-y-3">
                <Label>الأدوار</Label>
                <div className="space-y-2">
                  {ALL_ROLES.map((role) => (
                    <label
                      key={role}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedRoles.includes(role)}
                        onCheckedChange={() => toggleRole(role)}
                      />
                      <div>
                        <span className="text-sm font-medium">{ROLE_LABELS[role]}</span>
                        <span className="text-xs text-muted-foreground me-2">({role})</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              إلغاء
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
