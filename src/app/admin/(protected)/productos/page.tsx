import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductsFilters } from "@/components/admin/products/products-filters";
import { ProductsTable, type AdminProductRow } from "@/components/admin/products/products-table";
import { CatalogPagination } from "@/components/product/catalog-pagination";
import { EmptyState } from "@/components/site/empty-state";
import { adminSearchProducts } from "@/lib/admin/products";
import { prisma } from "@/lib/prisma";
import type { ProductStatus } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Productos" };

type SearchParams = { q?: string; categoria?: string; marca?: string; estado?: string; page?: string };

const ESTADOS: ProductStatus[] = ["DISPONIBLE", "POCO_STOCK", "AGOTADO"];

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const estado = ESTADOS.includes(sp.estado as ProductStatus) ? (sp.estado as ProductStatus) : undefined;

  const [result, brands, categories] = await Promise.all([
    adminSearchProducts({
      q: sp.q || undefined,
      categoria: sp.categoria || undefined,
      marca: sp.marca || undefined,
      estado,
      page: sp.page ? Number(sp.page) : 1,
    }),
    prisma.brand.findMany({ orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
    prisma.category.findMany({ orderBy: { orden: "asc" }, select: { id: true, nombre: true } }),
  ]);

  const rows: AdminProductRow[] = result.items.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    imagenPrincipal: p.images[0]?.url ?? null,
    marca: p.brand?.nombre ?? null,
    categoria: p.category?.nombre ?? null,
    precio: Number(p.precio),
    precioOferta: p.precioOferta ? Number(p.precioOferta) : null,
    cantidad: p.cantidad,
    estado: p.estado,
    activo: p.activo,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-foreground sm:text-3xl">Productos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.total} producto{result.total === 1 ? "" : "s"}
          </p>
        </div>
        <Button render={<Link href="/admin/productos/nuevo" />} className="gap-1.5">
          <Plus className="size-4" /> Nuevo producto
        </Button>
      </div>

      <ProductsFilters brands={brands} categories={categories} />

      {rows.length === 0 ? (
        <EmptyState title="No hay productos" description="Crea tu primer producto para empezar." />
      ) : (
        <ProductsTable items={rows} />
      )}

      <CatalogPagination page={result.page} totalPages={result.totalPages} searchParams={sp} />
    </div>
  );
}
