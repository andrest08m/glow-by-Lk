"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin/guard";
import { registrarMovimiento, StockInsuficienteError } from "@/lib/inventory";
import { movementSchema } from "@/lib/validations/inventory";

export type ActionResult = { ok: true } | { ok: false; error: string };

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
