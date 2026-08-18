"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { ImageManager, type ImageItem } from "@/components/admin/products/image-manager";
import { TonoManager, type TonoItem } from "@/components/admin/products/tono-manager";
import { EstadoBadge } from "@/components/product/estado-badge";
import { productSchema } from "@/lib/validations/product";
import { toSlug } from "@/lib/slug";
import { computeEstado } from "@/lib/product-status";
import { createProduct, updateProduct } from "@/app/admin/(protected)/productos/actions";

type FormState = {
  nombre: string;
  slug: string;
  codigoInterno: string;
  sku: string;
  descripcionCorta: string;
  descripcionLarga: string;
  precio: string;
  precioOferta: string;
  costo: string;
  cantidad: string;
  stockMinimo: string;
  destacado: boolean;
  nuevo: boolean;
  masVendido: boolean;
  activo: boolean;
  brandId: string;
  categoryId: string;
  subcategoryId: string;
};

type CategoryOption = {
  id: string;
  nombre: string;
  subcategories: { id: string; nombre: string }[];
};

export function ProductForm({
  mode,
  productId,
  defaultValues,
  initialImages = [],
  initialTonos = [],
  brands,
  categories,
}: {
  mode: "create" | "edit";
  productId?: string;
  defaultValues?: Partial<FormState>;
  initialImages?: { id: string; url: string; alt: string | null }[];
  initialTonos?: { id: string; nombre: string; imagen: string | null }[];
  brands: { id: string; nombre: string }[];
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [images, setImages] = useState<ImageItem[]>(
    initialImages.map((img) => ({ kind: "existing", id: img.id, url: img.url, alt: img.alt }))
  );
  const [tonos, setTonos] = useState<TonoItem[]>(
    initialTonos.map((t) => ({ key: t.id, id: t.id, nombre: t.nombre, imagenUrl: t.imagen }))
  );

  const form = useForm<FormState>({
    // el schema usa z.coerce en los campos numéricos, por eso el input (string) no calza 1:1 con el output
    resolver: zodResolver(productSchema) as never,
    defaultValues: {
      nombre: "",
      slug: "",
      codigoInterno: "",
      sku: "",
      descripcionCorta: "",
      descripcionLarga: "",
      precio: "",
      precioOferta: "",
      costo: "",
      cantidad: "0",
      stockMinimo: "5",
      destacado: false,
      nuevo: false,
      masVendido: false,
      activo: true,
      brandId: "none",
      categoryId: "none",
      subcategoryId: "none",
      ...defaultValues,
    },
  });

  const nombre = form.watch("nombre");
  const categoryId = form.watch("categoryId");
  const cantidad = form.watch("cantidad");
  const stockMinimo = form.watch("stockMinimo");

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!form.formState.dirtyFields.slug) {
      form.setValue("slug", toSlug(nombre || ""), { shouldValidate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombre]);

  const categoryTouched = useRef(false);
  useEffect(() => {
    if (!categoryTouched.current) {
      categoryTouched.current = true;
      return;
    }
    form.setValue("subcategoryId", "none");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  const subcategories = categories.find((c) => c.id === categoryId)?.subcategories ?? [];

  const previewEstado = computeEstado(Number(cantidad) || 0, Number(stockMinimo) || 0);

  async function onSubmit(values: FormState) {
    const fd = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      // No mandar campos vacíos/undefined: FormData los guardaría como el texto
      // "undefined" y el servidor no podría convertirlos a número (NaN).
      if (value === undefined || value === null) return;
      fd.append(key, typeof value === "boolean" ? String(value) : value);
    });

    const manifest = images.map((item, index) =>
      item.kind === "existing"
        ? { kind: "existing" as const, id: item.id, orden: index }
        : { kind: "new" as const, tempId: item.tempId, orden: index }
    );
    fd.append("imageManifest", JSON.stringify(manifest));
    images.forEach((item) => {
      if (item.kind === "new") fd.append(item.tempId, item.file);
    });

    // Tonos: manifiesto + archivos nuevos bajo la clave tono-file-<key>
    const tonoManifest = tonos
      .filter((t) => t.nombre.trim())
      .map((t, index) => ({
        id: t.id,
        key: t.key,
        nombre: t.nombre.trim(),
        orden: index,
        hasNewImage: !!t.file,
      }));
    fd.append("tonoManifest", JSON.stringify(tonoManifest));
    tonos.forEach((t) => {
      if (t.file) fd.append(`tono-file-${t.key}`, t.file);
    });

    startTransition(async () => {
      try {
        if (mode === "create") {
          await createProduct(fd);
          toast.success("Producto creado");
        } else if (productId) {
          await updateProduct(productId, fd);
          toast.success("Producto actualizado");
        }
        router.push("/admin/productos");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Ocurrió un error al guardar");
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-16">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            render={<Link href="/admin/productos" />}
            aria-label="Volver"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="font-heading text-2xl text-foreground sm:text-3xl">
            {mode === "create" ? "Nuevo producto" : "Editar producto"}
          </h1>
        </div>

        <section className="space-y-5 rounded-3xl border border-border/60 bg-card p-5 sm:p-6">
          <h2 className="font-heading text-lg text-foreground">Imágenes</h2>
          <ImageManager images={images} onChange={setImages} />
        </section>

        <section className="space-y-4 rounded-3xl border border-border/60 bg-card p-5 sm:p-6">
          <div>
            <h2 className="font-heading text-lg text-foreground">Tonos (opcional)</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Para productos con variantes de color/tono (correctores, polvos, etc.). Si agregás
              tonos, el cliente los verá en un selector con la foto de cada uno.
            </p>
          </div>
          <TonoManager tonos={tonos} onChange={setTonos} />
        </section>

        <section className="grid gap-5 rounded-3xl border border-border/60 bg-card p-5 sm:grid-cols-2 sm:p-6">
          <h2 className="font-heading text-lg text-foreground sm:col-span-2">Información básica</h2>

          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Click gloss Bloomshell" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Slug (URL)</FormLabel>
                <FormControl>
                  <Input placeholder="se genera automáticamente" {...field} />
                </FormControl>
                <FormDescription>Se autogenera desde el nombre. Puedes personalizarlo.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="descripcionCorta"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Descripción corta</FormLabel>
                <FormControl>
                  <Textarea rows={2} placeholder="Aparece en la vista rápida del producto" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="descripcionLarga"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Descripción larga</FormLabel>
                <FormControl>
                  <Textarea rows={5} placeholder="Detalles completos del producto" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <section className="grid gap-5 rounded-3xl border border-border/60 bg-card p-5 sm:grid-cols-3 sm:p-6">
          <h2 className="font-heading text-lg text-foreground sm:col-span-3">Clasificación</h2>

          <FormField
            control={form.control}
            name="brandId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Marca</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Sin marca</SelectItem>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Sin categoría</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="subcategoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subcategoría</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={subcategories.length === 0}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Sin subcategoría</SelectItem>
                    {subcategories.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </section>

        <section className="grid gap-5 rounded-3xl border border-border/60 bg-card p-5 sm:grid-cols-3 sm:p-6">
          <h2 className="font-heading text-lg text-foreground sm:col-span-3">Precios</h2>

          <FormField
            control={form.control}
            name="precio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Precio (COP)</FormLabel>
                <FormControl>
                  <Input type="number" inputMode="numeric" min={0} step={1} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="precioOferta"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Precio de oferta</FormLabel>
                <FormControl>
                  <Input type="number" inputMode="numeric" min={0} step={1} placeholder="Opcional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="costo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Costo</FormLabel>
                <FormControl>
                  <Input type="number" inputMode="numeric" min={0} step={1} placeholder="Opcional · uso interno" {...field} />
                </FormControl>
                <FormDescription>No se muestra en el catálogo público.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <section className="grid gap-5 rounded-3xl border border-border/60 bg-card p-5 sm:grid-cols-3 sm:p-6">
          <div className="flex items-center justify-between gap-3 sm:col-span-3">
            <h2 className="font-heading text-lg text-foreground">Inventario</h2>
            <EstadoBadge estado={previewEstado} />
          </div>

          <FormField
            control={form.control}
            name="cantidad"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cantidad disponible</FormLabel>
                <FormControl>
                  <Input type="number" inputMode="numeric" min={0} step={1} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="stockMinimo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stock mínimo</FormLabel>
                <FormControl>
                  <Input type="number" inputMode="numeric" min={0} step={1} {...field} />
                </FormControl>
                <FormDescription>Debajo de este número se marca &quot;poco stock&quot;.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SKU</FormLabel>
                <FormControl>
                  <Input placeholder="Opcional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="codigoInterno"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código interno</FormLabel>
                <FormControl>
                  <Input placeholder="Opcional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <section className="grid gap-5 rounded-3xl border border-border/60 bg-card p-5 sm:grid-cols-2 sm:p-6">
          <h2 className="font-heading text-lg text-foreground sm:col-span-2">Visibilidad</h2>

          {(
            [
              ["activo", "Activo", "Visible en el catálogo público"],
              ["destacado", "Destacado", "Aparece en la sección de destacados"],
              ["nuevo", "Nuevo", "Aparece en la sección de nuevos"],
              ["masVendido", "Más vendido", "Aparece en la sección de más vendidos"],
            ] as const
          ).map(([name, label, description]) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-2xl border border-border/60 p-4">
                  <div className="space-y-0.5">
                    <FormLabel>{label}</FormLabel>
                    <FormDescription>{description}</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          ))}
        </section>

        <div className="sticky bottom-4 flex justify-end gap-3 rounded-2xl border border-border/60 bg-card/95 p-4 backdrop-blur">
          <Button type="button" variant="outline" render={<Link href="/admin/productos" />}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar producto"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
