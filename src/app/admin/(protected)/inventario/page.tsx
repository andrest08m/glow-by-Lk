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
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";
import type { ProductStatus } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Inventario" };

type SearchParams = { q?: string; estado?: string; page?: string };

const ESTADOS: ProductStatus[] = ["DISPONIBLE", "POCO_STOCK", "AGOTADO"];
const PAGE_SIZE = 20;

type InvRow = {
  id: string;
  nombre: string;
  cantidad: number;
  stockMinimo: number;
  estado: ProductStatus;
  activo: boolean;
  brand: { nombre: string } | null;
  images: { url: string }[];
};

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const estado = ESTADOS.includes(sp.estado as ProductStatus) ? (sp.estado as ProductStatus) : undefined;
  const page = sp.page ? Math.max(1, Number(sp.page)) : 1;
  const db = createAdminClient();

  let listQuery = db
    .from("products")
    .select("id,nombre,cantidad,stock_minimo,estado,activo,brand:brands(nombre),images:product_images(url,orden)", {
      count: "exact",
    });
  if (sp.q) listQuery = listQuery.ilike("nombre", `%${sp.q}%`);
  if (estado) listQuery = listQuery.eq("estado", estado);
  const from = (page - 1) * PAGE_SIZE;

  const [listRes, pocoRes, agotRes, allRes] = await Promise.all([
    listQuery.order("cantidad", { ascending: true }).order("nombre", { ascending: true }).range(from, from + PAGE_SIZE - 1),
    db.from("products").select("id", { count: "exact", head: true }).eq("estado", "POCO_STOCK"),
    db.from("products").select("id", { count: "exact", head: true }).eq("estado", "AGOTADO"),
    db.from("products").select("id,nombre,cantidad").order("nombre", { ascending: true }),
  ]);

  const total = listRes.count ?? 0;
  const pocoStock = pocoRes.count ?? 0;
  const agotados = agotRes.count ?? 0;
  const allProducts = allRes.data ?? [];

  const items: InvRow[] = (
    (listRes.data as
      | {
          id: string;
          nombre: string;
          cantidad: number;
          stock_minimo: number;
          estado: ProductStatus;
          activo: boolean;
          brand: { nombre: string } | null;
          images: { url: string; orden: number }[] | null;
        }[]
      | null) ?? []
  ).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    cantidad: p.cantidad,
    stockMinimo: p.stock_minimo,
    estado: p.estado,
    activo: p.activo,
    brand: p.brand,
    images: [...(p.images ?? [])].sort((a, b) => a.orden - b.orden).slice(0, 1).map((i) => ({ url: i.url })),
  }));

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
