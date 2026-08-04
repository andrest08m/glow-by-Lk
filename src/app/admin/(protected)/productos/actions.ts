"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin/guard";
import { computeEstado } from "@/lib/product-status";
import { toSlug, uniqueSlug } from "@/lib/slug";
import { uploadImage, deleteImageByUrl } from "@/lib/storage";
import { productSchema, imageManifestSchema } from "@/lib/validations/product";

function revalidateCatalog(slug?: string) {
  revalidatePath("/admin/productos");
  revalidatePath("/admin/inventario");
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/productos");
  if (slug) revalidatePath(`/producto/${slug}`);
}

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

type AdminDb = ReturnType<typeof createAdminClient>;

async function slugExists(db: AdminDb, slug: string, exceptId?: string) {
  let q = db.from("products").select("id").eq("slug", slug).limit(1);
  if (exceptId) q = q.neq("id", exceptId);
  const { data } = await q;
  return (data?.length ?? 0) > 0;
}

async function applyImageManifest(db: AdminDb, productId: string, slug: string, formData: FormData) {
  const manifestRaw = formData.get("imageManifest");
  if (!manifestRaw) return;

  const manifest = imageManifestSchema.parse(JSON.parse(String(manifestRaw)));
  const keepIds = manifest.filter((e) => e.kind === "existing").map((e) => e.id);

  const { data: current } = await db
    .from("product_images")
    .select("id,url")
    .eq("product_id", productId);

  const toRemove = (current ?? []).filter((img) => !keepIds.includes(img.id));
  await Promise.all(toRemove.map((img) => deleteImageByUrl(img.url)));
  if (toRemove.length > 0) {
    await db.from("product_images").delete().in("id", toRemove.map((i) => i.id));
  }

  for (const entry of manifest) {
    if (entry.kind === "existing") {
      await db.from("product_images").update({ orden: entry.orden }).eq("id", entry.id);
    } else {
      const file = formData.get(entry.tempId);
      if (!(file instanceof File)) continue;
      const url = await uploadImage(file, slug);
      await db.from("product_images").insert({ product_id: productId, url, orden: entry.orden });
    }
  }
}

export async function createProduct(formData: FormData) {
  await requireAdminSession();
  const db = createAdminClient();
  const data = parseProductFormData(formData);

  const slug = await uniqueSlug(data.slug || data.nombre, (s) => slugExists(db, s));

  const { data: product, error } = await db
    .from("products")
    .insert({
      nombre: data.nombre,
      slug,
      codigo_interno: data.codigoInterno || null,
      sku: data.sku || null,
      descripcion_corta: data.descripcionCorta || null,
      descripcion_larga: data.descripcionLarga || null,
      precio: data.precio,
      precio_oferta: data.precioOferta ?? null,
      costo: data.costo ?? null,
      cantidad: data.cantidad,
      stock_minimo: data.stockMinimo,
      estado: computeEstado(data.cantidad, data.stockMinimo),
      destacado: data.destacado,
      nuevo: data.nuevo,
      mas_vendido: data.masVendido,
      activo: data.activo,
      brand_id: data.brandId || null,
      category_id: data.categoryId || null,
      subcategory_id: data.subcategoryId || null,
    })
    .select("id,slug")
    .single();

  if (error || !product) throw new Error(error?.message ?? "No se pudo crear el producto.");

  await applyImageManifest(db, product.id, product.slug, formData);
  revalidateCatalog(product.slug);
  return { id: product.id };
}

export async function updateProduct(id: string, formData: FormData) {
  await requireAdminSession();
  const db = createAdminClient();
  const data = parseProductFormData(formData);

  const { data: existing } = await db.from("products").select("slug").eq("id", id).single();
  if (!existing) throw new Error("El producto no existe.");

  let slug = existing.slug;
  const desiredSlug = data.slug || data.nombre;
  if (toSlug(desiredSlug) !== existing.slug) {
    slug = await uniqueSlug(desiredSlug, (s) => slugExists(db, s, id));
  }

  const { error } = await db
    .from("products")
    .update({
      nombre: data.nombre,
      slug,
      codigo_interno: data.codigoInterno || null,
      sku: data.sku || null,
      descripcion_corta: data.descripcionCorta || null,
      descripcion_larga: data.descripcionLarga || null,
      precio: data.precio,
      precio_oferta: data.precioOferta ?? null,
      costo: data.costo ?? null,
      cantidad: data.cantidad,
      stock_minimo: data.stockMinimo,
      estado: computeEstado(data.cantidad, data.stockMinimo),
      destacado: data.destacado,
      nuevo: data.nuevo,
      mas_vendido: data.masVendido,
      activo: data.activo,
      brand_id: data.brandId || null,
      category_id: data.categoryId || null,
      subcategory_id: data.subcategoryId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  await applyImageManifest(db, id, slug, formData);
  revalidateCatalog(slug);
  if (existing.slug !== slug) revalidateCatalog(existing.slug);
  return { id };
}

export type DeleteProductResult = { ok: true } | { ok: false; error: string };

export async function deleteProduct(id: string): Promise<DeleteProductResult> {
  await requireAdminSession();
  const db = createAdminClient();

  const { count } = await db
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", id);

  const { data: product } = await db.from("products").select("nombre,slug").eq("id", id).single();
  if (!product) return { ok: true };

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `"${product.nombre}" aparece en ${count} pedido(s) y no se puede eliminar. Desactívalo para ocultarlo del catálogo.`,
    };
  }

  const { data: images } = await db.from("product_images").select("url").eq("product_id", id);
  await db.from("products").delete().eq("id", id);
  await Promise.all((images ?? []).map((img) => deleteImageByUrl(img.url)));

  revalidateCatalog(product.slug);
  return { ok: true };
}

export async function duplicateProduct(id: string) {
  await requireAdminSession();
  const db = createAdminClient();

  const { data: product } = await db.from("products").select("*").eq("id", id).single();
  if (!product) throw new Error("El producto no existe.");
  const { data: images } = await db
    .from("product_images")
    .select("url,alt,orden")
    .eq("product_id", id);

  const slug = await uniqueSlug(`${product.nombre}-copia`, (s) => slugExists(db, s));

  const { data: copy, error } = await db
    .from("products")
    .insert({
      nombre: `${product.nombre} (copia)`,
      slug,
      descripcion_corta: product.descripcion_corta,
      descripcion_larga: product.descripcion_larga,
      precio: product.precio,
      precio_oferta: product.precio_oferta,
      costo: product.costo,
      cantidad: 0,
      stock_minimo: product.stock_minimo,
      estado: computeEstado(0, product.stock_minimo),
      destacado: false,
      nuevo: product.nuevo,
      mas_vendido: false,
      activo: false,
      orden: product.orden,
      brand_id: product.brand_id,
      category_id: product.category_id,
      subcategory_id: product.subcategory_id,
    })
    .select("id")
    .single();

  if (error || !copy) throw new Error(error?.message ?? "No se pudo duplicar.");

  if (images && images.length > 0) {
    await db
      .from("product_images")
      .insert(images.map((img) => ({ product_id: copy.id, url: img.url, alt: img.alt, orden: img.orden })));
  }

  revalidatePath("/admin/productos");
  return { id: copy.id };
}

export async function toggleProductActivo(id: string, activo: boolean) {
  await requireAdminSession();
  const db = createAdminClient();
  const { data } = await db
    .from("products")
    .update({ activo, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("slug")
    .single();
  revalidateCatalog(data?.slug);
}
