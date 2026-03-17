import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { EXCEL_COLUMN_MAP } from "./excel-mapping";

// Reverse map: dbField → Arabic header
const DB_TO_HEADER: Record<string, string> = {};
for (const [arabic, dbField] of Object.entries(EXCEL_COLUMN_MAP)) {
  // Keep first (most specific) mapping per dbField
  if (!DB_TO_HEADER[dbField]) DB_TO_HEADER[dbField] = arabic;
}

// Ordered columns matching the import mapping
const EXPORT_COLUMNS: { dbField: string; header: string }[] = [
  { dbField: "pv_number", header: DB_TO_HEADER["pv_number"] || "عدد المحضر" },
  { dbField: "pv_date", header: DB_TO_HEADER["pv_date"] || "تاريخ المحضر" },
  { dbField: "department_name", header: DB_TO_HEADER["department_name"] || "القسم" },
  { dbField: "officer_full", header: DB_TO_HEADER["officer_full"] || "الضابط المكلف بالملف" },
  { dbField: "referral_type", header: DB_TO_HEADER["referral_type"] || "طبيعة الإحالة" },
  { dbField: "referral_source", header: DB_TO_HEADER["referral_source"] || "مصدر الإحالة" },
  { dbField: "offender1_name", header: DB_TO_HEADER["offender1_name"] || "المخالف 1_الإسم واللقب أو الشركة" },
  { dbField: "offender1_id", header: DB_TO_HEADER["offender1_id"] || "المخالف 1_المعرف الوحيد" },
  { dbField: "offender2_name", header: DB_TO_HEADER["offender2_name"] || "المخالف 2_الإسم واللقب أو الشركة" },
  { dbField: "offender2_id", header: DB_TO_HEADER["offender2_id"] || "المخالف 2_المعرف الوحيد" },
  { dbField: "violation1", header: DB_TO_HEADER["violation1"] || "المخالفة 1" },
  { dbField: "total_actual_seizure", header: DB_TO_HEADER["total_actual_seizure"] || "مجموع المحجوز الفعلي" },
  { dbField: "total_virtual_seizure", header: DB_TO_HEADER["total_virtual_seizure"] || "مجموع المحجوز الصوري" },
  { dbField: "total_precautionary_seizure", header: DB_TO_HEADER["total_precautionary_seizure"] || "مجموع المحجوز التحفظي" },
  { dbField: "pv_type", header: DB_TO_HEADER["pv_type"] || "محضر أو ضلع" },
  { dbField: "customs_violation", header: DB_TO_HEADER["customs_violation"] || "مخالفة ديوانية" },
  { dbField: "currency_violation", header: DB_TO_HEADER["currency_violation"] || "مخالفة صرفية" },
  { dbField: "public_law_violation", header: DB_TO_HEADER["public_law_violation"] || "مخالفة حق عام" },
  { dbField: "seizure_renewal", header: DB_TO_HEADER["seizure_renewal"] || "تجديد حجز" },
  { dbField: "notes", header: DB_TO_HEADER["notes"] || "ملاحضات" },
  { dbField: "total_seizure", header: DB_TO_HEADER["total_seizure"] || "مجموع المحجوز" },
];

// Reverse referral type map
const REFERRAL_TYPE_REVERSE: Record<string, string> = {
  internal: "إحالات هياكل داخلية",
  external: "إحالات هياكل خارجية",
  flagrante: "مباشرة",
};

interface ExportOptions {
  statusFilter?: string;
  search?: string;
}

