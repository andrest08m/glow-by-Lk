"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { movementSchema } from "@/lib/validations/inventory";
import { createMovement } from "@/app/admin/(protected)/inventario/actions";

export type ProductOption = { id: string; nombre: string; cantidad: number };

type FormState = {
  productId: string;
  tipo: "ENTRADA" | "SALIDA" | "AJUSTE";
  cantidad: string;
  motivo: string;
};

export function MovementDialog({
  products,
  fixedProductId,
  triggerLabel = "Registrar movimiento",
}: {
  products: ProductOption[];
  fixedProductId?: string;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<FormState | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormState>({
    resolver: zodResolver(movementSchema) as never,
    defaultValues: {
      productId: fixedProductId ?? "",
      tipo: "ENTRADA",
      cantidad: "",
      motivo: "",
    },
  });

  const tipo = form.watch("tipo");
  const productId = form.watch("productId");
  const selectedProduct = products.find((p) => p.id === productId);

  function submitToServer(values: FormState) {
    const fd = new FormData();
    fd.append("productId", values.productId);
    fd.append("tipo", values.tipo);
    fd.append("cantidad", values.cantidad);
    fd.append("motivo", values.motivo);

    startTransition(async () => {
      const result = await createMovement(fd);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Movimiento registrado");
      setOpen(false);
      form.reset({ productId: fixedProductId ?? "", tipo: "ENTRADA", cantidad: "", motivo: "" });
      router.refresh();
    });
  }

  function onSubmit(values: FormState) {
    if (values.tipo === "AJUSTE") {
      setPendingValues(values);
      setConfirmOpen(true);
      return;
    }
    submitToServer(values);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button className="gap-1.5" />}>
          <PackagePlus className="size-4" /> {triggerLabel}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar movimiento</DialogTitle>
            <DialogDescription>
              Entradas y salidas actualizan el stock del producto al instante.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {!fixedProductId && (
                <FormField
                  control={form.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Producto</FormLabel>
                      <Select value={field.value || null} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              {selectedProduct ? selectedProduct.nombre : "Elige un producto"}
                            </SelectValue>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nombre} · {p.cantidad} uds
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de movimiento</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ENTRADA">Entrada (reposición)</SelectItem>
                        <SelectItem value="SALIDA">Salida (venta / merma)</SelectItem>
                        <SelectItem value="AJUSTE">Ajuste (conteo físico)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cantidad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {tipo === "AJUSTE" ? "Cantidad final (tras el conteo)" : "Cantidad"}
                    </FormLabel>
                    <FormControl>
                      <Input type="number" inputMode="numeric" min={0} step={1} {...field} />
                    </FormControl>
                    {tipo === "AJUSTE" && selectedProduct && (
                      <FormDescription>
                        Cantidad actual: {selectedProduct.cantidad}. El sistema guardará la
                        diferencia en el kardex.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="motivo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder={
                          tipo === "ENTRADA"
                            ? "Ej: llegó pedido del proveedor"
                            : tipo === "SALIDA"
                              ? "Ej: venta por WhatsApp"
                              : "Ej: conteo físico de fin de mes"
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Guardando..." : "Registrar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar ajuste de inventario?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedProduct
                ? `"${selectedProduct.nombre}" pasará de ${selectedProduct.cantidad} a ${pendingValues?.cantidad ?? "?"} unidades.`
                : `La cantidad quedará fijada en ${pendingValues?.cantidad ?? "?"} unidades.`}{" "}
              Esta corrección quedará registrada en el kardex.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={() => {
                if (pendingValues) submitToServer(pendingValues);
                setConfirmOpen(false);
              }}
            >
              Confirmar ajuste
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
