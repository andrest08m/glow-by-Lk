import type { Metadata } from "next";
import { Container } from "@/components/site/container";
import { Reveal } from "@/components/motion/reveal";
import { ProductCard } from "@/components/product/product-card";
import { CatalogFilters } from "@/components/product/catalog-filters";
import { CatalogPagination } from "@/components/product/catalog-pagination";
import { EmptyState } from "@/components/site/empty-state";
import { searchProducts, getBrands, getCategoriesWithImage } from "@/lib/products";
import type { ProductStatus } from "@/generated/prisma/client";

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Explora todo el catálogo de glow by Lk: maquillaje, cuidado facial y más.",
};

type SearchParams = {
  q?: string;
  marca?: string;
  categoria?: string;
  precioMin?: string;
  precioMax?: string;
  disponibilidad?: string;
  page?: string;
};

const ESTADOS: ProductStatus[] = ["DISPONIBLE", "POCO_STOCK", "AGOTADO"];

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const disponibilidad = ESTADOS.includes(sp.disponibilidad as ProductStatus)
    ? (sp.disponibilidad as ProductStatus)
    : undefined;

  const filters = {
    q: sp.q || undefined,
    marca: sp.marca || undefined,
    categoria: sp.categoria || undefined,
    precioMin: sp.precioMin ? Number(sp.precioMin) : undefined,
    precioMax: sp.precioMax ? Number(sp.precioMax) : undefined,
    disponibilidad,
    page: sp.page ? Number(sp.page) : 1,
  };

  const [result, brands, categories] = await Promise.all([
    searchProducts(filters),
    getBrands(),
    getCategoriesWithImage(),
  ]);

  return (
    <Container className="py-8 sm:py-12">
      <Reveal className="mb-8">
        <h1 className="font-heading text-3xl text-foreground sm:text-4xl">Catálogo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {result.total} producto{result.total === 1 ? "" : "s"}
        </p>
      </Reveal>

      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="shrink-0 lg:w-64">
          <CatalogFilters brands={brands} categories={categories} />
        </aside>

        <div className="min-w-0 flex-1">
          {result.items.length === 0 ? (
            <EmptyState
              title="No encontramos productos"
              description="Prueba con otros filtros o una búsqueda diferente."
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
              {result.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <CatalogPagination page={result.page} totalPages={result.totalPages} searchParams={sp} />
        </div>
      </div>
    </Container>
  );
}
