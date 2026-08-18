"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin/guard";
import { crearPedido, cambiarEstadoPedido } from "@/lib/order-service";
import { mapRpcError } from "@/lib/inventory";
import { createOrderSchema } from "@/lib/validations/order";
import type { OrderStatus } from "@/lib/supabase/database.types";

export type OrderActionResult = { ok: true; id?: string } | { ok: false; error: string };

type AdminDb = ReturnType<typeof createAdminClient>;

async function revalidateOrderPages(db: AdminDb, orderId: string, customerId?: string | null, productIds?: string[]) {
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/inventario");
  revalidatePath("/admin/productos");
  if (customerId) revalidatePath(`/admin/clientes/${customerId}`);
  revalidatePath("/admin/clientes");

  if (productIds?.length) {
    for (const pid of productIds) revalidatePath(`/admin/inventario/${pid}`);
    const { data: slugs } = await db.from("products").select("slug").in("id", productIds);
    revalidatePath("/");
    revalidatePath("/productos");
    for (const { slug } of slugs ?? []) revalidatePath(`/producto/${slug}`);
  }
}

export async function createOrderAction(input: unknown): Promise<OrderActionResult> {
  await requireAdminSession();
  const db = createAdminClient();

  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  try {
    const order = await crearPedido(db, parsed.data);
    await revalidateOrderPages(db, order.id, order.customer_id);
    return { ok: true, id: order.id };
  } catch (error) {
    console.error("createOrderAction:", error);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo crear el pedido." };
  }
}

export async function changeOrderStatusAction(
  orderId: string,
  nuevoEstado: OrderStatus
): Promise<OrderActionResult> {
  const { email } = await requireAdminSession();
  const db = createAdminClient();

  try {
    const order = await cambiarEstadoPedido(db, orderId, nuevoEstado, email);
    const { data: items } = await db.from("order_items").select("product_id").eq("order_id", orderId);
    await revalidateOrderPages(
      db,
      orderId,
      order.customer_id,
      (items ?? []).map((i) => i.product_id)
    );
    return { ok: true, id: orderId };
  } catch (error) {
    console.error("changeOrderStatusAction:", error);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo cambiar el estado." };
  }
}

export async function editOrderItemsAction(
  orderId: string,
  items: { productId: string; cantidad: number }[]
): Promise<OrderActionResult> {
  const { email } = await requireAdminSession();
  const db = createAdminClient();

  if (items.length === 0) return { ok: false, error: "El pedido debe tener al menos un producto." };
  const ids = items.map((i) => i.productId);
  if (new Set(ids).size !== ids.length) {
    return { ok: false, error: "Hay productos repetidos: usá una sola línea por producto." };
  }

  try {
    const { data: order, error } = await db.rpc("editar_pedido_items", {
      p_order_id: orderId,
      p_items: items.map((i) => ({ product_id: i.productId, cantidad: i.cantidad })),
      p_admin_email: email,
    });
    if (error) throw mapRpcError(error.message);

    await revalidateOrderPages(db, orderId, (order as { customer_id: string | null }).customer_id, ids);
    return { ok: true, id: orderId };
  } catch (error) {
    console.error("editOrderItemsAction:", error);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo editar el pedido." };
  }
}

export async function deleteOrderAction(orderId: string): Promise<OrderActionResult> {
  const { email } = await requireAdminSession();
  const db = createAdminClient();

  try {
    // ids de productos antes de borrar, para revalidar catálogo/inventario
    const { data: items } = await db.from("order_items").select("product_id").eq("order_id", orderId);
    const { data: order } = await db.from("orders").select("customer_id").eq("id", orderId).single();

    const { error } = await db.rpc("eliminar_pedido", { p_order_id: orderId, p_admin_email: email });
    if (error) throw new Error(error.message);

    await revalidateOrderPages(db, orderId, order?.customer_id, (items ?? []).map((i) => i.product_id));
    return { ok: true };
  } catch (error) {
    console.error("deleteOrderAction:", error);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo eliminar el pedido." };
  }
}
