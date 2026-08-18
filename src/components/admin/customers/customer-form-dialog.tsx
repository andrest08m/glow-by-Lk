"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { customerSchema, type CustomerFormValues } from "@/lib/validations/customer";
import { createCustomer, updateCustomer } from "@/app/admin/(protected)/clientes/actions";

export function CustomerFormDialog({
  mode,
  customer,
}: {
  mode: "create" | "edit";
  customer?: { id: string; nombre: string; whatsapp: string; direccion: string | null };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      nombre: customer?.nombre ?? "",
      whatsapp: customer?.whatsapp ?? "",
      direccion: customer?.direccion ?? "",
    },
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      form.reset({
        nombre: customer?.nombre ?? "",
        whatsapp: customer?.whatsapp ?? "",
        direccion: customer?.direccion ?? "",
      });
    }
  }

  function onSubmit(values: CustomerFormValues) {
    const fd = new FormData();
    fd.append("nombre", values.nombre);
    fd.append("whatsapp", values.whatsapp ?? "");
    fd.append("direccion", values.direccion ?? "");

    startTransition(async () => {
      const result =
        mode === "create" ? await createCustomer(fd) : await updateCustomer(customer!.id, fd);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(mode === "create" ? "Cliente creado" : "Cliente actualizado");
      setOpen(false);
      router.refresh();
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
            aria-label={mode === "edit" ? "Editar cliente" : undefined}
          />
        }
      >
        {mode === "create" ? (
          <>
            <Plus className="size-4" /> Nuevo cliente
          </>
        ) : (
          <Pencil className="size-4" />
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nuevo cliente" : "Editar cliente"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: María Gómez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="whatsapp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp (opcional)</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" placeholder="3001234567" {...field} />
                  </FormControl>
                  <FormDescription>Celular de 10 dígitos. Podés dejarlo vacío.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="direccion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Opcional — para envíos" {...field} />
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
