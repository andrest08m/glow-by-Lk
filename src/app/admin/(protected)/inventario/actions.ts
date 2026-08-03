"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin/guard";
import { registrarMovimiento, StockInsuficienteError } from "@/lib/inventory";
import { movementSchema } from "@/lib/validations/inventory";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createMovement(formData: FormData): Promise<ActionResult> {
  const session = await requireAdminSession();

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
    await prisma.$transaction((tx) =>
      registrarMovimiento(tx, {
        productId: parsed.data.productId,
        tipo: parsed.data.tipo,
        cantidad: parsed.data.cantidad,
        motivo: parsed.data.motivo || null,
        adminEmail: session.user.email,
      })
    );
  } catch (error) {
    if (error instanceof StockInsuficienteError) return { ok: false, error: error.message };
    if (error instanceof Error && error.message.includes("cantidad")) {
      return { ok: false, error: error.message };
    }
    console.error("createMovement:", error);
    return { ok: false, error: "No se pudo registrar el movimiento." };
  }

  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
    select: { slug: true },
  });

  revalidatePath("/admin/inventario");
  revalidatePath(`/admin/inventario/${parsed.data.productId}`);
  revalidatePath("/admin/productos");
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/productos");
  if (product) revalidatePath(`/producto/${product.slug}`);

  return { ok: true };
}