export async function exportPvToExcel(options: ExportOptions = {}): Promise<void> {
  // Fetch all PVs (no pagination)
  let query = supabase
    .from("pv")
    .select(`
      id, pv_number, pv_date, pv_type, referral_type,
      total_actual_seizure, total_virtual_seizure, total_precautionary_seizure, total_seizure,
      customs_violation, currency_violation, public_law_violation, seizure_renewal,
      notes,
      departments (name_ar),
      officers (full_name, badge_number, rank_label),
      referral_sources (label_ar)
    `)
    .order("pv_date", { ascending: false });

  if (options.statusFilter && options.statusFilter !== "all") {
    query = query.eq("case_status", options.statusFilter);
  }
  if (options.search) {
    query = query.or(`pv_number.ilike.%${options.search}%,internal_reference.ilike.%${options.search}%`);
  }

  const { data: pvList, error } = await query;
  if (error) throw error;
  if (!pvList || pvList.length === 0) throw new Error("لا توجد بيانات للتصدير");

  const pvIds = pvList.map((p: any) => p.id);

  // Fetch offenders and violations in parallel
  const [{ data: offenders }, { data: violations }] = await Promise.all([
    supabase.from("offenders").select("pv_id, display_order, name_or_company, identifier").in("pv_id", pvIds),
    supabase.from("violations").select("pv_id, display_order, violation_label").in("pv_id", pvIds),
  ]);

  // Index offenders/violations by pv_id
  const offenderMap: Record<string, any[]> = {};
  offenders?.forEach((o) => {
    if (!offenderMap[o.pv_id]) offenderMap[o.pv_id] = [];
    offenderMap[o.pv_id].push(o);
  });

  const violationMap: Record<string, any[]> = {};
  violations?.forEach((v) => {
    if (!violationMap[v.pv_id]) violationMap[v.pv_id] = [];
    violationMap[v.pv_id].push(v);
  });

  // Build rows with Arabic headers matching import format
  const rows = pvList.map((pv: any) => {
    const off1 = offenderMap[pv.id]?.find((o: any) => o.display_order === 1);
    const off2 = offenderMap[pv.id]?.find((o: any) => o.display_order === 2);
    const viol1 = violationMap[pv.id]?.find((v: any) => v.display_order === 1);

    const officerParts = [
      pv.officers?.rank_label,
      pv.officers?.full_name,
      pv.officers?.badge_number ? `(${pv.officers.badge_number})` : null,
    ].filter(Boolean).join(" ");

    const row: Record<string, any> = {};
    for (const col of EXPORT_COLUMNS) {
      switch (col.dbField) {
        case "pv_number": row[col.header] = pv.pv_number; break;
        case "pv_date": row[col.header] = pv.pv_date; break;
        case "department_name": row[col.header] = pv.departments?.name_ar || ""; break;
        case "officer_full": row[col.header] = officerParts; break;
        case "referral_type": row[col.header] = REFERRAL_TYPE_REVERSE[pv.referral_type] || pv.referral_type || ""; break;
        case "referral_source": row[col.header] = pv.referral_sources?.label_ar || ""; break;
        case "offender1_name": row[col.header] = off1?.name_or_company || ""; break;
        case "offender1_id": row[col.header] = off1?.identifier || ""; break;
        case "offender2_name": row[col.header] = off2?.name_or_company || ""; break;
        case "offender2_id": row[col.header] = off2?.identifier || ""; break;
        case "violation1": row[col.header] = viol1?.violation_label || ""; break;
        case "total_actual_seizure": row[col.header] = pv.total_actual_seizure || 0; break;
        case "total_virtual_seizure": row[col.header] = pv.total_virtual_seizure || 0; break;
        case "total_precautionary_seizure": row[col.header] = pv.total_precautionary_seizure || 0; break;
        case "pv_type": row[col.header] = pv.pv_type || ""; break;
        case "customs_violation": row[col.header] = pv.customs_violation ? "نعم" : ""; break;
        case "currency_violation": row[col.header] = pv.currency_violation ? "نعم" : ""; break;
        case "public_law_violation": row[col.header] = pv.public_law_violation ? "نعم" : ""; break;
        case "seizure_renewal": row[col.header] = pv.seizure_renewal ? "نعم" : ""; break;
        case "notes": row[col.header] = pv.notes || ""; break;
        case "total_seizure": row[col.header] = pv.total_seizure || 0; break;
      }
    }
    return row;
  });

  // Generate workbook
  const ws = XLSX.utils.json_to_sheet(rows, {
    header: EXPORT_COLUMNS.map((c) => c.header),
  });

  // Set RTL and column widths
  ws["!cols"] = EXPORT_COLUMNS.map(() => ({ wch: 22 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "المحاضر");

  const today = new Date().toISOString().split("T")[0];
  XLSX.writeFile(wb, `محاضر_${today}.xlsx`);
}
