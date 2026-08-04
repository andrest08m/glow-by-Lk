import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Download, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductsFilters } from "@/components/admin/products/products-filters";
import { ProductsTable, type AdminProductRow } from "@/components/admin/products/products-table";
import { CatalogPagination } from "@/components/product/catalog-pagination";
import { EmptyState } from "@/components/site/empty-state";
import { adminSearchProducts } from "@/lib/admin/products";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProductStatus } from "@/lib/supabase/database.types";

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

  const db = createAdminClient();
  const [result, { data: brands }, { data: categories }] = await Promise.all([
    adminSearchProducts({
      q: sp.q || undefined,
      categoria: sp.categoria || undefined,
      marca: sp.marca || undefined,
      estado,
      page: sp.page ? Number(sp.page) : 1,
    }),
    db.from("brands").select("id,nombre").order("orden", { ascending: true }),
    db.from("categories").select("id,nombre").order("orden", { ascending: true }),
  ]);

  const rows: AdminProductRow[] = result.items.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    imagenPrincipal: [...(p.images ?? [])].sort((a, b) => a.orden - b.orden)[0]?.url ?? null,
    marca: p.brand?.nombre ?? null,
    categoria: p.category?.nombre ?? null,
    precio: Number(p.precio),
    precioOferta: p.precio_oferta != null ? Number(p.precio_oferta) : null,
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
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="gap-1.5" render={<a href="/admin/productos/export" download />}>
            <Download className="size-4" /> Exportar CSV
          </Button>
          <Button variant="outline" className="gap-1.5" render={<Link href="/admin/productos/importar" />}>
            <FileUp className="size-4" /> Importar
          </Button>
          <Button render={<Link href="/admin/productos/nuevo" />} className="gap-1.5">
            <Plus className="size-4" /> Nuevo producto
          </Button>
        </div>
      </div>

      <ProductsFilters brands={brands ?? []} categories={categories ?? []} />

      {rows.length === 0 ? (
        <EmptyState title="No hay productos" description="Crea tu primer producto para empezar." />
      ) : (
        <ProductsTable items={rows} />
      )}

      <CatalogPagination page={result.page} totalPages={result.totalPages} searchParams={sp} />
    </div>
  );
}
