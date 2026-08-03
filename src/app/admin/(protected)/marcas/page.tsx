import type { Metadata } from "next";
import Image from "next/image";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/site/empty-state";
import { TaxonomyFormDialog } from "@/components/admin/taxonomy/taxonomy-form-dialog";
import { DeleteButton } from "@/components/admin/taxonomy/delete-button";
import { prisma } from "@/lib/prisma";
import { createBrand, updateBrand, deleteBrand, moveBrand } from "./actions";

export const metadata: Metadata = { title: "Marcas" };

export default async function AdminBrandsPage() {
  const brands = await prisma.brand.findMany({
    orderBy: { orden: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-foreground sm:text-3xl">Marcas</h1>
          <p className="mt-1 text-sm text-muted-foreground">{brands.length} marcas</p>
        </div>
        <TaxonomyFormDialog mode="create" title="Nueva marca" withImage action={createBrand} />
      </div>

      {brands.length === 0 ? (
        <EmptyState title="No hay marcas" description="Crea tu primera marca para clasificar productos." />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14" />
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden sm:table-cell">Productos</TableHead>
                <TableHead className="w-24">Orden</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.map((brand, index) => (
                <TableRow key={brand.id}>
                  <TableCell>
                    <div className="relative size-10 overflow-hidden rounded-xl bg-blush">
                      {brand.imagen && (
                        <Image src={brand.imagen} alt="" fill sizes="40px" className="object-cover" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{brand.nombre}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                    {brand._count.products}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <form action={moveBrand.bind(null, brand.id, "up")}>
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon-sm"
                          disabled={index === 0}
                          aria-label="Subir"
                        >
                          <ChevronUp className="size-4" />
                        </Button>
                      </form>
                      <form action={moveBrand.bind(null, brand.id, "down")}>
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon-sm"
                          disabled={index === brands.length - 1}
                          aria-label="Bajar"
                        >
                          <ChevronDown className="size-4" />
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <TaxonomyFormDialog
                        mode="edit"
                        title="Editar marca"
                        withImage
                        entity={brand}
                        action={updateBrand.bind(null, brand.id)}
                      />
                      <DeleteButton
                        title={`¿Eliminar ${brand.nombre}?`}
                        description="Los productos con esta marca quedarán sin marca asignada."
                        action={deleteBrand.bind(null, brand.id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
