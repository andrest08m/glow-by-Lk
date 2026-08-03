import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Pencil } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EstadoBadge } from "@/components/product/estado-badge";
import { EmptyState } from "@/components/site/empty-state";
import { CatalogPagination } from "@/components/product/catalog-pagination";
import { MovementDialog } from "@/components/admin/inventory/movement-dialog";
import { MovementTypeBadge } from "@/components/admin/inventory/movement-type-badge";
import { prisma } from "@/lib/prisma";
import { formatFecha } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Kardex" };

const PAGE_SIZE = 25;

export default async function ProductKardexPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const page = sp.page ? Math.max(1, Number(sp.page)) : 1;

  const [product, movements, totalMovements] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
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
    }),
    prisma.inventoryMovement.findMany({
      where: { productId: id },
      include: { order: { select: { numero: true, id: true } } },
      orderBy: { fecha: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.inventoryMovement.count({ where: { productId: id } }),
  ]);

  if (!product) notFound();

  const totalPages = Math.max(1, Math.ceil(totalMovements / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href="/admin/inventario" />} aria-label="Volver">
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="font-heading text-2xl text-foreground sm:text-3xl">Kardex</h1>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border/60 bg-card p-5">
        <div className="flex items-center gap-4">
          <div className="relative size-16 overflow-hidden rounded-2xl bg-blush">
            {product.images[0] && (
              <Image src={product.images[0].url} alt="" fill sizes="64px" className="object-cover" />
            )}
          </div>
          <div>
            <p className="font-heading text-lg text-foreground">{product.nombre}</p>
            <p className="text-sm text-muted-foreground">
              {product.brand?.nombre ?? "Sin marca"}
              {!product.activo && " · inactivo"}
            </p>
            <div className="mt-1.5 flex items-center gap-3">
              <EstadoBadge estado={product.estado} />
              <span className="text-sm text-muted-foreground">
                <span className="font-heading text-lg text-foreground">{product.cantidad}</span>{" "}
                unidades · mínimo {product.stockMinimo}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            render={<Link href={`/admin/productos/${product.id}`} />}
          >
            <Pencil className="size-3.5" /> Editar producto
          </Button>
          <MovementDialog
            products={[{ id: product.id, nombre: product.nombre, cantidad: product.cantidad }]}
            fixedProductId={product.id}
            triggerLabel="Registrar movimiento"
          />
        </div>
      </div>

      {movements.length === 0 ? (
        <EmptyState
          title="Sin movimientos"
          description="Cuando registres entradas, salidas o ajustes aparecerán aquí."
        />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="hidden md:table-cell">Motivo</TableHead>
                <TableHead className="hidden lg:table-cell">Registrado por</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                    {formatFecha(m.fecha)}
                  </TableCell>
                  <TableCell>
                    <MovementTypeBadge tipo={m.tipo} />
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium tabular-nums",
                      m.cantidad > 0 && "text-emerald-600 dark:text-emerald-400",
                      m.cantidad < 0 && "text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                  </TableCell>
                  <TableCell className="text-right font-heading tabular-nums text-foreground">
                    {m.saldoResultante}
                  </TableCell>
                  <TableCell className="hidden max-w-56 text-sm text-muted-foreground md:table-cell">
                    <span className="line-clamp-2">
                      {m.motivo ?? "—"}
                      {m.order && (
                        <>
                          {" "}
                          <Link
                            href={`/admin/pedidos/${m.order.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            Pedido #{m.order.numero}
                          </Link>
                        </>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {m.adminEmail ?? "—"}
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
