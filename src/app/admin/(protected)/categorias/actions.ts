"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin/guard";
import { computeSwap } from "@/lib/admin/reorder";
import { uniqueSlug } from "@/lib/slug";
import { uploadImage, deleteImageByUrl } from "@/lib/storage";
import { taxonomySchema } from "@/lib/validations/taxonomy";

function revalidateCategories() {
  revalidatePath("/admin/categorias");
  revalidatePath("/");
  revalidatePath("/productos");
}

// ---------- Category ----------

export async function createCategory(formData: FormData) {
  await requireAdminSession();
  const data = taxonomySchema.parse({ nombre: formData.get("nombre"), slug: formData.get("slug") });

  const slug = await uniqueSlug(data.slug || data.nombre, (s) =>
    prisma.category.findUnique({ where: { slug: s } }).then(Boolean)
  );

  const imagenFile = formData.get("imagen");
  const imagen = imagenFile instanceof File ? await uploadImage(imagenFile, "categories") : null;

  const max = await prisma.category.aggregate({ _max: { orden: true } });

  await prisma.category.create({
    data: { nombre: data.nombre, slug, imagen, orden: (max._max.orden ?? 0) + 1 },
  });

  revalidateCategories();
}

export async function updateCategory(id: string, formData: FormData) {
  await requireAdminSession();
  const data = taxonomySchema.parse({ nombre: formData.get("nombre"), slug: formData.get("slug") });

  const existing = await prisma.category.findUniqueOrThrow({ where: { id } });

  let slug = existing.slug;
  const desiredSlug = data.slug || data.nombre;
  const normalized = await uniqueSlug(desiredSlug, (s) =>
    prisma.category.findFirst({ where: { slug: s, NOT: { id } } }).then(Boolean)
  );
  if (normalized !== existing.slug) slug = normalized;

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

  await prisma.category.update({ where: { id }, data: { nombre: data.nombre, slug, imagen } });

  revalidateCategories();
  revalidatePath(`/admin/categorias/${id}`);
}

export async function deleteCategory(id: string) {
  await requireAdminSession();
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) return;
  if (category.imagen) await deleteImageByUrl(category.imagen);
  await prisma.category.delete({ where: { id } });
  revalidateCategories();
}

export async function moveCategory(id: string, direction: "up" | "down") {
  await requireAdminSession();
  const items = await prisma.category.findMany({
    orderBy: { orden: "asc" },
    select: { id: true, orden: true },
  });
  const swap = computeSwap(items, id, direction);
  if (!swap) return;
  const [a, b] = swap;
  await prisma.$transaction([
    prisma.category.update({ where: { id: a.id }, data: { orden: b.orden } }),
    prisma.category.update({ where: { id: b.id }, data: { orden: a.orden } }),
  ]);
  revalidateCategories();
}

// ---------- Subcategory ----------

export async function createSubcategory(categoryId: string, formData: FormData) {
  await requireAdminSession();
  const data = taxonomySchema.parse({ nombre: formData.get("nombre"), slug: formData.get("slug") });

  const slug = await uniqueSlug(data.slug || data.nombre, (s) =>
    prisma.subcategory.findFirst({ where: { categoryId, slug: s } }).then(Boolean)
  );

  const max = await prisma.subcategory.aggregate({ where: { categoryId }, _max: { orden: true } });

  await prisma.subcategory.create({
    data: { nombre: data.nombre, slug, categoryId, orden: (max._max.orden ?? 0) + 1 },
  });

  revalidateCategories();
  revalidatePath(`/admin/categorias/${categoryId}`);
}

export async function updateSubcategory(id: string, formData: FormData) {
  await requireAdminSession();
  const data = taxonomySchema.parse({ nombre: formData.get("nombre"), slug: formData.get("slug") });

  const existing = await prisma.subcategory.findUniqueOrThrow({ where: { id } });

  let slug = existing.slug;
  const desiredSlug = data.slug || data.nombre;
  const normalized = await uniqueSlug(desiredSlug, (s) =>
    prisma.subcategory
      .findFirst({ where: { categoryId: existing.categoryId, slug: s, NOT: { id } } })
      .then(Boolean)
  );
  if (normalized !== existing.slug) slug = normalized;

  await prisma.subcategory.update({ where: { id }, data: { nombre: data.nombre, slug } });

  revalidateCategories();
  revalidatePath(`/admin/categorias/${existing.categoryId}`);
}

export async function deleteSubcategory(id: string) {
  await requireAdminSession();
  const sub = await prisma.subcategory.findUnique({ where: { id } });
  if (!sub) return;
  await prisma.subcategory.delete({ where: { id } });
  revalidateCategories();
  revalidatePath(`/admin/categorias/${sub.categoryId}`);
}

export async function moveSubcategory(categoryId: string, id: string, direction: "up" | "down") {
  await requireAdminSession();
  const items = await prisma.subcategory.findMany({
    where: { categoryId },
    orderBy: { orden: "asc" },
    select: { id: true, orden: true },
  });
  const swap = computeSwap(items, id, direction);
  if (!swap) return;
  const [a, b] = swap;
  await prisma.$transaction([
    prisma.subcategory.update({ where: { id: a.id }, data: { orden: b.orden } }),
    prisma.subcategory.update({ where: { id: b.id }, data: { orden: a.orden } }),
  ]);
  revalidatePath(`/admin/categorias/${categoryId}`);
}
