"use server";

import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin/guard";
import { StockInsuficienteError } from "@/lib/inventory";
import { crearPedido, cambiarEstadoPedido, TransicionInvalidaError } from "@/lib/order-service";
import { createOrderSchema } from "@/lib/validations/order";

export type OrderActionResult = { ok: true; id?: string } | { ok: false; error: string };

async function revalidateOrderPages(orderId: string, customerId?: string | null, productIds?: string[]) {
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/inventario");
  revalidatePath("/admin/productos");
  if (customerId) revalidatePath(`/admin/clientes/${customerId}`);
  revalidatePath("/admin/clientes");

  if (productIds?.length) {
    for (const pid of productIds) revalidatePath(`/admin/inventario/${pid}`);
    const slugs = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { slug: true },
    });
    revalidatePath("/");
    revalidatePath("/productos");
    for (const { slug } of slugs) revalidatePath(`/producto/${slug}`);
  }
}

export async function createOrderAction(input: unknown): Promise<OrderActionResult> {
  await requireAdminSession();

  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  try {
    const order = await crearPedido(prisma, parsed.data);
    await revalidateOrderPages(order.id, order.customerId);
    return { ok: true, id: order.id };
  } catch (error) {
    if (error instanceof Error && error.message.includes("cliente")) {
      return { ok: false, error: error.message };
    }
    console.error("createOrderAction:", error);
    return { ok: false, error: "No se pudo crear el pedido." };
  }
}

export async function changeOrderStatusAction(
  orderId: string,
  nuevoEstado: OrderStatus
): Promise<OrderActionResult> {
  const session = await requireAdminSession();

  try {
    const order = await cambiarEstadoPedido(prisma, orderId, nuevoEstado, session.user.email);
    const items = await prisma.orderItem.findMany({
      where: { orderId },
      select: { productId: true },
    });
    await revalidateOrderPages(
      orderId,
      order.customerId,
      items.map((i) => i.productId)
    );
    return { ok: true, id: orderId };
  } catch (error) {
    if (error instanceof StockInsuficienteError || error instanceof TransicionInvalidaError) {
      return { ok: false, error: error.message };
    }
    console.error("changeOrderStatusAction:", error);
    return { ok: false, error: "No se pudo cambiar el estado del pedido." };
  }
}
