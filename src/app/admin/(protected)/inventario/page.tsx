import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, PackageX, History } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EstadoBadge } from "@/components/product/estado-badge";
import { EmptyState } from "@/components/site/empty-state";
import { CatalogPagination } from "@/components/product/catalog-pagination";
import { MovementDialog } from "@/components/admin/inventory/movement-dialog";
import { SearchBox } from "@/components/admin/search-box";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import type { Prisma, ProductStatus } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Inventario" };

type SearchParams = { q?: string; estado?: string; page?: string };

const ESTADOS: ProductStatus[] = ["DISPONIBLE", "POCO_STOCK", "AGOTADO"];
const PAGE_SIZE = 20;

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const estado = ESTADOS.includes(sp.estado as ProductStatus) ? (sp.estado as ProductStatus) : undefined;
  const page = sp.page ? Math.max(1, Number(sp.page)) : 1;

  const where: Prisma.ProductWhereInput = {
    ...(sp.q ? { nombre: { contains: sp.q, mode: "insensitive" } } : {}),
    ...(estado ? { estado } : {}),
  };

  const [items, total, pocoStock, agotados, allProducts] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        cantidad: true,
        stockMinimo: true,
        estado: true,
        activo: true,
        brand: { select: { nombre: true } },
        images: { orderBy: { orden: "asc" }, take: 1, select: { url: true } },
      },
      orderBy: [{ cantidad: "asc" }, { nombre: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
    prisma.product.count({ where: { estado: "POCO_STOCK" } }),
    prisma.product.count({ where: { estado: "AGOTADO" } }),
    prisma.product.findMany({
      select: { id: true, nombre: true, cantidad: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-foreground sm:text-3xl">Inventario</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Existencias y movimientos de stock (kardex).
          </p>
        </div>
        <MovementDialog products={allProducts} />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/inventario?estado=POCO_STOCK"
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
            estado === "POCO_STOCK"
              ? "border-amber-400 bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200"
              : "border-border bg-card text-foreground/80 hover:bg-muted"
          )}
        >
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-300" />
          {pocoStock} con poco stock
        </Link>
        <Link
          href="/admin/inventario?estado=AGOTADO"
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
            estado === "AGOTADO"
              ? "border-red-400 bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200"
              : "border-border bg-card text-foreground/80 hover:bg-muted"
          )}
        >
          <PackageX className="size-4 text-red-600 dark:text-red-300" />
          {agotados} agotados
        </Link>
      </div>

      <SearchBox placeholder="Buscar producto..." />

      {items.length === 0 ? (
        <EmptyState title="Sin resultados" description="No hay productos con esos filtros." />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14" />
                <TableHead>Producto</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead className="hidden sm:table-cell">Mínimo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id} className={cn(!p.activo && "opacity-50")}>
                  <TableCell>
                    <div className="relative size-10 overflow-hidden rounded-xl bg-blush">
                      {p.images[0] && (
                        <Image src={p.images[0].url} alt="" fill sizes="40px" className="object-cover" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/inventario/${p.id}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {p.nombre}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {p.brand?.nombre ?? "Sin marca"}
                      {!p.activo && " · inactivo"}
                    </p>
                  </TableCell>
                  <TableCell className="font-heading text-lg text-foreground">{p.cantidad}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                    {p.stockMinimo}
                  </TableCell>
                  <TableCell>
                    <EstadoBadge estado={p.estado} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-muted-foreground"
                      render={<Link href={`/admin/inventario/${p.id}`} />}
                    >
                      <History className="size-4" /> Kardex
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CatalogPagination page={page} totalPages={totalPages} searchParams={sp} />
    </div>
  );
}
