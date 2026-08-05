"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCOP } from "@/lib/format";
import { createOrderAction } from "@/app/admin/(protected)/pedidos/actions";

export type ProductOption = {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
};

export type CustomerOption = {
  id: string;
  nombre: string;
  whatsapp: string;
};

type ItemRow = { key: string; productId: string; cantidad: string };

export function NewOrderForm({
  products,
  customers,
}: {
  products: ProductOption[];
  customers: CustomerOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [clienteTab, setClienteTab] = useState<"existente" | "nuevo">(
    customers.length > 0 ? "existente" : "nuevo"
  );
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoWhatsapp, setNuevoWhatsapp] = useState("");
  const [nuevaDireccion, setNuevaDireccion] = useState("");

  const [rows, setRows] = useState<ItemRow[]>([
    { key: crypto.randomUUID(), productId: "", cantidad: "1" },
  ]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const total = rows.reduce((sum, row) => {
    const p = productById.get(row.productId);
    const qty = Number(row.cantidad) || 0;
    return sum + (p ? p.precio * qty : 0);
  }, 0);

  function updateRow(key: string, patch: Partial<ItemRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { key: crypto.randomUUID(), productId: "", cantidad: "1" }]);
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  }

  function validate(): string | null {
    if (clienteTab === "existente" && !customerId) return "Elige un cliente.";
    if (clienteTab === "nuevo") {
      if (nuevoNombre.trim().length < 2) return "Escribe el nombre del cliente.";
      if (!/^\d{10}$|^57\d{10}$/.test(nuevoWhatsapp.trim()))
        return "WhatsApp del cliente: celular de 10 dígitos (ej: 3001234567).";
    }
    const items = rows.filter((r) => r.productId);
    if (items.length === 0) return "Agrega al menos un producto.";
    for (const r of items) {
      const qty = Number(r.cantidad);
      if (!Number.isInteger(qty) || qty <= 0) return "Las cantidades deben ser enteros mayores a 0.";
    }
    const ids = items.map((r) => r.productId);
    if (new Set(ids).size !== ids.length) return "Hay productos repetidos: usa una sola línea por producto.";
    return null;
  }

  function onSubmit() {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    const payload = {
      customerId: clienteTab === "existente" ? customerId : null,
      nuevoCliente:
        clienteTab === "nuevo"
          ? { nombre: nuevoNombre.trim(), whatsapp: nuevoWhatsapp.trim(), direccion: nuevaDireccion.trim() }
          : null,
      items: rows
        .filter((r) => r.productId)
        .map((r) => ({ productId: r.productId, cantidad: Number(r.cantidad) })),
    };

    startTransition(async () => {
      const result = await createOrderAction(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Pedido creado");
      router.push(`/admin/pedidos/${result.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href="/admin/pedidos" />} aria-label="Volver">
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="font-heading text-2xl text-foreground sm:text-3xl">Nuevo pedido</h1>
      </div>

      <section className="space-y-4 rounded-3xl border border-border/60 bg-card p-5 sm:p-6">
        <h2 className="font-heading text-lg text-foreground">Cliente</h2>
        <Tabs value={clienteTab} onValueChange={(v) => setClienteTab(v as "existente" | "nuevo")}>
          <TabsList>
            <TabsTrigger value="existente" disabled={customers.length === 0}>
              Cliente existente
            </TabsTrigger>
            <TabsTrigger value="nuevo">Cliente nuevo</TabsTrigger>
          </TabsList>
          <TabsContent value="existente" className="pt-3">
            <Select value={customerId} onValueChange={(v) => setCustomerId(v as string)}>
              <SelectTrigger className="w-full sm:w-96">
                <SelectValue>
                  {customerId
                    ? customers.find((c) => c.id === customerId)?.nombre
                    : "Elige un cliente"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre} · {c.whatsapp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TabsContent>
          <TabsContent value="nuevo" className="grid gap-4 pt-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nuevo-nombre">Nombre</Label>
              <Input
                id="nuevo-nombre"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                placeholder="Ej: María Gómez"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nuevo-whatsapp">WhatsApp</Label>
              <Input
                id="nuevo-whatsapp"
                inputMode="numeric"
                value={nuevoWhatsapp}
                onChange={(e) => setNuevoWhatsapp(e.target.value)}
                placeholder="3001234567"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nueva-direccion">Dirección (opcional)</Label>
              <Textarea
                id="nueva-direccion"
                rows={2}
                value={nuevaDireccion}
                onChange={(e) => setNuevaDireccion(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Si el WhatsApp ya existe, el pedido se asociará a ese cliente.
            </p>
          </TabsContent>
        </Tabs>
      </section>

      <section className="space-y-4 rounded-3xl border border-border/60 bg-card p-5 sm:p-6">
        <h2 className="font-heading text-lg text-foreground">Productos</h2>

        <div className="space-y-3">
          {rows.map((row) => {
            const product = productById.get(row.productId);
            const qty = Number(row.cantidad) || 0;
            const excedeStock = product ? qty > product.stock : false;
            return (
              <div key={row.key} className="rounded-2xl border border-border/60 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <Select
                      value={row.productId || null}
                      onValueChange={(v) => updateRow(row.key, { productId: v as string })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>{product ? product.nombre : "Elige un producto"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nombre} · {formatCOP(p.precio)} · {p.stock} uds
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {excedeStock && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="size-3.5" />
                        Supera el stock actual ({product?.stock}). Podrás guardarlo, pero no
                        confirmarlo hasta reponer.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      value={row.cantidad}
                      onChange={(e) => updateRow(row.key, { cantidad: e.target.value })}
                      className="w-20"
                      aria-label="Cantidad"
                    />
                    <span className="w-28 text-right text-sm font-medium text-foreground">
                      {product ? formatCOP(product.precio * qty) : "—"}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeRow(row.key)}
                      disabled={rows.length === 1}
                      aria-label="Quitar producto"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Button variant="outline" size="sm" className="gap-1.5" onClick={addRow}>
          <Plus className="size-4" /> Agregar producto
        </Button>
      </section>

      <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/95 p-4 backdrop-blur">
        <div>
          <p className="text-xs text-muted-foreground">Total del pedido</p>
          <p className="font-heading text-2xl text-foreground">{formatCOP(total)}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" render={<Link href="/admin/pedidos" />}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending ? "Creando..." : "Crear pedido"}
          </Button>
        </div>
      </div>
    </div>
  );
}
