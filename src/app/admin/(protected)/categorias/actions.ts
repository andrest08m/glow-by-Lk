"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin/guard";
import { computeSwap } from "@/lib/admin/reorder";
import { uniqueSlug } from "@/lib/slug";
import { uploadImage, deleteImageByUrl } from "@/lib/storage";
import { taxonomySchema } from "@/lib/validations/taxonomy";

type AdminDb = ReturnType<typeof createAdminClient>;

function revalidateCategories() {
  revalidatePath("/admin/categorias");
  revalidatePath("/");
  revalidatePath("/productos");
}

async function categorySlugExists(db: AdminDb, slug: string, exceptId?: string) {
  let q = db.from("categories").select("id").eq("slug", slug).limit(1);
  if (exceptId) q = q.neq("id", exceptId);
  const { data } = await q;
  return (data?.length ?? 0) > 0;
}

async function subSlugExists(db: AdminDb, categoryId: string, slug: string, exceptId?: string) {
  let q = db.from("subcategories").select("id").eq("category_id", categoryId).eq("slug", slug).limit(1);
  if (exceptId) q = q.neq("id", exceptId);
  const { data } = await q;
  return (data?.length ?? 0) > 0;
}

// ── Category ──

export async function createCategory(formData: FormData) {
  await requireAdminSession();
  const db = createAdminClient();
  const data = taxonomySchema.parse({ nombre: formData.get("nombre"), slug: formData.get("slug") });

  const slug = await uniqueSlug(data.slug || data.nombre, (s) => categorySlugExists(db, s));
  const imagenFile = formData.get("imagen");
  const imagen = imagenFile instanceof File ? await uploadImage(imagenFile, "categories") : null;

  const { data: max } = await db.from("categories").select("orden").order("orden", { ascending: false }).limit(1);
  const { error } = await db
    .from("categories")
    .insert({ nombre: data.nombre, slug, imagen, orden: (max?.[0]?.orden ?? 0) + 1 });
  if (error) throw new Error(error.message);
  revalidateCategories();
}

export async function updateCategory(id: string, formData: FormData) {
  await requireAdminSession();
  const db = createAdminClient();
  const data = taxonomySchema.parse({ nombre: formData.get("nombre"), slug: formData.get("slug") });

  const { data: existing } = await db.from("categories").select("slug,imagen").eq("id", id).single();
  if (!existing) throw new Error("La categoría no existe.");

  const slug = await uniqueSlug(data.slug || data.nombre, (s) => categorySlugExists(db, s, id));

  let imagen = existing.imagen;
  const imagenFile = formData.get("imagen");
  const removeImagen = formData.get("removeImagen") === "true";
  if (imagenFile instanceof File) {
    if (existing.imagen) await deleteImageByUrl(existing.imagen);
    imagen = await uploadImage(imagenFile, "categories");
  } else if (removeImagen) {
    if (existing.imagen) await deleteImageByUrl(existing.imagen);
    imagen = null;
  }

  const { error } = await db.from("categories").update({ nombre: data.nombre, slug, imagen }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateCategories();
  revalidatePath(`/admin/categorias/${id}`);
}

export async function deleteCategory(id: string) {
  await requireAdminSession();
  const db = createAdminClient();
  const { data: category } = await db.from("categories").select("imagen").eq("id", id).single();
  if (!category) return;
  if (category.imagen) await deleteImageByUrl(category.imagen);
  await db.from("categories").delete().eq("id", id);
  revalidateCategories();
}

export async function moveCategory(id: string, direction: "up" | "down") {
  await requireAdminSession();
  const db = createAdminClient();
  const { data: items } = await db.from("categories").select("id,orden").order("orden", { ascending: true });
  const swap = computeSwap(items ?? [], id, direction);
  if (!swap) return;
  const [a, b] = swap;
  await Promise.all([
    db.from("categories").update({ orden: b.orden }).eq("id", a.id),
    db.from("categories").update({ orden: a.orden }).eq("id", b.id),
  ]);
  revalidateCategories();
}

// ── Subcategory ──

export async function createSubcategory(categoryId: string, formData: FormData) {
  await requireAdminSession();
  const db = createAdminClient();
  const data = taxonomySchema.parse({ nombre: formData.get("nombre"), slug: formData.get("slug") });

  const slug = await uniqueSlug(data.slug || data.nombre, (s) => subSlugExists(db, categoryId, s));
  const { data: max } = await db
    .from("subcategories")
    .select("orden")
    .eq("category_id", categoryId)
    .order("orden", { ascending: false })
    .limit(1);
  const { error } = await db
    .from("subcategories")
    .insert({ nombre: data.nombre, slug, category_id: categoryId, orden: (max?.[0]?.orden ?? 0) + 1 });
  if (error) throw new Error(error.message);
  revalidateCategories();
  revalidatePath(`/admin/categorias/${categoryId}`);
}

export async function updateSubcategory(id: string, formData: FormData) {
  await requireAdminSession();
  const db = createAdminClient();
  const data = taxonomySchema.parse({ nombre: formData.get("nombre"), slug: formData.get("slug") });

  const { data: existing } = await db.from("subcategories").select("category_id,slug").eq("id", id).single();
  if (!existing) throw new Error("La subcategoría no existe.");

  const slug = await uniqueSlug(data.slug || data.nombre, (s) =>
    subSlugExists(db, existing.category_id, s, id)
  );
  const { error } = await db.from("subcategories").update({ nombre: data.nombre, slug }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateCategories();
  revalidatePath(`/admin/categorias/${existing.category_id}`);
}

export async function deleteSubcategory(id: string) {
  await requireAdminSession();
  const db = createAdminClient();
  const { data: sub } = await db.from("subcategories").select("category_id").eq("id", id).single();
  if (!sub) return;
  await db.from("subcategories").delete().eq("id", id);
  revalidateCategories();
  revalidatePath(`/admin/categorias/${sub.category_id}`);
}

export async function moveSubcategory(categoryId: string, id: string, direction: "up" | "down") {
  await requireAdminSession();
  const db = createAdminClient();
  const { data: items } = await db
    .from("subcategories")
    .select("id,orden")
    .eq("category_id", categoryId)
    .order("orden", { ascending: true });
  const swap = computeSwap(items ?? [], id, direction);
  if (!swap) return;
  const [a, b] = swap;
  await Promise.all([
    db.from("subcategories").update({ orden: b.orden }).eq("id", a.id),
    db.from("subcategories").update({ orden: a.orden }).eq("id", b.id),
  ]);
  revalidatePath(`/admin/categorias/${categoryId}`);
}
