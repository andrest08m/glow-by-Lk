"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, PackageOpen, Truck, PackageCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ORDER_TRANSITIONS, ORDER_STATUS_LABEL } from "@/lib/orders";
import { changeOrderStatusAction } from "@/app/admin/(protected)/pedidos/actions";
import type { OrderStatus } from "@/lib/supabase/database.types";

const NEXT_LABEL: Partial<Record<OrderStatus, { label: string; icon: typeof CheckCircle2 }>> = {
  CONFIRMADO: { label: "Confirmar pedido", icon: CheckCircle2 },
  EN_PREPARACION: { label: "En preparación", icon: PackageOpen },
  ENVIADO: { label: "Marcar enviado", icon: Truck },
  ENTREGADO: { label: "Marcar entregado", icon: PackageCheck },
};

export function OrderStatusActions({
  orderId,
  estado,
  stockDescontado,
}: {
  orderId: string;
  estado: OrderStatus;
  stockDescontado: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmTarget, setConfirmTarget] = useState<OrderStatus | null>(null);

  const posibles = ORDER_TRANSITIONS[estado];
  if (posibles.length === 0) return null;

  function apply(nuevoEstado: OrderStatus) {
    startTransition(async () => {
      const result = await changeOrderStatusAction(orderId, nuevoEstado);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Pedido ${ORDER_STATUS_LABEL[nuevoEstado].toLowerCase()}`);
      setConfirmTarget(null);
      router.refresh();
    });
  }

  function onClick(nuevoEstado: OrderStatus) {
    // confirmar y cancelar mueven stock (o son definitivos): piden confirmación
    if (nuevoEstado === "CONFIRMADO" || nuevoEstado === "CANCELADO") {
      setConfirmTarget(nuevoEstado);
      return;
    }
    apply(nuevoEstado);
  }

  const confirmCopy =
    confirmTarget === "CONFIRMADO"
      ? "Se descontará el stock de todos los productos del pedido. Si algún producto no tiene unidades suficientes, no se confirmará nada."
      : stockDescontado
        ? "El stock de los productos volverá al inventario (se registran entradas en el kardex)."
        : "El pedido quedará cancelado. Como aún no estaba confirmado, el stock no cambia.";

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {posibles
          .filter((e) => e !== "CANCELADO")
          .map((e) => {
            const meta = NEXT_LABEL[e];
            if (!meta) return null;
            const Icon = meta.icon;
            return (
              <Button key={e} className="gap-1.5" disabled={isPending} onClick={() => onClick(e)}>
                <Icon className="size-4" /> {meta.label}
              </Button>
            );
          })}
        {posibles.includes("CANCELADO") && (
          <Button
            variant="destructive"
            className="gap-1.5"
            disabled={isPending}
            onClick={() => onClick("CANCELADO")}
          >
            <XCircle className="size-4" /> Cancelar pedido
          </Button>
        )}
      </div>

      <AlertDialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmTarget === "CONFIRMADO" ? "¿Confirmar este pedido?" : "¿Cancelar este pedido?"}
            </AlertDialogTitle>
            <AlertDialogDescription>{confirmCopy}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              className={
                confirmTarget === "CANCELADO"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
              disabled={isPending}
              onClick={() => confirmTarget && apply(confirmTarget)}
            >
              {confirmTarget === "CONFIRMADO" ? "Sí, confirmar" : "Sí, cancelar pedido"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
