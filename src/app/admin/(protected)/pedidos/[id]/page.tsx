import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, MessageCircle, User } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/admin/orders/order-status-badge";
import { OrderStatusActions } from "@/components/admin/orders/order-status-actions";
import { MovementTypeBadge } from "@/components/admin/inventory/movement-type-badge";
import { prisma } from "@/lib/prisma";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { formatCOP, formatFecha } from "@/lib/format";

export const metadata: Metadata = { title: "Pedido" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true } },
      items: {
        include: {
          product: {
            select: {
              id: true,
              nombre: true,
              slug: true,
              cantidad: true,
              images: { orderBy: { orden: "asc" }, take: 1, select: { url: true } },
            },
          },
        },
      },
      movements: { orderBy: { fecha: "asc" } },
    },
  });

  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" render={<Link href="/admin/pedidos" />} aria-label="Volver">
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-2xl text-foreground sm:text-3xl">
                Pedido #{order.numero}
              </h1>
              <OrderStatusBadge estado={order.estado} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Creado el {formatFecha(order.createdAt)}
            </p>
          </div>
        </div>
        <OrderStatusActions
          orderId={order.id}
          estado={order.estado}
          stockDescontado={order.stockDescontado}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border/60 bg-card p-5">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <User className="size-4 text-muted-foreground" /> {order.clienteNombre}
          </p>
          <p className="text-sm text-muted-foreground">{order.clienteTelefono}</p>
        </div>
        <div className="flex items-center gap-2">
          {order.customer && (
            <Button variant="outline" size="sm" render={<Link href={`/admin/clientes/${order.customer.id}`} />}>
              Ver ficha del cliente
            </Button>
          )}
          <Button
            size="sm"
            className="gap-1.5 rounded-full bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"
            render={
              <a
                href={buildWhatsAppUrl(
                  order.clienteTelefono,
                  `Hola ${order.clienteNombre}, te escribimos de glow by Lk sobre tu pedido #${order.numero}.`
                )}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <MessageCircle className="size-4" /> WhatsApp
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14" />
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Precio unit.</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="relative size-10 overflow-hidden rounded-xl bg-blush">
                    {item.product.images[0] && (
                      <Image
                        src={item.product.images[0].url}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/productos/${item.product.id}`}
                    className="font-medium text-foreground hover:text-primary"
                  >
                    {item.product.nombre}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Stock actual: {item.product.cantidad}
                  </p>
                </TableCell>
                <TableCell className="text-right tabular-nums text-foreground">
                  {item.cantidad}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
                  {formatCOP(Number(item.precioUnitario))}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums text-foreground">
                  {formatCOP(Number(item.precioUnitario) * item.cantidad)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={3} className="sm:hidden" />
              <TableCell colSpan={4} className="hidden text-right font-heading text-base sm:table-cell">
                Total
              </TableCell>
              <TableCell className="text-right font-heading text-xl text-primary">
                {formatCOP(Number(order.total))}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {order.movements.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-heading text-lg text-foreground">Movimientos de inventario</h2>
          <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="hidden sm:table-cell">Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                      {formatFecha(m.fecha)}
                    </TableCell>
                    <TableCell>
                      <MovementTypeBadge tipo={m.tipo} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                      {m.motivo}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
