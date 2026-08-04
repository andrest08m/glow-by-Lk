import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ChevronUp, ChevronDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/site/empty-state";
import { TaxonomyFormDialog } from "@/components/admin/taxonomy/taxonomy-form-dialog";
import { DeleteButton } from "@/components/admin/taxonomy/delete-button";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  moveSubcategory,
} from "@/app/admin/(protected)/categorias/actions";

export const metadata: Metadata = { title: "Subcategorías" };

export default async function CategorySubcategoriesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = createAdminClient();

  const { data } = await db
    .from("categories")
    .select("id,nombre,subcategories(id,nombre,slug,orden,products(count))")
    .eq("id", id)
    .single();

  if (!data) notFound();

  const category = {
    id: data.id,
    nombre: data.nombre,
    subcategories: [...(data.subcategories ?? [])]
      .sort((a, b) => a.orden - b.orden)
      .map((s) => ({
        id: s.id,
        nombre: s.nombre,
        slug: s.slug,
        orden: s.orden,
        _count: { products: (s.products as unknown as { count: number }[])?.[0]?.count ?? 0 },
      })),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href="/admin/categorias" />} aria-label="Volver">
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="font-heading text-2xl text-foreground sm:text-3xl">{category.nombre}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {category.subcategories.length} subcategoría{category.subcategories.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <TaxonomyFormDialog
          mode="create"
          title="Nueva subcategoría"
          action={createSubcategory.bind(null, category.id)}
        />
      </div>

      {category.subcategories.length === 0 ? (
        <EmptyState title="Sin subcategorías" description="Agrega subcategorías para clasificar mejor esta categoría." />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden sm:table-cell">Productos</TableHead>
                <TableHead className="w-24">Orden</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {category.subcategories.map((sub, index) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium text-foreground">{sub.nombre}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                    {sub._count.products}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <form action={moveSubcategory.bind(null, category.id, sub.id, "up")}>
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
                      <form action={moveSubcategory.bind(null, category.id, sub.id, "down")}>
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon-sm"
                          disabled={index === category.subcategories.length - 1}
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
                        title="Editar subcategoría"
                        entity={sub}
                        action={updateSubcategory.bind(null, sub.id)}
                      />
                      <DeleteButton
                        title={`¿Eliminar ${sub.nombre}?`}
                        description="Los productos con esta subcategoría quedarán sin subcategoría asignada."
                        action={deleteSubcategory.bind(null, sub.id)}
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
