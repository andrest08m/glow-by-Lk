import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, OrderRow, OrderStatus } from "@/lib/supabase/database.types";
import { mapRpcError } from "@/lib/inventory";

export type CrearPedidoInput = {
  customerId?: string | null;
  nuevoCliente?: { nombre: string; whatsapp: string; direccion?: string | null } | null;
  items: { productId: string; cantidad: number }[];
};

/** Crea un pedido PENDIENTE (precios snapshot, total calculado) vía RPC. No toca stock. */
export async function crearPedido(
  supabase: SupabaseClient<Database>,
  input: CrearPedidoInput
): Promise<OrderRow> {
  const { data, error } = await supabase.rpc("crear_pedido", {
    p_customer_id: input.customerId ?? null,
    p_nuevo_cliente: input.nuevoCliente
      ? {
          nombre: input.nuevoCliente.nombre,
          whatsapp: input.nuevoCliente.whatsapp,
          direccion: input.nuevoCliente.direccion ?? "",
        }
      : null,
    p_items: input.items.map((i) => ({ product_id: i.productId, cantidad: i.cantidad })),
  });
  if (error) throw mapRpcError(error.message);
  return data as OrderRow;
}

/**
 * Cambia el estado de un pedido vía RPC atómica: al CONFIRMAR descuenta stock,
 * al CANCELAR (si estaba descontado) lo devuelve. Valida la transición server-side.
 */
export async function cambiarEstadoPedido(
  supabase: SupabaseClient<Database>,
  orderId: string,
  nuevoEstado: OrderStatus,
  adminEmail?: string | null
): Promise<OrderRow> {
  const { data, error } = await supabase.rpc("cambiar_estado_pedido", {
    p_order_id: orderId,
    p_nuevo_estado: nuevoEstado,
    p_admin_email: adminEmail ?? null,
  });
  if (error) throw mapRpcError(error.message);
  return data as OrderRow;
}
