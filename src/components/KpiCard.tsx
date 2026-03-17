import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  variant?: "default" | "primary" | "warning" | "success";
}

const variantConfig = {
  default: {
    card: "",
    icon: "bg-muted text-muted-foreground",
    border: "border-transparent",
  },
  primary: {
    card: "",
    icon: "bg-primary/10 text-primary",
    border: "border-primary/30",
  },
  warning: {
    card: "",
    icon: "bg-accent/10 text-accent-foreground",
    border: "border-accent/30",
  },
  success: {
    card: "",
    icon: "bg-success/10 text-success",
    border: "border-success/30",
  },
};

export function KpiCard({ label, value, icon: Icon, trend, variant = "default" }: KpiCardProps) {
  const v = variantConfig[variant];

  return (
    <div
      className={cn(
        "surface-elevated p-5 flex items-start justify-between border transition-all hover:shadow-md group",
        v.border
      )}
    >
      <div className="space-y-1.5">
        <p className="text-[11px] text-muted-foreground font-medium tracking-wide">{label}</p>
        <p className="text-2xl font-bold font-mono-data tracking-tight">{value}</p>
        {trend && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            {trend}
          </p>
        )}
      </div>
      <div className={cn("p-2.5 rounded-lg transition-transform group-hover:scale-110", v.icon)}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}
