import type { Metadata } from "next";
import Link from "next/link";
import { Plus, MessageCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/site/empty-state";
import { CatalogPagination } from "@/components/product/catalog-pagination";
import { SearchBox } from "@/components/admin/search-box";
import { OrderStatusBadge } from "@/components/admin/orders/order-status-badge";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { formatCOP, formatFecha } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/orders";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Pedidos" };

type SearchParams = { q?: string; estado?: string; page?: string };

const ESTADOS: OrderStatus[] = [
  "PENDIENTE",
  "CONFIRMADO",
  "EN_PREPARACION",
  "ENVIADO",
  "ENTREGADO",
  "CANCELADO",
];
const PAGE_SIZE = 20;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const estado = ESTADOS.includes(sp.estado as OrderStatus) ? (sp.estado as OrderStatus) : undefined;
  const page = sp.page ? Math.max(1, Number(sp.page)) : 1;

  const q = sp.q?.trim();
  const numeroBuscado = q && /^\d+$/.test(q) ? Number(q) : undefined;
  const db = createAdminClient();
  const from = (page - 1) * PAGE_SIZE;

  let query = db
    .from("orders")
    .select("id,numero,cliente_nombre,cliente_telefono,total,estado,created_at,order_items(id)", {
      count: "exact",
    });
  if (estado) query = query.eq("estado", estado);
  if (q) {
    query =
      numeroBuscado !== undefined
        ? query.or(`numero.eq.${numeroBuscado},cliente_nombre.ilike.%${q}%`)
        : query.ilike("cliente_nombre", `%${q}%`);
  }

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const total = count ?? 0;
  const orders = (
    (data as
      | {
          id: string;
          numero: number;
          cliente_nombre: string;
          cliente_telefono: string;
          total: number;
          estado: OrderStatus;
          created_at: string;
          order_items: { id: string }[] | null;
        }[]
      | null) ?? []
  ).map((o) => ({
    id: o.id,
    numero: o.numero,
    clienteNombre: o.cliente_nombre,
    clienteTelefono: o.cliente_telefono,
    total: Number(o.total),
    estado: o.estado,
    createdAt: new Date(o.created_at),
    _count: { items: o.order_items?.length ?? 0 },
  }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-foreground sm:text-3xl">Pedidos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} pedido{total === 1 ? "" : "s"}
          </p>
        </div>
        <Button className="gap-1.5" render={<Link href="/admin/pedidos/nuevo" />}>
          <Plus className="size-4" /> Nuevo pedido
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/pedidos"
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
            !estado
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground/80 hover:bg-muted"
          )}
        >
          Todos
        </Link>
        {ESTADOS.map((e) => (
          <Link
            key={e}
            href={`/admin/pedidos?estado=${e}`}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              estado === e
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground/80 hover:bg-muted"
            )}
          >
            {ORDER_STATUS_LABEL[e]}
          </Link>
        ))}
      </div>

      <SearchBox placeholder="Buscar por número o cliente..." />

      {orders.length === 0 ? (
        <EmptyState
          title="Sin pedidos"
          description="Crea tu primer pedido con el botón de arriba."
        />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead className="hidden md:table-cell">Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden sm:table-cell">Ítems</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link
                      href={`/admin/pedidos/${o.id}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      #{o.numero}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-sm whitespace-nowrap text-muted-foreground md:table-cell">
                    {formatFecha(o.createdAt)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-foreground">{o.clienteNombre}</span>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                    {o._count.items}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {formatCOP(Number(o.total))}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge estado={o.estado} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Escribir al cliente por WhatsApp"
                      render={
                        <a
                          href={buildWhatsAppUrl(
                            o.clienteTelefono,
                            `Hola ${o.clienteNombre}, te escribimos de glow by Lk sobre tu pedido #${o.numero}.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      }
                    >
                      <MessageCircle className="size-4 text-whatsapp" />
                    </Button>
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
