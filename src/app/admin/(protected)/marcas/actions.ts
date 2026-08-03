"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin/guard";
import { computeSwap } from "@/lib/admin/reorder";
import { uniqueSlug } from "@/lib/slug";
import { uploadImage, deleteImageByUrl } from "@/lib/storage";
import { taxonomySchema } from "@/lib/validations/taxonomy";

function revalidateBrands() {
  revalidatePath("/admin/marcas");
  revalidatePath("/");
  revalidatePath("/productos");
}

export async function createBrand(formData: FormData) {
  await requireAdminSession();
  const data = taxonomySchema.parse({
    nombre: formData.get("nombre"),
    slug: formData.get("slug"),
  });

  const slug = await uniqueSlug(data.slug || data.nombre, (s) =>
    prisma.brand.findUnique({ where: { slug: s } }).then(Boolean)
  );

  const imagenFile = formData.get("imagen");
  const imagen = imagenFile instanceof File ? await uploadImage(imagenFile, "brands") : null;

  const max = await prisma.brand.aggregate({ _max: { orden: true } });

  await prisma.brand.create({
    data: { nombre: data.nombre, slug, imagen, orden: (max._max.orden ?? 0) + 1 },
  });

  revalidateBrands();
}

export async function updateBrand(id: string, formData: FormData) {
  await requireAdminSession();
  const data = taxonomySchema.parse({
    nombre: formData.get("nombre"),
    slug: formData.get("slug"),
  });

  const existing = await prisma.brand.findUniqueOrThrow({ where: { id } });

  let slug = existing.slug;
  const desiredSlug = data.slug || data.nombre;
  const normalized = await uniqueSlug(desiredSlug, (s) =>
    prisma.brand.findFirst({ where: { slug: s, NOT: { id } } }).then(Boolean)
  );
  if (normalized !== existing.slug) slug = normalized;

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

  await prisma.brand.update({ where: { id }, data: { nombre: data.nombre, slug, imagen } });

  revalidateBrands();
}

export async function deleteBrand(id: string) {
  await requireAdminSession();
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) return;
  if (brand.imagen) await deleteImageByUrl(brand.imagen);
  await prisma.brand.delete({ where: { id } });
  revalidateBrands();
}

export async function moveBrand(id: string, direction: "up" | "down") {
  await requireAdminSession();
  const items = await prisma.brand.findMany({ orderBy: { orden: "asc" }, select: { id: true, orden: true } });
  const swap = computeSwap(items, id, direction);
  if (!swap) return;
  const [a, b] = swap;
  await prisma.$transaction([
    prisma.brand.update({ where: { id: a.id }, data: { orden: b.orden } }),
    prisma.brand.update({ where: { id: b.id }, data: { orden: a.orden } }),
  ]);
  revalidateBrands();
}
