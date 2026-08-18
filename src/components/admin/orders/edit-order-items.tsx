"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCOP } from "@/lib/format";
import { editOrderItemsAction } from "@/app/admin/(protected)/pedidos/actions";

export type OrderProductOption = { id: string; nombre: string; precio: number; stock: number };
type Row = { key: string; productId: string; cantidad: string };

export function EditOrderItems({
  orderId,
  initialItems,
  products,
}: {
  orderId: string;
  initialItems: { productId: string; cantidad: number }[];
  products: OrderProductOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState<Row[]>([]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  function reset() {
    setRows(
      initialItems.length > 0
        ? initialItems.map((it) => ({
            key: crypto.randomUUID(),
            productId: it.productId,
            cantidad: String(it.cantidad),
          }))
        : [{ key: crypto.randomUUID(), productId: "", cantidad: "1" }]
    );
  }

  const total = rows.reduce((sum, r) => {
    const p = productById.get(r.productId);
    return sum + (p ? p.precio * (Number(r.cantidad) || 0) : 0);
  }, 0);

  function update(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, { key: crypto.randomUUID(), productId: "", cantidad: "1" }]);
  }
  function removeRow(key: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  }

  function save() {
    const items = rows.filter((r) => r.productId);
    if (items.length === 0) {
      toast.error("Agregá al menos un producto.");
      return;
    }
    for (const r of items) {
      const q = Number(r.cantidad);
      if (!Number.isInteger(q) || q <= 0) {
        toast.error("Las cantidades deben ser enteros mayores a 0.");
        return;
      }
    }
    if (new Set(items.map((r) => r.productId)).size !== items.length) {
      toast.error("Hay productos repetidos: usá una sola línea por producto.");
      return;
    }

    startTransition(async () => {
      const result = await editOrderItemsAction(
        orderId,
        items.map((r) => ({ productId: r.productId, cantidad: Number(r.cantidad) }))
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Pedido actualizado");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) reset();
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
        <Pencil className="size-4" /> Editar productos
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar productos del pedido</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {rows.map((row) => {
            const p = productById.get(row.productId);
            const qty = Number(row.cantidad) || 0;
            return (
              <div key={row.key} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <Select
                    value={row.productId || null}
                    onValueChange={(v) => update(row.key, { productId: v as string })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>{p ? p.nombre : "Elegí un producto"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((op) => (
                        <SelectItem key={op.id} value={op.id}>
                          {op.nombre} · {formatCOP(op.precio)} · {op.stock} uds
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={row.cantidad}
                  onChange={(e) => update(row.key, { cantidad: e.target.value })}
                  className="w-20"
                  aria-label="Cantidad"
                />
                <span className="w-24 pt-2 text-right text-sm font-medium text-foreground">
                  {p ? formatCOP(p.precio * qty) : "—"}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeRow(row.key)}
                  disabled={rows.length === 1}
                  aria-label="Quitar"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            );
          })}
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addRow}>
            <Plus className="size-4" /> Agregar producto
          </Button>
          <p className="text-xs text-muted-foreground">
            Si el pedido ya descontó stock, se ajusta automáticamente (devuelve lo viejo, descuenta
            lo nuevo). Si algún producto no alcanza, no se aplica nada.
          </p>
        </div>

        <DialogFooter className="items-center justify-between sm:justify-between">
          <span className="font-heading text-lg text-foreground">Total: {formatCOP(total)}</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
