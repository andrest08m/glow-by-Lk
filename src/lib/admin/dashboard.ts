import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ESTADOS_VENTA, bogotaStartOfMonth } from "@/lib/orders";
import type { OrderStatus, ProductStatus } from "@/lib/supabase/database.types";

export async function getDashboardData() {
  const supabase = createAdminClient();

  const [metricasRes, ventasRes, topRes, pedidosRes, alertasRes, gananciaRes] = await Promise.all([
    supabase.rpc("dashboard_metricas"),
    supabase.rpc("ventas_por_dia", { p_dias: 30 }),
    supabase.rpc("top_productos", { p_limite: 6 }),
    supabase
      .from("orders")
      .select("id,numero,cliente_nombre,total,estado,created_at,items:order_items(id)")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("products")
      .select("id,nombre,cantidad,stock_minimo,estado")
      .eq("activo", true)
      .in("estado", ["POCO_STOCK", "AGOTADO"])
      .order("cantidad", { ascending: true })
      .limit(6),
    // ganancia = precio de venta - costo, sobre pedidos que cuentan como venta
    supabase
      .from("orders")
      .select("created_at,items:order_items(cantidad,precio_unitario,product:products(costo))")
      .in("estado", ESTADOS_VENTA),
  ]);

  const m = (metricasRes.data ?? {}) as Record<string, number>;

  // Ganancia neta (total y del mes) calculada en el server
  const inicioMes = bogotaStartOfMonth().toISOString();
  let gananciaTotal = 0;
  let gananciaMes = 0;
  for (const o of (gananciaRes.data as
    | {
        created_at: string;
        items: { cantidad: number; precio_unitario: number; product: { costo: number | null } | null }[] | null;
      }[]
    | null) ?? []) {
    let g = 0;
    for (const it of o.items ?? []) {
      const costo = Number(it.product?.costo ?? 0);
      g += (Number(it.precio_unitario) - costo) * it.cantidad;
    }
    gananciaTotal += g;
    if (o.created_at >= inicioMes) gananciaMes += g;
  }

  const ventasPorDia = ((ventasRes.data as { fecha: string; total: number }[] | null) ?? []).map(
    (r) => ({ fecha: r.fecha, total: Number(r.total) })
  );

  const topProductos = (
    (topRes.data as { product_id: string; nombre: string; unidades: number }[] | null) ?? []
  ).map((r) => ({ nombre: r.nombre, unidades: Number(r.unidades) }));

  const pedidosRecientes = (
    (pedidosRes.data as
      | {
          id: string;
          numero: number;
          cliente_nombre: string;
          total: number;
          estado: OrderStatus;
          created_at: string;
          items: { id: string }[] | null;
        }[]
      | null) ?? []
  ).map((o) => ({
    id: o.id,
    numero: o.numero,
    clienteNombre: o.cliente_nombre,
    total: Number(o.total),
    estado: o.estado,
    items: o.items?.length ?? 0,
    createdAt: new Date(o.created_at),
  }));

  const alertasStock = (
    (alertasRes.data as
      | { id: string; nombre: string; cantidad: number; stock_minimo: number; estado: ProductStatus }[]
      | null) ?? []
  ).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    cantidad: p.cantidad,
    stockMinimo: p.stock_minimo,
    estado: p.estado,
  }));

  return {
    ventasHoy: { total: Number(m.ventas_hoy_total ?? 0), pedidos: Number(m.ventas_hoy_pedidos ?? 0) },
    ventasMes: { total: Number(m.ventas_mes_total ?? 0), pedidos: Number(m.ventas_mes_pedidos ?? 0) },
    gananciaMes,
    gananciaTotal,
    pedidosSemana: Number(m.pedidos_semana ?? 0),
    clientes: Number(m.clientes ?? 0),
    pocoStock: Number(m.poco_stock ?? 0),
    agotados: Number(m.agotados ?? 0),
    nuevos: Number(m.nuevos ?? 0),
    ventasPorDia,
    topProductos,
    pedidosRecientes,
    alertasStock,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
