"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { MOVEMENT_TYPE_LABEL } from "@/lib/validations/inventory";
import { updateMovement, deleteMovement } from "@/app/admin/(protected)/inventario/actions";
import type { MovementType } from "@/lib/supabase/database.types";

export function MovementRowActions({
  id,
  tipo,
  cantidad,
  motivo,
}: {
  id: string;
  tipo: MovementType;
  cantidad: number; // delta con signo
  motivo: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [tipoVal, setTipoVal] = useState<MovementType>(tipo);
  const [cantidadVal, setCantidadVal] = useState(String(Math.abs(cantidad)));
  const [motivoVal, setMotivoVal] = useState(motivo ?? "");

  function saveEdit() {
    const fd = new FormData();
    fd.append("tipo", tipoVal);
    fd.append("cantidad", cantidadVal);
    fd.append("motivo", motivoVal);
    startTransition(async () => {
      const result = await updateMovement(id, fd);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Movimiento actualizado");
      setEditOpen(false);
      router.refresh();
    });
  }

  function doDelete() {
    startTransition(async () => {
      const result = await deleteMovement(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Movimiento eliminado");
      setConfirmDelete(false);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-0.5">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Editar movimiento"
        onClick={() => {
          setTipoVal(tipo);
          setCantidadVal(String(Math.abs(cantidad)));
          setMotivoVal(motivo ?? "");
          setEditOpen(true);
        }}
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Eliminar movimiento"
        onClick={() => setConfirmDelete(true)}
      >
        <Trash2 className="size-4 text-destructive" />
      </Button>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar movimiento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipoVal} onValueChange={(v) => setTipoVal(v as MovementType)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{MOVEMENT_TYPE_LABEL[tipoVal]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENTRADA">Entrada (compra/reingreso)</SelectItem>
                  <SelectItem value="SALIDA">Salida (venta/merma)</SelectItem>
                  <SelectItem value="AJUSTE">Ajuste</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cant">Cantidad</Label>
              <Input
                id="edit-cant"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={cantidadVal}
                onChange={(e) => setCantidadVal(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Se recalculará el stock y los saldos con este cambio.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-motivo">Motivo</Label>
              <Textarea
                id="edit-motivo"
                rows={2}
                value={motivoVal}
                onChange={(e) => setMotivoVal(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={saveEdit} disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este movimiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Se recalculará el stock del producto y los saldos del kardex. Esta acción no se puede
              deshacer.
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
    </div>
  );
}
