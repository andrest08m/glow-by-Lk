import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABEL } from "@/lib/orders";
import type { OrderStatus } from "@/generated/prisma/client";

const STYLES: Record<OrderStatus, string> = {
  PENDIENTE: "bg-neutral-200 text-neutral-700 dark:bg-neutral-500/15 dark:text-neutral-300",
  CONFIRMADO: "bg-blush text-raspberry dark:bg-raspberry/20 dark:text-blush",
  EN_PREPARACION: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  ENVIADO: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  ENTREGADO: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  CANCELADO: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

export function OrderStatusBadge({ estado, className }: { estado: OrderStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        STYLES[estado],
        className
      )}
    >
      {ORDER_STATUS_LABEL[estado]}
    </span>
  );
}
