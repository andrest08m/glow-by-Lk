import Link from "next/link";
import type { Metadata } from "next";
import {
  Wallet,
  CalendarDays,
  ShoppingBag,
  Users,
  AlertTriangle,
  PackageX,
  Sparkles,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/admin/stat-card";
import { EstadoBadge } from "@/components/product/estado-badge";
import { OrderStatusBadge } from "@/components/admin/orders/order-status-badge";
import { EmptyState } from "@/components/site/empty-state";
import { SalesChart } from "@/components/admin/dashboard/sales-chart";
import { TopProductsChart } from "@/components/admin/dashboard/top-products-chart";
import { getDashboardData } from "@/lib/admin/dashboard";
import { formatCOP, formatFecha } from "@/lib/format";

export const metadata: Metadata = { title: "Resumen" };

export default async function AdminDashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl text-foreground sm:text-3xl">Resumen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ventas, pedidos y estado del inventario de un vistazo.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-3xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Ventas de hoy</span>
            <div className="flex size-9 items-center justify-center rounded-full bg-blush text-raspberry">
              <Wallet className="size-4.5" />
            </div>
          </div>
          <p className="mt-3 font-heading text-2xl text-foreground sm:text-3xl">
            {formatCOP(data.ventasHoy.total)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {data.ventasHoy.pedidos} pedido{data.ventasHoy.pedidos === 1 ? "" : "s"} confirmados
          </p>
        </div>
        <div className="rounded-3xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Ventas del mes</span>
            <div className="flex size-9 items-center justify-center rounded-full bg-blush text-raspberry">
              <CalendarDays className="size-4.5" />
            </div>
          </div>
          <p className="mt-3 font-heading text-2xl text-foreground sm:text-3xl">
            {formatCOP(data.ventasMes.total)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {data.ventasMes.pedidos} pedido{data.ventasMes.pedidos === 1 ? "" : "s"} confirmados
          </p>
        </div>
        <StatCard label="Pedidos (7 días)" value={data.pedidosSemana} icon={ShoppingBag} />
        <StatCard label="Clientes" value={data.clientes} icon={Users} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Poco stock" value={data.pocoStock} icon={AlertTriangle} tone="warning" />
        <StatCard label="Agotados" value={data.agotados} icon={PackageX} tone="danger" />
        <StatCard label="Nuevos" value={data.nuevos} icon={Sparkles} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-3xl border border-border/60 bg-card p-5 sm:p-6 lg:col-span-3">
          <div className="mb-4">
            <h2 className="font-heading text-lg text-foreground">Ventas por día</h2>
            <p className="text-xs text-muted-foreground">Últimos 30 días · pedidos confirmados o más</p>
          </div>
          <SalesChart data={data.ventasPorDia} />
        </div>

        <div className="rounded-3xl border border-border/60 bg-card p-5 sm:p-6 lg:col-span-2">
          <div className="mb-4">
            <h2 className="font-heading text-lg text-foreground">Más vendidos</h2>
            <p className="text-xs text-muted-foreground">Unidades en pedidos confirmados o más</p>
          </div>
          {data.topProductos.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aún no hay ventas confirmadas.
            </p>
          ) : (
            <TopProductsChart data={data.topProductos} />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="rounded-3xl border border-border/60 bg-card p-5 sm:p-6 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg text-foreground">Pedidos recientes</h2>
            <Link href="/admin/pedidos" className="text-sm font-medium text-primary hover:underline">
              Ver todos
            </Link>
          </div>
          {data.pedidosRecientes.length === 0 ? (
            <EmptyState title="Sin pedidos" description="Crea el primero desde Pedidos." className="py-10" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.pedidosRecientes.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <Link href={`/admin/pedidos/${o.id}`} className="font-medium text-foreground hover:text-primary">
                          #{o.numero}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden text-xs whitespace-nowrap text-muted-foreground sm:table-cell">
                        {formatFecha(o.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{o.clienteNombre}</TableCell>
                      <TableCell className="text-sm font-medium text-foreground">
                        {formatCOP(o.total)}
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

        <div className="rounded-3xl border border-border/60 bg-card p-5 sm:p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg text-foreground">Necesitan atención</h2>
            <Link href="/admin/inventario" className="text-sm font-medium text-primary hover:underline">
              Inventario
            </Link>
          </div>
          {data.alertasStock.length === 0 ? (
            <EmptyState title="Todo en orden" description="Sin productos en alerta." className="py-10" />
          ) : (
            <ul className="divide-y divide-border/60">
              {data.alertasStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <Link
                      href={`/admin/inventario/${p.id}`}
                      className="text-sm font-medium text-foreground hover:text-primary"
                    >
                      {p.nombre}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {p.cantidad} unidades · mínimo {p.stockMinimo}
                    </p>
                  </div>
                  <EstadoBadge estado={p.estado} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
