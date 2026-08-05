"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ALL_ORDER_STATUSES, ORDER_STATUS_LABEL, esEstadoVenta } from "@/lib/orders";
import {
  changeOrderStatusAction,
  deleteOrderAction,
} from "@/app/admin/(protected)/pedidos/actions";
import type { OrderStatus } from "@/lib/supabase/database.types";

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
  const [confirmDelete, setConfirmDelete] = useState(false);

  function apply(nuevoEstado: OrderStatus) {
    startTransition(async () => {
      const result = await changeOrderStatusAction(orderId, nuevoEstado);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Pedido → ${ORDER_STATUS_LABEL[nuevoEstado]}`);
      setConfirmTarget(null);
      router.refresh();
    });
  }

  function onSelect(nuevoEstado: OrderStatus) {
    // ¿el cambio mueve stock? (entra a venta sin descontar, o sale de venta con stock descontado)
    const entra = esEstadoVenta(nuevoEstado) && !stockDescontado;
    const sale = !esEstadoVenta(nuevoEstado) && stockDescontado;
    if (entra || sale) {
      setConfirmTarget(nuevoEstado);
      return;
    }
    apply(nuevoEstado);
  }

  function doDelete() {
    startTransition(async () => {
      const result = await deleteOrderAction(orderId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Pedido eliminado");
      router.push("/admin/pedidos");
      router.refresh();
    });
  }

  const targetEntra = confirmTarget ? esEstadoVenta(confirmTarget) && !stockDescontado : false;
  const confirmCopy = targetEntra
    ? "Se descontará el stock de todos los productos del pedido. Si algún producto no tiene suficiente, no se aplica nada."
    : "El stock de los productos volverá al inventario (se registran entradas en el kardex).";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button className="gap-1.5" disabled={isPending} />}>
            Cambiar estado <ChevronDown className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {ALL_ORDER_STATUSES.filter((e) => e !== estado).map((e) => (
              <DropdownMenuItem key={e} onClick={() => onSelect(e)}>
                {ORDER_STATUS_LABEL[e]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          className="gap-1.5 text-destructive hover:text-destructive"
          disabled={isPending}
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="size-4" /> Eliminar
        </Button>
      </div>

      {/* Confirmación de cambio de estado que mueve stock */}
      <AlertDialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Cambiar a {confirmTarget ? ORDER_STATUS_LABEL[confirmTarget] : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>{confirmCopy}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={() => confirmTarget && apply(confirmTarget)}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmación de eliminación */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              El pedido desaparecerá de los registros.
              {stockDescontado
                ? " Como tenía stock descontado, las unidades vuelven al inventario."
                : ""}{" "}
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
              onClick={doDelete}
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
