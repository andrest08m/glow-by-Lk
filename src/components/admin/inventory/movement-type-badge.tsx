import { cn } from "@/lib/utils";
import { MOVEMENT_TYPE_LABEL } from "@/lib/validations/inventory";
import type { MovementType } from "@/lib/supabase/database.types";

const STYLES: Record<MovementType, string> = {
  ENTRADA: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  SALIDA: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  AJUSTE: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
};

export function MovementTypeBadge({ tipo, className }: { tipo: MovementType; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        STYLES[tipo],
        className
      )}
    >
      {MOVEMENT_TYPE_LABEL[tipo]}
    </span>
  );
}
