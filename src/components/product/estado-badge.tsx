import { cn } from "@/lib/utils";
import { ESTADO_LABEL } from "@/lib/product-status";
import type { ProductStatus } from "@/lib/supabase/database.types";

const ESTADO_STYLES: Record<ProductStatus, string> = {
  DISPONIBLE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  POCO_STOCK: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  AGOTADO: "bg-neutral-200 text-neutral-600 dark:bg-neutral-500/15 dark:text-neutral-300",
};

export function EstadoBadge({
  estado,
  className,
}: {
  estado: ProductStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        ESTADO_STYLES[estado],
        className
      )}
    >
      {ESTADO_LABEL[estado]}
    </span>
  );
}
