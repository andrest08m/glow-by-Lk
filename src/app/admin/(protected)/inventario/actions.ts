"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin/guard";
import { registrarMovimiento, StockInsuficienteError } from "@/lib/inventory";
import { computeEstado } from "@/lib/product-status";
import { movementSchema } from "@/lib/validations/inventory";

export type ActionResult = { ok: true } | { ok: false; error: string };

function revalidateInventory(productId: string, slug?: string) {
  revalidatePath("/admin/inventario");
  revalidatePath(`/admin/inventario/${productId}`);
  revalidatePath("/admin/movimientos");
  revalidatePath("/admin/productos");
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/productos");
  if (slug) revalidatePath(`/producto/${slug}`);
}

/**
 * Elimina un movimiento del kardex y recalcula el stock y los saldos del
 * producto a partir de los movimientos restantes (el kardex es la fuente de
 * verdad: stock = suma de los movimientos). Sirve para corregir entradas de
 * prueba o equivocadas.
 */
export async function deleteMovement(id: string): Promise<ActionResult> {
  await requireAdminSession();
  const db = createAdminClient();

  const { data: mov } = await db
    .from("inventory_movements")
    .select("product_id")
    .eq("id", id)
    .single();
  if (!mov) return { ok: true };

  const productId = mov.product_id as string;
  await db.from("inventory_movements").delete().eq("id", id);

  // recalcular saldos de los movimientos restantes (por fecha) y el stock final
  const { data: rest } = await db
    .from("inventory_movements")
    .select("id,cantidad,fecha")
    .eq("product_id", productId)
    .order("fecha", { ascending: true });

  let saldo = 0;
  for (const m of rest ?? []) {
    saldo += m.cantidad;
    await db.from("inventory_movements").update({ saldo_resultante: saldo }).eq("id", m.id);
  }

  const { data: product } = await db
    .from("products")
    .select("stock_minimo,slug")
    .eq("id", productId)
    .single();

  await db
    .from("products")
    .update({
      cantidad: saldo,
      estado: computeEstado(saldo, product?.stock_minimo ?? 0),
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  revalidateInventory(productId, product?.slug);
  return { ok: true };
}

export async function createMovement(formData: FormData): Promise<ActionResult> {
  const { email } = await requireAdminSession();
  const db = createAdminClient();

  const parsed = movementSchema.safeParse({
    productId: formData.get("productId"),
    tipo: formData.get("tipo"),
    cantidad: formData.get("cantidad"),
    motivo: formData.get("motivo"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  try {
    await registrarMovimiento(db, {
      productId: parsed.data.productId,
      tipo: parsed.data.tipo,
      cantidad: parsed.data.cantidad,
      motivo: parsed.data.motivo || null,
      adminEmail: email,
    });
  } catch (error) {
    if (error instanceof StockInsuficienteError) return { ok: false, error: error.message };
    console.error("createMovement:", error);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo registrar el movimiento." };
  }

  const { data: product } = await db
    .from("products")
    .select("slug")
    .eq("id", parsed.data.productId)
    .single();

  revalidatePath("/admin/inventario");
  revalidatePath(`/admin/inventario/${parsed.data.productId}`);
  revalidatePath("/admin/productos");
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/productos");
  if (product) revalidatePath(`/producto/${product.slug}`);

  return { ok: true };
}
