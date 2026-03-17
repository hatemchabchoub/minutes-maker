interface PvPrintData {
  pv: any;
  offenders: any[];
  violations: any[];
  seizures: any[];
}

const fmt = (v: number) =>
  new Intl.NumberFormat("fr-TN", { minimumFractionDigits: 3 }).format(v);

export default function PvPrintTemplate({ pv, offenders, violations, seizures }: PvPrintData) {
  return (
    <div className="hidden print:block print-pv" dir="rtl">
      {/* Page 1 */}
      <div className="print-page">
        {/* Institutional Header */}
        <div className="text-center mb-6 border-b-2 border-foreground pb-4">
          <p className="text-sm">الجمهورية التونسية</p>
          <p className="text-xs">وزارة المالية</p>
          <p className="text-base font-bold mt-1">الإدارة العامة للديوانة</p>
          <div className="flex justify-between mt-3 text-xs">
            <div className="text-start">
              <p>القسم: {(pv as any).departments?.name_ar || "—"}</p>
              <p>الضابط: {(pv as any).officers?.full_name || "—"}</p>
              <p>الرتبة: {(pv as any).officers?.rank_label || "—"}</p>
            </div>
            <div className="text-end" dir="ltr">
              <p>République Tunisienne</p>
              <p>Ministère des Finances</p>
              <p className="font-semibold">Direction Générale des Douanes</p>
            </div>
          </div>
        </div>

        {/* PV Title */}
        <div className="text-center mb-6">
          <h1 className="text-lg font-bold">
            {pv.pv_type === "ضلع" ? "ضلع حجز" : "محضر حجز"}
          </h1>
          <h2 className="text-base font-bold mt-1" dir="ltr">
            {pv.pv_type === "ضلع" ? "Aile de saisie" : "Procès-verbal de saisie"}
          </h2>
          <div className="flex justify-center gap-8 mt-3 text-sm">
            <span>عدد: <strong className="font-mono">{pv.pv_number}</strong></span>
            <span>المرجع: <strong className="font-mono" dir="ltr">{pv.internal_reference}</strong></span>
            <span>التاريخ: <strong>{pv.pv_date}</strong></span>
          </div>
        </div>

        {/* Legal Classification */}
        <div className="mb-5">
          <h3 className="text-sm font-bold border-b border-foreground pb-1 mb-2">
            التصنيف القانوني — Classification juridique
          </h3>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {[
              ["مخالفة ديوانية", "Infraction douanière", pv.customs_violation],
              ["مخالفة صرفية", "Infraction de change", pv.currency_violation],
              ["مخالفة حق عام", "Droit commun", pv.public_law_violation],
              ["تجديد حجز", "Renouvellement", pv.seizure_renewal],
            ].map(([ar, fr, val]) => (
              <div key={String(ar)} className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 border border-foreground text-center leading-3 text-[8px]">
                  {val ? "✓" : ""}
                </span>
                <span>{String(ar)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Referral */}
        <div className="mb-5">
          <h3 className="text-sm font-bold border-b border-foreground pb-1 mb-2">
            الإحالة — Saisine
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">طبيعة الإحالة: </span>
              <strong>{pv.referral_type || "—"}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">الحالة: </span>
              <strong>{pv.case_status || "—"}</strong>
            </div>
          </div>
        </div>

        {/* Offenders */}
        <div className="mb-5">
          <h3 className="text-sm font-bold border-b border-foreground pb-1 mb-2">
            المخالفون — Contrevenants ({offenders.length})
          </h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-foreground">
                <th className="py-1 text-start">#</th>
                <th className="py-1 text-start">الإسم أو الشركة — Nom</th>
                <th className="py-1 text-start">المعرف — Identifiant</th>
                <th className="py-1 text-start">النوع — Type</th>
                <th className="py-1 text-start">العنوان — Adresse</th>
              </tr>
            </thead>
            <tbody>
              {offenders.map((o, i) => (
                <tr key={o.id} className="border-b border-border">
                  <td className="py-1">{i + 1}</td>
                  <td className="py-1 font-medium">{o.name_or_company}</td>
                  <td className="py-1 font-mono">{o.identifier || "—"}</td>
                  <td className="py-1">{o.person_type === "physical" ? "شخص طبيعي" : "شخص معنوي"}</td>
                  <td className="py-1">{[o.address, o.city].filter(Boolean).join(", ") || "—"}</td>
                </tr>
              ))}
              {offenders.length === 0 && (
                <tr><td colSpan={5} className="py-2 text-center text-muted-foreground">—</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Violations */}
        <div className="mb-5">
          <h3 className="text-sm font-bold border-b border-foreground pb-1 mb-2">
            المخالفات — Infractions ({violations.length})
          </h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-foreground">
                <th className="py-1 text-start">#</th>
                <th className="py-1 text-start">المخالفة — Infraction</th>
                <th className="py-1 text-start">الصنف — Catégorie</th>
                <th className="py-1 text-start">الأساس القانوني — Base légale</th>
              </tr>
            </thead>
            <tbody>
              {violations.map((v, i) => (
                <tr key={v.id} className="border-b border-border">
                  <td className="py-1">{i + 1}</td>
                  <td className="py-1 font-medium">{v.violation_label}</td>
                  <td className="py-1">{v.violation_category || "—"}</td>
                  <td className="py-1">{v.legal_basis || "—"}</td>
                </tr>
              ))}
              {violations.length === 0 && (
                <tr><td colSpan={4} className="py-2 text-center text-muted-foreground">—</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Seizures */}
        <div className="mb-5">
          <h3 className="text-sm font-bold border-b border-foreground pb-1 mb-2">
            المحجوزات — Saisies ({seizures.length})
          </h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-foreground">
                <th className="py-1 text-start">الصنف</th>
                <th className="py-1 text-start">النوع</th>
                <th className="py-1 text-end">الكمية</th>
                <th className="py-1 text-start">الوحدة</th>
                <th className="py-1 text-end">القيمة (د.ت)</th>
                <th className="py-1 text-start">نوع الحجز</th>
              </tr>
            </thead>
            <tbody>
              {seizures.map((s) => (
                <tr key={s.id} className="border-b border-border">
                  <td className="py-1">{s.goods_category || "—"}</td>
                  <td className="py-1">{s.goods_type || "—"}</td>
                  <td className="py-1 text-end font-mono">{Number(s.quantity).toLocaleString()}</td>
                  <td className="py-1">{s.unit || "—"}</td>
                  <td className="py-1 text-end font-mono">{fmt(Number(s.estimated_value) || 0)}</td>
                  <td className="py-1">
                    {s.seizure_type === "actual" ? "فعلي" : s.seizure_type === "virtual" ? "صوري" : s.seizure_type === "precautionary" ? "تحفظي" : "—"}
                  </td>
                </tr>
              ))}
              {seizures.length === 0 && (
                <tr><td colSpan={6} className="py-2 text-center text-muted-foreground">—</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Seizure Summary */}
        <div className="mb-8 border border-foreground p-3">
          <h3 className="text-sm font-bold mb-2">ملخص المحجوزات — Récapitulatif</h3>
          <div className="grid grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">المحجوز الفعلي: </span>
              <strong className="font-mono">{fmt(Number(pv.total_actual_seizure) || 0)}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">المحجوز الصوري: </span>
              <strong className="font-mono">{fmt(Number(pv.total_virtual_seizure) || 0)}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">المحجوز التحفظي: </span>
              <strong className="font-mono">{fmt(Number(pv.total_precautionary_seizure) || 0)}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">المجموع الكلي: </span>
              <strong className="font-mono text-base">{fmt(Number(pv.total_seizure) || 0)} د.ت</strong>
            </div>
          </div>
        </div>

        {/* Notes */}
        {pv.notes && (
          <div className="mb-8">
            <h3 className="text-sm font-bold border-b border-foreground pb-1 mb-2">
              ملاحظات — Observations
            </h3>
            <p className="text-xs whitespace-pre-wrap">{pv.notes}</p>
          </div>
        )}

        {/* Signatures */}
        <div className="mt-12 grid grid-cols-3 gap-8 text-xs text-center">
          <div>
            <p className="font-medium mb-12">الضابط المحرر</p>
            <p className="border-t border-foreground pt-1">Agent verbalisateur</p>
            <p className="mt-1 text-muted-foreground">{(pv as any).officers?.full_name || ""}</p>
          </div>
          <div>
            <p className="font-medium mb-12">رئيس القسم</p>
            <p className="border-t border-foreground pt-1">Chef de division</p>
          </div>
          <div>
            <p className="font-medium mb-12">المدير الجهوي</p>
            <p className="border-t border-foreground pt-1">Directeur régional</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-3 border-t border-muted-foreground text-[9px] text-muted-foreground flex justify-between">
          <span>طبع بتاريخ: {new Date().toLocaleDateString("fr-TN")}</span>
          <span>المرجع: {pv.internal_reference}</span>
          <span>النظام الآلي لمتابعة المحاضر — Système SIGMAP</span>
        </div>
      </div>
    </div>
  );
}
