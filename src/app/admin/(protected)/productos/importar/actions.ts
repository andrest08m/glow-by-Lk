"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/guard";
import { previewImport, applyImport, type ImportPreview } from "@/lib/admin/import-products";

const rowsSchema = z.array(z.record(z.string(), z.string())).min(1, "El archivo no tiene filas").max(2000, "Máximo 2000 filas por importación");

export type PreviewResult = { ok: true; preview: ImportPreview } | { ok: false; error: string };

export async function previewImportAction(input: unknown): Promise<PreviewResult> {
  await requireAdminSession();
  const parsed = rowsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Archivo inválido" };

  try {
    return { ok: true, preview: await previewImport(parsed.data) };
  } catch (error) {
    console.error("previewImportAction:", error);
    return { ok: false, error: "No se pudo analizar el archivo." };
  }
}

export type ApplyResult =
  | { ok: true; creados: number; actualizados: number; omitidos: number }
  | { ok: false; error: string };

export async function applyImportAction(input: unknown): Promise<ApplyResult> {
  await requireAdminSession();
  const parsed = rowsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Archivo inválido" };

  try {
    const result = await applyImport(parsed.data);

    revalidatePath("/admin/productos");
    revalidatePath("/admin/inventario");
    revalidatePath("/admin");
    revalidatePath("/", "layout");

    return { ok: true, ...result };
  } catch (error) {
    console.error("applyImportAction:", error);
    return { ok: false, error: "La importación falló y no se aplicó ningún cambio." };
  }
}
