"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin/guard";
import { computeEstado } from "@/lib/product-status";
import { toSlug, uniqueSlug } from "@/lib/slug";
import { uploadImage, deleteImageByUrl } from "@/lib/storage";
import { productSchema, imageManifestSchema } from "@/lib/validations/product";

function parseProductFormData(formData: FormData) {
  return productSchema.parse({
    nombre: formData.get("nombre"),
    slug: formData.get("slug"),
    codigoInterno: formData.get("codigoInterno"),
    sku: formData.get("sku"),
    descripcionCorta: formData.get("descripcionCorta"),
    descripcionLarga: formData.get("descripcionLarga"),
    precio: formData.get("precio"),
    precioOferta: formData.get("precioOferta"),
    costo: formData.get("costo"),
    cantidad: formData.get("cantidad"),
    stockMinimo: formData.get("stockMinimo"),
    destacado: formData.get("destacado") === "true",
    nuevo: formData.get("nuevo") === "true",
    masVendido: formData.get("masVendido") === "true",
    activo: formData.get("activo") === "true",
    brandId: formData.get("brandId"),
    categoryId: formData.get("categoryId"),
    subcategoryId: formData.get("subcategoryId"),
  });
}

async function applyImageManifest(productId: string, slug: string, formData: FormData) {
  const manifestRaw = formData.get("imageManifest");
  if (!manifestRaw) return;

  const manifest = imageManifestSchema.parse(JSON.parse(String(manifestRaw)));

  const keepIds = manifest.filter((e) => e.kind === "existing").map((e) => e.id);
  const toRemove = await prisma.productImage.findMany({
    where: { productId, id: { notIn: keepIds.length > 0 ? keepIds : ["__none__"] } },
  });

  await Promise.all(toRemove.map((img) => deleteImageByUrl(img.url)));
  if (toRemove.length > 0) {
    await prisma.productImage.deleteMany({ where: { id: { in: toRemove.map((i) => i.id) } } });
  }

  for (const entry of manifest) {
    if (entry.kind === "existing") {
      await prisma.productImage.update({ where: { id: entry.id }, data: { orden: entry.orden } });
    } else {
      const file = formData.get(entry.tempId);
      if (!(file instanceof File)) continue;
      const url = await uploadImage(file, slug);
      await prisma.productImage.create({ data: { productId, url, orden: entry.orden } });
    }
  }
}

function revalidateCatalog(slug?: string) {
  revalidatePath("/admin/productos");
  revalidatePath("/");
  revalidatePath("/productos");
  if (slug) revalidatePath(`/producto/${slug}`);
}

export async function createProduct(formData: FormData) {
  await requireAdminSession();
  const data = parseProductFormData(formData);

  const slug = await uniqueSlug(data.slug || data.nombre, (s) =>
    prisma.product.findUnique({ where: { slug: s } }).then(Boolean)
  );

  const product = await prisma.product.create({
    data: {
      nombre: data.nombre,
      slug,
      codigoInterno: data.codigoInterno || null,
      sku: data.sku || null,
      descripcionCorta: data.descripcionCorta || null,
      descripcionLarga: data.descripcionLarga || null,
      precio: data.precio,
      precioOferta: data.precioOferta ?? null,
      costo: data.costo ?? null,
      cantidad: data.cantidad,
      stockMinimo: data.stockMinimo,
      estado: computeEstado(data.cantidad, data.stockMinimo),
      destacado: data.destacado,
      nuevo: data.nuevo,
      masVendido: data.masVendido,
      activo: data.activo,
      brandId: data.brandId || null,
      categoryId: data.categoryId || null,
      subcategoryId: data.subcategoryId || null,
    },
  });

  await applyImageManifest(product.id, product.slug, formData);
  revalidateCatalog(product.slug);

  return { id: product.id };
}

export async function updateProduct(id: string, formData: FormData) {
  await requireAdminSession();
  const data = parseProductFormData(formData);

  const existing = await prisma.product.findUniqueOrThrow({ where: { id } });

  let slug = existing.slug;
  const desiredSlug = data.slug || data.nombre;
  if (toSlug(desiredSlug) !== existing.slug) {
    slug = await uniqueSlug(desiredSlug, (s) =>
      prisma.product.findFirst({ where: { slug: s, NOT: { id } } }).then(Boolean)
    );
  }

  await prisma.product.update({
    where: { id },
    data: {
      nombre: data.nombre,
      slug,
      codigoInterno: data.codigoInterno || null,
      sku: data.sku || null,
      descripcionCorta: data.descripcionCorta || null,
      descripcionLarga: data.descripcionLarga || null,
      precio: data.precio,
      precioOferta: data.precioOferta ?? null,
      costo: data.costo ?? null,
      cantidad: data.cantidad,
      stockMinimo: data.stockMinimo,
      estado: computeEstado(data.cantidad, data.stockMinimo),
      destacado: data.destacado,
      nuevo: data.nuevo,
      masVendido: data.masVendido,
      activo: data.activo,
      brandId: data.brandId || null,
      categoryId: data.categoryId || null,
      subcategoryId: data.subcategoryId || null,
    },
  });

  await applyImageManifest(id, slug, formData);
  revalidateCatalog(slug);
  if (existing.slug !== slug) revalidateCatalog(existing.slug);

  return { id };
}

export type DeleteProductResult = { ok: true } | { ok: false; error: string };

export async function deleteProduct(id: string): Promise<DeleteProductResult> {
  await requireAdminSession();

  const product = await prisma.product.findUnique({
    where: { id },
    include: { images: true, _count: { select: { orderItems: true } } },
  });
  if (!product) return { ok: true };

  if (product._count.orderItems > 0) {
    return {
      ok: false,
      error: `"${product.nombre}" aparece en ${product._count.orderItems} pedido(s) y no se puede eliminar. Desactívalo para ocultarlo del catálogo.`,
    };
  }

  await prisma.product.delete({ where: { id } });
  await Promise.all(product.images.map((img) => deleteImageByUrl(img.url)));

  revalidateCatalog(product.slug);
  return { ok: true };
}

export async function duplicateProduct(id: string) {
  await requireAdminSession();

  const product = await prisma.product.findUniqueOrThrow({ where: { id }, include: { images: true } });

  const slug = await uniqueSlug(`${product.nombre}-copia`, (s) =>
    prisma.product.findUnique({ where: { slug: s } }).then(Boolean)
  );

  const copy = await prisma.product.create({
    data: {
      nombre: `${product.nombre} (copia)`,
      slug,
      descripcionCorta: product.descripcionCorta,
      descripcionLarga: product.descripcionLarga,
      precio: product.precio,
      precioOferta: product.precioOferta,
      costo: product.costo,
      cantidad: 0,
      stockMinimo: product.stockMinimo,
      estado: computeEstado(0, product.stockMinimo),
      destacado: false,
      nuevo: product.nuevo,
      masVendido: false,
      activo: false,
      orden: product.orden,
      brandId: product.brandId,
      categoryId: product.categoryId,
      subcategoryId: product.subcategoryId,
      images: {
        create: product.images.map((img) => ({ url: img.url, alt: img.alt, orden: img.orden })),
      },
    },
  });

  revalidatePath("/admin/productos");

  return { id: copy.id };
}

export async function toggleProductActivo(id: string, activo: boolean) {
  await requireAdminSession();
  const product = await prisma.product.update({ where: { id }, data: { activo } });
  revalidateCatalog(product.slug);
}
