"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SingleImageField, type ImageFieldValue } from "@/components/admin/taxonomy/single-image-field";
import { taxonomySchema } from "@/lib/validations/taxonomy";
import { toSlug } from "@/lib/slug";

type FormState = { nombre: string; slug: string };

export function TaxonomyFormDialog({
  mode,
  title,
  entity,
  withImage = false,
  action,
}: {
  mode: "create" | "edit";
  title: string;
  entity?: { id: string; nombre: string; slug: string; imagen?: string | null } | null;
  withImage?: boolean;
  action: (formData: FormData) => Promise<unknown>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [image, setImage] = useState<ImageFieldValue>({
    file: undefined,
    previewUrl: entity?.imagen ?? null,
    removed: false,
  });

  const form = useForm<FormState>({
    resolver: zodResolver(taxonomySchema) as never,
    defaultValues: { nombre: entity?.nombre ?? "", slug: entity?.slug ?? "" },
  });

  const nombre = form.watch("nombre");
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

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      form.reset({ nombre: entity?.nombre ?? "", slug: entity?.slug ?? "" });
      setImage({ file: undefined, previewUrl: entity?.imagen ?? null, removed: false });
    }
  }

  async function onSubmit(values: FormState) {
    const fd = new FormData();
    fd.append("nombre", values.nombre);
    fd.append("slug", values.slug);
    if (withImage) {
      if (image.file) fd.append("imagen", image.file);
      else if (image.removed) fd.append("removeImagen", "true");
    }

    startTransition(async () => {
      try {
        await action(fd);
        toast.success(mode === "create" ? "Creado correctamente" : "Actualizado correctamente");
        setOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Ocurrió un error");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant={mode === "create" ? "default" : "ghost"}
            size={mode === "create" ? "default" : "icon-sm"}
            className={mode === "create" ? "gap-1.5" : undefined}
            aria-label={mode === "edit" ? "Editar" : undefined}
          />
        }
      >
        {mode === "create" ? (
          <>
            <Plus className="size-4" /> {title}
          </>
        ) : (
          <Pencil className="size-4" />
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {withImage && <SingleImageField value={image} onChange={setImage} />}

            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="se genera automáticamente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
