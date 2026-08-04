import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MovementType } from "@/lib/supabase/database.types";

export class StockInsuficienteError extends Error {
  constructor(
    public productoNombre: string,
    public disponible: number,
    public solicitado: number
  ) {
    super(
      `Stock insuficiente de "${productoNombre}": quedan ${disponible} y se pidieron ${solicitado}.`
    );
    this.name = "StockInsuficienteError";
  }
}

/** Traduce el mensaje de error de las funciones RPC a un Error tipado y legible. */
export function mapRpcError(message: string | undefined): Error {
  const msg = message ?? "Error desconocido";
  if (msg.includes("STOCK_INSUFICIENTE")) {
    // formato: STOCK_INSUFICIENTE|<nombre>|<disponible>|<solicitado>
    const raw = msg.slice(msg.indexOf("STOCK_INSUFICIENTE"));
    const [, nombre, disp, sol] = raw.split("|");
    return new StockInsuficienteError(nombre ?? "producto", Number(disp) || 0, Number(sol) || 0);
  }
  if (msg.includes("TRANSICION_INVALIDA")) {
    return new Error("Esa transición de estado no está permitida para este pedido.");
  }
  if (msg.includes("CANTIDAD_INVALIDA")) return new Error("La cantidad no es válida.");
  if (msg.includes("PRODUCTO_NO_EXISTE")) return new Error("El producto ya no existe.");
  if (msg.includes("CLIENTE_NO_EXISTE")) return new Error("El cliente no existe.");
  if (msg.includes("SIN_CLIENTE")) return new Error("Elige un cliente o crea uno nuevo.");
  return new Error(msg);
}

export type MovimientoInput = {
  productId: string;
  tipo: MovementType;
  /** ENTRADA/SALIDA: unidades (>0). AJUSTE: cantidad final tras conteo. */
  cantidad: number;
  motivo?: string | null;
  adminEmail?: string | null;
  orderId?: string | null;
};

/** Registra un movimiento vía la función RPC atómica registrar_movimiento. */
export async function registrarMovimiento(
  supabase: SupabaseClient<Database>,
  input: MovimientoInput
) {
  const { error, data } = await supabase.rpc("registrar_movimiento", {
    p_product_id: input.productId,
    p_tipo: input.tipo,
    p_cantidad: input.cantidad,
    p_motivo: input.motivo ?? null,
    p_admin_email: input.adminEmail ?? null,
    p_order_id: input.orderId ?? null,
  });
  if (error) throw mapRpcError(error.message);
  return data;
}
