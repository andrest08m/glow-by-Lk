import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ChevronUp, ChevronDown, ArrowRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/site/empty-state";
import { TaxonomyFormDialog } from "@/components/admin/taxonomy/taxonomy-form-dialog";
import { DeleteButton } from "@/components/admin/taxonomy/delete-button";
import { prisma } from "@/lib/prisma";
import { createCategory, updateCategory, deleteCategory, moveCategory } from "./actions";

export const metadata: Metadata = { title: "Categorías" };

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { orden: "asc" },
    include: { _count: { select: { products: true, subcategories: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-foreground sm:text-3xl">Categorías</h1>
          <p className="mt-1 text-sm text-muted-foreground">{categories.length} categorías</p>
        </div>
        <TaxonomyFormDialog mode="create" title="Nueva categoría" withImage action={createCategory} />
      </div>

      {categories.length === 0 ? (
        <EmptyState title="No hay categorías" description="Crea tu primera categoría para organizar el catálogo." />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14" />
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden sm:table-cell">Subcategorías</TableHead>
                <TableHead className="hidden sm:table-cell">Productos</TableHead>
                <TableHead className="w-24">Orden</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category, index) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div className="relative size-10 overflow-hidden rounded-xl bg-blush">
                      {category.imagen && (
                        <Image src={category.imagen} alt="" fill sizes="40px" className="object-cover" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{category.nombre}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                    {category._count.subcategories}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                    {category._count.products}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <form action={moveCategory.bind(null, category.id, "up")}>
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
                      <form action={moveCategory.bind(null, category.id, "down")}>
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon-sm"
                          disabled={index === categories.length - 1}
                          aria-label="Bajar"
                        >
                          <ChevronDown className="size-4" />
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        render={<Link href={`/admin/categorias/${category.id}`} />}
                        aria-label="Ver subcategorías"
                      >
                        <ArrowRight className="size-4" />
                      </Button>
                      <TaxonomyFormDialog
                        mode="edit"
                        title="Editar categoría"
                        withImage
                        entity={category}
                        action={updateCategory.bind(null, category.id)}
                      />
                      <DeleteButton
                        title={`¿Eliminar ${category.nombre}?`}
                        description="Se eliminarán también sus subcategorías. Los productos quedarán sin categoría asignada."
                        action={deleteCategory.bind(null, category.id)}
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
