import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingCart, TrendingDown, ArrowLeftRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/site/empty-state";
import { CatalogPagination } from "@/components/product/catalog-pagination";
import { SearchBox } from "@/components/admin/search-box";
import { MovementTypeBadge } from "@/components/admin/inventory/movement-type-badge";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatFecha } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MovementType } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Histórico de movimientos" };

type SearchParams = { q?: string; tipo?: string; page?: string };
const TIPOS: { value: MovementType | "TODOS"; label: string }[] = [
  { value: "TODOS", label: "Todos" },
  { value: "ENTRADA", label: "Compras (entradas)" },
  { value: "SALIDA", label: "Ventas (salidas)" },
  { value: "AJUSTE", label: "Ajustes" },
];
const PAGE_SIZE = 30;

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const tipo = ["ENTRADA", "SALIDA", "AJUSTE"].includes(sp.tipo ?? "")
    ? (sp.tipo as MovementType)
    : undefined;
  const page = sp.page ? Math.max(1, Number(sp.page)) : 1;
  const db = createAdminClient();
  const from = (page - 1) * PAGE_SIZE;

  // filtro por nombre de producto: resolvemos ids primero
  let productIds: string[] | undefined;
  if (sp.q) {
    const { data } = await db.from("products").select("id").ilike("nombre", `%${sp.q}%`);
    productIds = (data ?? []).map((p) => p.id);
    if (productIds.length === 0) productIds = ["__none__"];
  }

  let query = db
    .from("inventory_movements")
    .select("*,product:products(id,nombre),order:orders(numero,id)", { count: "exact" });
  if (tipo) query = query.eq("tipo", tipo);
  if (productIds) query = query.in("product_id", productIds);

  const [movRes, resumenRes] = await Promise.all([
    query.order("fecha", { ascending: false }).range(from, from + PAGE_SIZE - 1),
    db.rpc("movimientos_resumen"),
  ]);

  const total = movRes.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const resumen = (resumenRes.data ?? {}) as Record<string, number>;

  const movements = (
    (movRes.data as
      | {
          id: string;
          tipo: MovementType;
          cantidad: number;
          saldo_resultante: number;
          motivo: string | null;
          admin_email: string | null;
          fecha: string;
          product: { id: string; nombre: string } | null;
          order: { numero: number; id: string } | null;
        }[]
      | null) ?? []
  ).map((m) => ({
    id: m.id,
    tipo: m.tipo,
    cantidad: m.cantidad,
    saldo: m.saldo_resultante,
    motivo: m.motivo,
    adminEmail: m.admin_email,
    fecha: new Date(m.fecha),
    product: m.product,
    order: m.order,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-foreground sm:text-3xl">Histórico de movimientos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todo lo que entra (compras) y sale (ventas) del inventario, producto por producto.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-3xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Comprado</span>
            <div className="flex size-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <ShoppingCart className="size-4.5" />
            </div>
          </div>
          <p className="mt-3 font-heading text-2xl text-foreground sm:text-3xl">
            {Number(resumen.comprado ?? 0)}
          </p>
          <p className="text-xs text-muted-foreground">unidades ingresadas</p>
        </div>
        <div className="rounded-3xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Vendido</span>
            <div className="flex size-9 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
              <TrendingDown className="size-4.5" />
            </div>
          </div>
          <p className="mt-3 font-heading text-2xl text-foreground sm:text-3xl">
            {Number(resumen.vendido ?? 0)}
          </p>
          <p className="text-xs text-muted-foreground">unidades salidas</p>
        </div>
        <div className="rounded-3xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Movimientos</span>
            <div className="flex size-9 items-center justify-center rounded-full bg-blush text-raspberry">
              <ArrowLeftRight className="size-4.5" />
            </div>
          </div>
          <p className="mt-3 font-heading text-2xl text-foreground sm:text-3xl">
            {Number(resumen.movimientos ?? 0)}
          </p>
          <p className="text-xs text-muted-foreground">registrados en total</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TIPOS.map((t) => {
          const active = (t.value === "TODOS" && !tipo) || t.value === tipo;
          const href = t.value === "TODOS" ? "/admin/movimientos" : `/admin/movimientos?tipo=${t.value}`;
          return (
            <Link
              key={t.value}
              href={href}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground/80 hover:bg-muted"
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <SearchBox placeholder="Buscar por producto..." />

      {movements.length === 0 ? (
        <EmptyState title="Sin movimientos" description="Registra entradas y salidas desde Inventario." />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="hidden md:table-cell">Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                    {formatFecha(m.fecha)}
                  </TableCell>
                  <TableCell>
                    {m.product ? (
                      <Link
                        href={`/admin/inventario/${m.product.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {m.product.nombre}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">(eliminado)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <MovementTypeBadge tipo={m.tipo} />
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium tabular-nums",
                      m.cantidad > 0 && "text-emerald-600 dark:text-emerald-400",
                      m.cantidad < 0 && "text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                  </TableCell>
                  <TableCell className="text-right font-heading tabular-nums text-foreground">
                    {m.saldo}
                  </TableCell>
                  <TableCell className="hidden max-w-64 text-sm text-muted-foreground md:table-cell">
                    <span className="line-clamp-2">
                      {m.motivo ?? "—"}
                      {m.order && (
                        <>
                          {" "}
                          <Link
                            href={`/admin/pedidos/${m.order.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            #{m.order.numero}
                          </Link>
                        </>
                      )}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CatalogPagination page={page} totalPages={totalPages} searchParams={sp} />
    </div>
  );
}
