import { prisma } from "@/lib/prisma";
import { ESTADOS_VENTA, bogotaStartOfDay, bogotaStartOfMonth, bogotaDayKey } from "@/lib/orders";

const DIAS_GRAFICO = 30;

export async function getDashboardData() {
  const hoy = bogotaStartOfDay();
  const mes = bogotaStartOfMonth();
  const hace7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const hace30 = new Date(hoy.getTime() - (DIAS_GRAFICO - 1) * 24 * 60 * 60 * 1000);

  const [
    ventasHoy,
    ventasMes,
    pedidosSemana,
    clientes,
    pocoStock,
    agotados,
    nuevos,
    ordenesVentana,
    topItems,
    pedidosRecientes,
    alertasStock,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { estado: { in: ESTADOS_VENTA }, createdAt: { gte: hoy } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { estado: { in: ESTADOS_VENTA }, createdAt: { gte: mes } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.count({ where: { createdAt: { gte: hace7 } } }),
    prisma.customer.count(),
    prisma.product.count({ where: { estado: "POCO_STOCK", activo: true } }),
    prisma.product.count({ where: { estado: "AGOTADO", activo: true } }),
    prisma.product.count({ where: { nuevo: true, activo: true } }),
    prisma.order.findMany({
      where: { estado: { in: ESTADOS_VENTA }, createdAt: { gte: hace30 } },
      select: { createdAt: true, total: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { order: { estado: { in: ESTADOS_VENTA } } },
      _sum: { cantidad: true },
      orderBy: { _sum: { cantidad: "desc" } },
      take: 6,
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { _count: { select: { items: true } } },
    }),
    prisma.product.findMany({
      where: { activo: true, estado: { in: ["POCO_STOCK", "AGOTADO"] } },
      orderBy: { cantidad: "asc" },
      take: 6,
      select: { id: true, nombre: true, cantidad: true, stockMinimo: true, estado: true },
    }),
  ]);

  // serie diaria completa (con ceros) para el gráfico de ventas
  const porDia = new Map<string, number>();
  for (let i = 0; i < DIAS_GRAFICO; i++) {
    porDia.set(bogotaDayKey(new Date(hace30.getTime() + i * 24 * 60 * 60 * 1000)), 0);
  }
  for (const o of ordenesVentana) {
    const key = bogotaDayKey(o.createdAt);
    if (porDia.has(key)) porDia.set(key, (porDia.get(key) ?? 0) + Number(o.total));
  }
  const ventasPorDia = Array.from(porDia.entries()).map(([fecha, total]) => ({ fecha, total }));

  const topProductos =
    topItems.length > 0
      ? await (async () => {
          const productos = await prisma.product.findMany({
            where: { id: { in: topItems.map((t) => t.productId) } },
            select: { id: true, nombre: true },
          });
          return topItems.map((t) => ({
            nombre: productos.find((p) => p.id === t.productId)?.nombre ?? "(eliminado)",
            unidades: t._sum.cantidad ?? 0,
          }));
        })()
      : [];

  return {
    ventasHoy: { total: Number(ventasHoy._sum.total ?? 0), pedidos: ventasHoy._count },
    ventasMes: { total: Number(ventasMes._sum.total ?? 0), pedidos: ventasMes._count },
    pedidosSemana,
    clientes,
    pocoStock,
    agotados,
    nuevos,
    ventasPorDia,
    topProductos,
    pedidosRecientes: pedidosRecientes.map((o) => ({
      id: o.id,
      numero: o.numero,
      clienteNombre: o.clienteNombre,
      total: Number(o.total),
      estado: o.estado,
      items: o._count.items,
      createdAt: o.createdAt,
    })),
    alertasStock,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
