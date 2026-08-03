import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/products/product-form";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Editar producto" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [product, brands, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { images: { orderBy: { orden: "asc" } } },
    }),
    prisma.brand.findMany({ orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
    prisma.category.findMany({
      orderBy: { orden: "asc" },
      select: {
        id: true,
        nombre: true,
        subcategories: { orderBy: { orden: "asc" }, select: { id: true, nombre: true } },
      },
    }),
  ]);

  if (!product) notFound();

  return (
    <ProductForm
      mode="edit"
      productId={product.id}
      brands={brands}
      categories={categories}
      initialImages={product.images.map((img) => ({ id: img.id, url: img.url, alt: img.alt }))}
      defaultValues={{
        nombre: product.nombre,
        slug: product.slug,
        codigoInterno: product.codigoInterno ?? "",
        sku: product.sku ?? "",
        descripcionCorta: product.descripcionCorta ?? "",
        descripcionLarga: product.descripcionLarga ?? "",
        precio: String(product.precio),
        precioOferta: product.precioOferta ? String(product.precioOferta) : "",
        costo: product.costo ? String(product.costo) : "",
        cantidad: String(product.cantidad),
        stockMinimo: String(product.stockMinimo),
        destacado: product.destacado,
        nuevo: product.nuevo,
        masVendido: product.masVendido,
        activo: product.activo,
        brandId: product.brandId ?? "none",
        categoryId: product.categoryId ?? "none",
        subcategoryId: product.subcategoryId ?? "none",
      }}
    />
  );
}
