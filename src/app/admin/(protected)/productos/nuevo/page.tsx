import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/products/product-form";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  const [brands, categories] = await Promise.all([
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

  return <ProductForm mode="create" brands={brands} categories={categories} />;
}
