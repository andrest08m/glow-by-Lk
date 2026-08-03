import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "default" | "warning" | "danger";
}) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div
          className={cn(
            "flex size-9 items-center justify-center rounded-full",
            tone === "warning" && "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
            tone === "danger" && "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
            tone === "default" && "bg-blush text-raspberry"
          )}
        >
          <Icon className="size-4.5" />
        </div>
      </div>
      <p className="mt-3 font-heading text-3xl text-foreground">{value}</p>
    </div>
  );
}
