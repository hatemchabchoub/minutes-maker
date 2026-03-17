interface WeeklyReportData {
  periodLabel: string;
  departmentName?: string;
  stats: {
    totalPv: number;
    totalSeizure: number;
    totalActual: number;
    totalVirtual: number;
    totalPrecautionary: number;
    customs: number;
    currency: number;
    publicLaw: number;
  };
  byDept: { name: string; code: string; count: number; seizure: number }[];
  byOfficer: { name: string; count: number; seizure: number }[];
  byStatus: Record<string, number>;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("fr-TN", { minimumFractionDigits: 0 }).format(v);

const statusLabels: Record<string, string> = {
  draft: "مسودة / Brouillon",
  under_review: "قيد المراجعة / En révision",
  validated: "مصادق / Validé",
  archived: "مؤرشف / Archivé",
};

export default function WeeklyReportPrintTemplate({ periodLabel, departmentName, stats, byDept, byOfficer, byStatus }: WeeklyReportData) {
  return (
    <div className="hidden print:block print-report" dir="rtl">
      <div className="print-page">
        {/* Header */}
        <div className="text-center mb-6 border-b-2 border-foreground pb-4">
          <p className="text-sm">الجمهورية التونسية — République Tunisienne</p>
          <p className="text-xs">وزارة المالية — Ministère des Finances</p>
          <p className="text-base font-bold mt-1">الإدارة العامة للديوانة — Direction Générale des Douanes</p>
          {departmentName && (
            <p className="text-sm mt-1 font-medium">{departmentName}</p>
          )}
        </div>

        {/* Report title */}
        <div className="text-center mb-6">
          <h1 className="text-lg font-bold">التقرير الدوري — Rapport périodique</h1>
          <p className="text-sm mt-1">{periodLabel}</p>
          <p className="text-xs text-muted-foreground mt-1">
            تاريخ الطباعة: {new Date().toLocaleDateString("fr-TN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* KPI Summary */}
        <div className="mb-6 border border-foreground p-4">
          <h2 className="text-sm font-bold mb-3 border-b border-foreground pb-1">
            المؤشرات الرئيسية — Indicateurs clés
          </h2>
          <div className="grid grid-cols-4 gap-4 text-xs">
            <div className="text-center">
              <p className="text-muted-foreground">مجموع المحاضر</p>
              <p className="text-xl font-bold font-mono mt-1">{stats.totalPv}</p>
              <p className="text-muted-foreground text-[10px]">Total PV</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">المحجوز الكلي (د.ت)</p>
              <p className="text-xl font-bold font-mono mt-1">{fmt(stats.totalSeizure)}</p>
              <p className="text-muted-foreground text-[10px]">Total saisies</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">المحجوز الفعلي</p>
              <p className="text-xl font-bold font-mono mt-1">{fmt(stats.totalActual)}</p>
              <p className="text-muted-foreground text-[10px]">Saisies réelles</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">المحجوز الصوري</p>
              <p className="text-xl font-bold font-mono mt-1">{fmt(stats.totalVirtual)}</p>
              <p className="text-muted-foreground text-[10px]">Saisies fictives</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs mt-4 pt-3 border-t border-border">
            <div className="text-center">
              <p className="text-muted-foreground">مخالفات ديوانية</p>
              <p className="text-lg font-bold font-mono">{stats.customs}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">مخالفات صرفية</p>
              <p className="text-lg font-bold font-mono">{stats.currency}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">مخالفات حق عام</p>
              <p className="text-lg font-bold font-mono">{stats.publicLaw}</p>
            </div>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="mb-6">
          <h2 className="text-sm font-bold border-b border-foreground pb-1 mb-2">
            توزيع حسب الحالة — Répartition par statut
          </h2>
          <div className="flex gap-6 text-xs">
            {Object.entries(byStatus).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 border border-foreground" />
                <span>{statusLabels[k] || k}: <strong className="font-mono">{v}</strong></span>
              </div>
            ))}
          </div>
        </div>

        {/* Department table */}
        <div className="mb-6">
          <h2 className="text-sm font-bold border-b border-foreground pb-1 mb-2">
            التفصيل حسب القسم — Détail par département
          </h2>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-foreground">
                <th className="py-1 text-start">#</th>
                <th className="py-1 text-start">القسم — Département</th>
                <th className="py-1 text-start">Code</th>
                <th className="py-1 text-end">عدد المحاضر</th>
                <th className="py-1 text-end">المحجوز (د.ت)</th>
                <th className="py-1 text-end">%</th>
              </tr>
            </thead>
            <tbody>
              {byDept.map((d, i) => (
                <tr key={d.code} className="border-b border-border">
                  <td className="py-1">{i + 1}</td>
                  <td className="py-1">{d.name}</td>
                  <td className="py-1 font-mono">{d.code}</td>
                  <td className="py-1 text-end font-mono">{d.count}</td>
                  <td className="py-1 text-end font-mono">{fmt(d.seizure)}</td>
                  <td className="py-1 text-end font-mono">
                    {stats.totalPv > 0 ? ((d.count / stats.totalPv) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-foreground font-bold">
                <td className="py-1" colSpan={3}>المجموع — Total</td>
                <td className="py-1 text-end font-mono">{stats.totalPv}</td>
                <td className="py-1 text-end font-mono">{fmt(stats.totalSeizure)}</td>
                <td className="py-1 text-end font-mono">100%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Officer table */}
        <div className="mb-6">
          <h2 className="text-sm font-bold border-b border-foreground pb-1 mb-2">
            التفصيل حسب الضابط — Détail par officier
          </h2>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-foreground">
                <th className="py-1 text-start">#</th>
                <th className="py-1 text-start">الضابط — Officier</th>
                <th className="py-1 text-end">عدد المحاضر</th>
                <th className="py-1 text-end">المحجوز (د.ت)</th>
                <th className="py-1 text-end">المعدل / محضر</th>
              </tr>
            </thead>
            <tbody>
              {byOfficer.slice(0, 15).map((o, i) => (
                <tr key={o.name + i} className="border-b border-border">
                  <td className="py-1">{i + 1}</td>
                  <td className="py-1">{o.name}</td>
                  <td className="py-1 text-end font-mono">{o.count}</td>
                  <td className="py-1 text-end font-mono">{fmt(o.seizure)}</td>
                  <td className="py-1 text-end font-mono">
                    {o.count > 0 ? fmt(Math.round(o.seizure / o.count)) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="mt-10 grid grid-cols-2 gap-16 text-xs text-center">
          <div>
            <p className="font-medium mb-10">رئيس مصلحة المحاضر</p>
            <p className="border-t border-foreground pt-1">Chef du service contentieux</p>
          </div>
          <div>
            <p className="font-medium mb-10">المدير الجهوي</p>
            <p className="border-t border-foreground pt-1">Directeur régional</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-3 border-t border-muted-foreground text-[9px] text-muted-foreground flex justify-between">
          <span>طبع بتاريخ: {new Date().toLocaleDateString("fr-TN")}</span>
          <span>النظام الآلي لمتابعة المحاضر — Système SIGMAP</span>
        </div>
      </div>
    </div>
  );
}
