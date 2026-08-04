"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Copy, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EstadoBadge } from "@/components/product/estado-badge";
import { formatCOP } from "@/lib/format";
import {
  deleteProduct,
  duplicateProduct,
  toggleProductActivo,
} from "@/app/admin/(protected)/productos/actions";
import type { ProductStatus } from "@/lib/supabase/database.types";

export type AdminProductRow = {
  id: string;
  nombre: string;
  imagenPrincipal: string | null;
  marca: string | null;
  categoria: string | null;
  precio: number;
  precioOferta: number | null;
  cantidad: number;
  estado: ProductStatus;
  activo: boolean;
};

export function ProductsTable({ items }: { items: AdminProductRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<AdminProductRow | null>(null);

  function handleToggle(id: string, next: boolean) {
    startTransition(async () => {
      await toggleProductActivo(id, next);
      router.refresh();
    });
  }

  function handleDuplicate(id: string) {
    startTransition(async () => {
      const result = await duplicateProduct(id);
      toast.success("Producto duplicado");
      router.push(`/admin/productos/${result.id}`);
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    startTransition(async () => {
      const result = await deleteProduct(target.id);
      if (!result.ok) {
        toast.error(result.error);
        setDeleteTarget(null);
        return;
      }
      toast.success("Producto eliminado");
      setDeleteTarget(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14" />
              <TableHead>Producto</TableHead>
              <TableHead className="hidden md:table-cell">Categoría</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead className="hidden sm:table-cell">Stock</TableHead>
              <TableHead>Activo</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="relative size-10 overflow-hidden rounded-xl bg-blush">
                    {p.imagenPrincipal && (
                      <Image src={p.imagenPrincipal} alt="" fill sizes="40px" className="object-cover" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/productos/${p.id}`}
                    className="font-medium text-foreground hover:text-primary"
                  >
                    {p.nombre}
                  </Link>
                  {p.marca && <p className="text-xs text-muted-foreground">{p.marca}</p>}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                  {p.categoria ?? "—"}
                </TableCell>
                <TableCell>
                  {p.precioOferta ? (
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground line-through">
                        {formatCOP(p.precio)}
                      </span>
                      <span className="font-medium text-primary">{formatCOP(p.precioOferta)}</span>
                    </div>
                  ) : (
                    <span className="font-medium text-foreground">{formatCOP(p.precio)}</span>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground">{p.cantidad}</span>
                    <EstadoBadge estado={p.estado} />
                  </div>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={p.activo}
                    onCheckedChange={(checked) => handleToggle(p.id, checked === true)}
                    disabled={isPending}
                    aria-label={p.activo ? "Desactivar producto" : "Activar producto"}
                  />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="icon-sm" aria-label="Más acciones" />}
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem render={<Link href={`/admin/productos/${p.id}`} />}>
                        <Pencil className="size-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(p.id)}>
                        <Copy className="size-4" /> Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(p)}>
                        <Trash2 className="size-4" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {deleteTarget?.nombre}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el producto y sus imágenes del almacenamiento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
              onClick={confirmDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
