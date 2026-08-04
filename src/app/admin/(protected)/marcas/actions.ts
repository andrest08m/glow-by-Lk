"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin/guard";
import { computeSwap } from "@/lib/admin/reorder";
import { uniqueSlug } from "@/lib/slug";
import { uploadImage, deleteImageByUrl } from "@/lib/storage";
import { taxonomySchema } from "@/lib/validations/taxonomy";

type AdminDb = ReturnType<typeof createAdminClient>;

function revalidateBrands() {
  revalidatePath("/admin/marcas");
  revalidatePath("/");
  revalidatePath("/productos");
}

async function slugExists(db: AdminDb, slug: string, exceptId?: string) {
  let q = db.from("brands").select("id").eq("slug", slug).limit(1);
  if (exceptId) q = q.neq("id", exceptId);
  const { data } = await q;
  return (data?.length ?? 0) > 0;
}

export async function createBrand(formData: FormData) {
  await requireAdminSession();
  const db = createAdminClient();
  const data = taxonomySchema.parse({ nombre: formData.get("nombre"), slug: formData.get("slug") });

  const slug = await uniqueSlug(data.slug || data.nombre, (s) => slugExists(db, s));
  const imagenFile = formData.get("imagen");
  const imagen = imagenFile instanceof File ? await uploadImage(imagenFile, "brands") : null;

  const { data: max } = await db.from("brands").select("orden").order("orden", { ascending: false }).limit(1);
  const orden = (max?.[0]?.orden ?? 0) + 1;

  const { error } = await db.from("brands").insert({ nombre: data.nombre, slug, imagen, orden });
  if (error) throw new Error(error.message);
  revalidateBrands();
}

export async function updateBrand(id: string, formData: FormData) {
  await requireAdminSession();
  const db = createAdminClient();
  const data = taxonomySchema.parse({ nombre: formData.get("nombre"), slug: formData.get("slug") });

  const { data: existing } = await db.from("brands").select("slug,imagen").eq("id", id).single();
  if (!existing) throw new Error("La marca no existe.");

  const slug = await uniqueSlug(data.slug || data.nombre, (s) => slugExists(db, s, id));

  let imagen = existing.imagen;
  const imagenFile = formData.get("imagen");
  const removeImagen = formData.get("removeImagen") === "true";
  if (imagenFile instanceof File) {
    if (existing.imagen) await deleteImageByUrl(existing.imagen);
    imagen = await uploadImage(imagenFile, "brands");
  } else if (removeImagen) {
    if (existing.imagen) await deleteImageByUrl(existing.imagen);
    imagen = null;
  }

  const { error } = await db.from("brands").update({ nombre: data.nombre, slug, imagen }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateBrands();
}

export async function deleteBrand(id: string) {
  await requireAdminSession();
  const db = createAdminClient();
  const { data: brand } = await db.from("brands").select("imagen").eq("id", id).single();
  if (!brand) return;
  if (brand.imagen) await deleteImageByUrl(brand.imagen);
  await db.from("brands").delete().eq("id", id);
  revalidateBrands();
}

export async function moveBrand(id: string, direction: "up" | "down") {
  await requireAdminSession();
  const db = createAdminClient();
  const { data: items } = await db.from("brands").select("id,orden").order("orden", { ascending: true });
  const swap = computeSwap(items ?? [], id, direction);
  if (!swap) return;
  const [a, b] = swap;
  await Promise.all([
    db.from("brands").update({ orden: b.orden }).eq("id", a.id),
    db.from("brands").update({ orden: a.orden }).eq("id", b.id),
  ]);
  revalidateBrands();
}
