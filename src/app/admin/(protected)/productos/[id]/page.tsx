import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/products/product-form";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Editar producto" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createAdminClient();

  const [{ data: product }, { data: brands }, { data: categories }] = await Promise.all([
    db.from("products").select("*,images:product_images(id,url,alt,orden)").eq("id", id).single(),
    db.from("brands").select("id,nombre").order("orden", { ascending: true }),
    db
      .from("categories")
      .select("id,nombre,subcategories(id,nombre,orden)")
      .order("orden", { ascending: true }),
  ]);

  if (!product) notFound();

  const categoriesMapped = (categories ?? []).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    subcategories: [...(c.subcategories ?? [])]
      .sort((a, b) => a.orden - b.orden)
      .map((s) => ({ id: s.id, nombre: s.nombre })),
  }));

  const images = [...(product.images ?? [])]
    .sort((a, b) => a.orden - b.orden)
    .map((img) => ({ id: img.id, url: img.url, alt: img.alt }));

  return (
    <ProductForm
      mode="edit"
      productId={product.id}
      brands={brands ?? []}
      categories={categoriesMapped}
      initialImages={images}
      defaultValues={{
        nombre: product.nombre,
        slug: product.slug,
        codigoInterno: product.codigo_interno ?? "",
        sku: product.sku ?? "",
        descripcionCorta: product.descripcion_corta ?? "",
        descripcionLarga: product.descripcion_larga ?? "",
        precio: String(product.precio),
        precioOferta: product.precio_oferta != null ? String(product.precio_oferta) : "",
        costo: product.costo != null ? String(product.costo) : "",
        cantidad: String(product.cantidad),
        stockMinimo: String(product.stock_minimo),
        destacado: product.destacado,
        nuevo: product.nuevo,
        masVendido: product.mas_vendido,
        activo: product.activo,
        brandId: product.brand_id ?? "none",
        categoryId: product.category_id ?? "none",
        subcategoryId: product.subcategory_id ?? "none",
      }}
    />
  );
}
