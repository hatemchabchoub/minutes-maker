import { useEffect, useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, UserCheck, AlertTriangle, Package, PhoneForwarded } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ReferenceTable, type ColumnDef } from "@/components/references/ReferenceTable";

function useReferenceData(table: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);

    let rows: any[] | null = null;
    const orderedQuery = await supabase.from(table as any).select("*").order("created_at", { ascending: false });

    if (orderedQuery.error) {
      const fallbackQuery = await supabase.from(table as any).select("*");
      rows = fallbackQuery.data || [];
    } else {
      rows = orderedQuery.data || [];
    }

    setData(rows);
    setLoading(false);
  }, [table]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (item: Record<string, any>) => {
    const { error } = await supabase.from(table as any).insert(item);
    if (error) throw error;
    await fetch();
  };

  const update = async (id: string, item: Record<string, any>) => {
    const { error } = await supabase.from(table as any).update(item).eq("id", id);
    if (error) throw error;
    await fetch();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from(table as any).delete().eq("id", id);
    if (error) throw error;
    await fetch();
  };

  return { data, loading, add, update, remove };
}

const departmentColumns: ColumnDef[] = [
  { key: "code", label: "الرمز", required: true },
  { key: "name_fr", label: "الاسم (فرنسي)", required: true },
  { key: "name_ar", label: "الاسم (عربي)" },
  { key: "region", label: "الجهة" },
  { key: "active", label: "الحالة", type: "boolean" },
];


const officerColumns: ColumnDef[] = [
  { key: "full_name", label: "الاسم الكامل", required: true },
  { key: "badge_number", label: "رقم الشارة" },
  { key: "rank_label", label: "الرتبة" },
  { key: "department_id", label: "القسم", type: "select", hidden: true },
  
  { key: "active", label: "الحالة", type: "boolean" },
];

const violationColumns: ColumnDef[] = [
  { key: "code", label: "الرمز" },
  { key: "label_fr", label: "التسمية (فرنسي)", required: true },
  { key: "label_ar", label: "التسمية (عربي)" },
  { key: "category", label: "الفئة", type: "select", options: [
    { value: "customs", label: "جمركية" },
    { value: "currency", label: "صرف" },
    { value: "public_law", label: "قانون عام" },
  ]},
  { key: "legal_basis", label: "الأساس القانوني" },
  { key: "active", label: "الحالة", type: "boolean" },
];

const goodsColumns: ColumnDef[] = [
  { key: "category_fr", label: "الفئة (فرنسي)", required: true },
  { key: "category_ar", label: "الفئة (عربي)" },
  { key: "type_fr", label: "النوع (فرنسي)" },
  { key: "type_ar", label: "النوع (عربي)" },
  { key: "active", label: "الحالة", type: "boolean" },
];

const referralColumns: ColumnDef[] = [
  { key: "label_fr", label: "التسمية (فرنسي)", required: true },
  { key: "label_ar", label: "التسمية (عربي)" },
  { key: "active", label: "الحالة", type: "boolean" },
];

export default function ReferencesPage() {
  const departments = useReferenceData("departments");
  const officers = useReferenceData("officers");
  const violations = useReferenceData("violation_reference");
  const goods = useReferenceData("goods_reference");
  const referrals = useReferenceData("referral_sources");

  // Populate department select options for officers
  const deptOptions = departments.data.map((d) => ({ value: d.id, label: d.name_ar || d.name_fr }));

  const officerColumnsWithRefs = officerColumns.map((c) => {
    if (c.key === "department_id") return { ...c, options: deptOptions, hidden: false };
    return c;
  });

  const tabs = [
    { id: "departments", label: "الأقسام", icon: Building2, content: <ReferenceTable {...departments} columns={departmentColumns} onAdd={departments.add} onUpdate={departments.update} onDelete={departments.remove} /> },
    { id: "officers", label: "الضباط", icon: UserCheck, content: <ReferenceTable {...officers} columns={officerColumnsWithRefs} onAdd={officers.add} onUpdate={officers.update} onDelete={officers.remove} /> },
    { id: "violations", label: "المخالفات", icon: AlertTriangle, content: <ReferenceTable {...violations} columns={violationColumns} onAdd={violations.add} onUpdate={violations.update} onDelete={violations.remove} /> },
    { id: "goods", label: "البضائع", icon: Package, content: <ReferenceTable {...goods} columns={goodsColumns} onAdd={goods.add} onUpdate={goods.update} onDelete={goods.remove} /> },
    { id: "referrals", label: "مصادر الإحالة", icon: PhoneForwarded, content: <ReferenceTable {...referrals} columns={referralColumns} onAdd={referrals.add} onUpdate={referrals.update} onDelete={referrals.remove} /> },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">المرجعيات</h1>
        <p className="text-sm text-muted-foreground mt-1">إدارة البيانات المرجعية للنظام</p>
      </div>

      <Tabs defaultValue="departments" dir="rtl">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5 text-xs">
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-4">
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
