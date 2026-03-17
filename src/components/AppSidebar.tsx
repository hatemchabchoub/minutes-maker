import {
  LayoutDashboard,
  FileText,
  FilePlus,
  Upload,
  FileSpreadsheet,
  BarChart3,
  Users,
  Shield,
  AlertTriangle,
  LogOut,
  Database,
  User,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

type AppRole = "admin" | "national_supervisor" | "department_supervisor" | "officer" | "viewer";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: AppRole[];
}

const mainItems: NavItem[] = [
  { title: "لوحة القيادة", url: "/", icon: LayoutDashboard },
  { title: "المحاضر", url: "/pv", icon: FileText },
  { title: "محضر جديد", url: "/pv/new", icon: FilePlus, roles: ["admin", "officer", "department_supervisor"] },
];

const importItems: NavItem[] = [
  { title: "استيراد PDF / OCR", url: "/import/pdf", icon: Upload, roles: ["admin", "officer", "department_supervisor"] },
  { title: "استيراد Excel", url: "/import/excel", icon: FileSpreadsheet, roles: ["admin", "officer", "department_supervisor"] },
];

const analysisItems: NavItem[] = [
  { title: "التقارير", url: "/reports", icon: BarChart3, roles: ["admin", "national_supervisor", "department_supervisor"] },
  { title: "الشذوذ", url: "/anomalies", icon: AlertTriangle, roles: ["admin", "national_supervisor", "department_supervisor"] },
];

const adminItems: NavItem[] = [
  { title: "المرجعيات", url: "/references", icon: Database, roles: ["admin"] },
  { title: "المستخدمون", url: "/users", icon: Users, roles: ["admin"] },
  { title: "سجل المراجعة", url: "/audit", icon: Shield, roles: ["admin", "national_supervisor"] },
];

export function AppSidebar() {
  const { signOut, profile, roles, user } = useAuth();

  const filterByRole = (items: NavItem[]) =>
    items.filter((item) => !item.roles || item.roles.some((r) => roles.includes(r)));

  const renderGroup = (label: string, items: NavItem[]) => {
    const filtered = filterByRole(items);
    if (filtered.length === 0) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest px-3">
          {label}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {filtered.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild>
                  <NavLink
                    to={item.url}
                    end={item.url === "/"}
                    className="hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors rounded-lg mx-1"
                    activeClassName="bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-md shadow-sidebar-primary/20"
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.title}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  const roleLabels: Record<string, string> = {
    admin: "مدير",
    national_supervisor: "مشرف وطني",
    department_supervisor: "مشرف قسم",
    officer: "ضابط",
    viewer: "مطالع",
  };

  return (
    <Sidebar side="left" collapsible="none">
      <SidebarContent>
        {/* Logo */}
        <div className="p-4 pb-6">
          <div className="flex items-center gap-3">
            <img src="/logo-douane.png" alt="شعار الديوانة التونسية" className="w-20 h-20 rounded-xl object-contain" />
            <div>
              <span className="font-bold text-base text-sidebar-foreground tracking-tight leading-tight">إدارة الأبحاث</span>
              <span className="text-xs block text-sidebar-foreground/40">الديوانة التونسية</span>
            </div>
          </div>
        </div>

        {renderGroup("العمليات", mainItems)}
        {renderGroup("الاستيراد", importItems)}
        {renderGroup("التحليل", analysisItems)}
        {renderGroup("الإدارة", adminItems)}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="px-3 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center">
                  <User className="h-4 w-4 text-sidebar-foreground/60" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-sidebar-foreground truncate">
                    {profile?.full_name || user?.email || "مستخدم"}
                  </p>
                  <p className="text-[10px] text-sidebar-foreground/40">
                    {roleLabels[roles[0]] || roles[0] || "ضابط"}
                  </p>
                </div>
              </div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => signOut()}
              className="text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent mx-1 rounded-lg"
            >
              <LogOut className="h-4 w-4" />
              <span>تسجيل الخروج</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
