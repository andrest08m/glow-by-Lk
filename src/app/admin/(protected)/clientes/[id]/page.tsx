import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageCircle, MapPin, ShoppingBag, Wallet, CalendarClock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/site/empty-state";
import { OrderStatusBadge } from "@/components/admin/orders/order-status-badge";
import { CustomerFormDialog } from "@/components/admin/customers/customer-form-dialog";
import { DeleteCustomerButton } from "@/components/admin/customers/delete-customer-button";
import { prisma } from "@/lib/prisma";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { formatCOP, formatFecha, formatFechaCorta } from "@/lib/format";
import { ESTADOS_VENTA } from "@/lib/orders";

export const metadata: Metadata = { title: "Cliente" };

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [customer, totales] = await Promise.all([
    prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { items: true } } },
        },
      },
    }),
    prisma.order.aggregate({
      where: { customerId: id, estado: { in: ESTADOS_VENTA } },
      _sum: { total: true },
      _count: true,
      _max: { createdAt: true },
    }),
  ]);

  if (!customer) notFound();

  const totalGastado = Number(totales._sum.total ?? 0);
  const compras = totales._count;
  const ultimaCompra = totales._max.createdAt;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href="/admin/clientes" />} aria-label="Volver">
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="font-heading text-2xl text-foreground sm:text-3xl">{customer.nombre}</h1>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-border/60 bg-card p-5 sm:p-6">
        <div className="space-y-2 text-sm">
          <p className="flex items-center gap-2 text-foreground">
            <MessageCircle className="size-4 text-whatsapp" /> {customer.whatsapp}
          </p>
          <p className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="size-4" /> {customer.direccion || "Sin dirección registrada"}
          </p>
          <p className="text-xs text-muted-foreground">
            Cliente desde {formatFechaCorta(customer.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="gap-1.5 rounded-full bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"
            render={
              <a
                href={buildWhatsAppUrl(customer.whatsapp, `Hola ${customer.nombre}, te escribimos de glow by Lk.`)}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <MessageCircle className="size-4" /> Escribir por WhatsApp
          </Button>
          <CustomerFormDialog mode="edit" customer={customer} />
          <DeleteCustomerButton
            id={customer.id}
            nombre={customer.nombre}
            pedidos={customer.orders.length}
            redirectTo="/admin/clientes"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Compras</span>
            <div className="flex size-9 items-center justify-center rounded-full bg-blush text-raspberry">
              <ShoppingBag className="size-4.5" />
            </div>
          </div>
          <p className="mt-3 font-heading text-3xl text-foreground">{compras}</p>
        </div>
        <div className="rounded-3xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total gastado</span>
            <div className="flex size-9 items-center justify-center rounded-full bg-blush text-raspberry">
              <Wallet className="size-4.5" />
            </div>
          </div>
          <p className="mt-3 font-heading text-3xl text-foreground">{formatCOP(totalGastado)}</p>
        </div>
        <div className="rounded-3xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Última compra</span>
            <div className="flex size-9 items-center justify-center rounded-full bg-blush text-raspberry">
              <CalendarClock className="size-4.5" />
            </div>
          </div>
          <p className="mt-3 font-heading text-xl text-foreground">
            {ultimaCompra ? formatFechaCorta(ultimaCompra) : "—"}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-heading text-lg text-foreground">Historial de pedidos</h2>
        {customer.orders.length === 0 ? (
          <EmptyState title="Sin pedidos" description="Cuando registres pedidos de este cliente aparecerán aquí." />
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="hidden sm:table-cell">Productos</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link
                        href={`/admin/pedidos/${o.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        #{o.numero}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                      {formatFecha(o.createdAt)}
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
