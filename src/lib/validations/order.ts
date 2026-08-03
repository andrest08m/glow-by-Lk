import { z } from "zod";
import { customerSchema } from "@/lib/validations/customer";

export const createOrderSchema = z
  .object({
    customerId: z.string().min(1).optional().nullable(),
    nuevoCliente: customerSchema.optional().nullable(),
    items: z
      .array(
        z.object({
          productId: z.string().min(1, "Elige un producto"),
          cantidad: z.number().int("Cantidad entera").positive("Cantidad mayor a 0"),
        })
      )
      .min(1, "Agrega al menos un producto"),
  })
  .refine((d) => d.customerId || d.nuevoCliente, {
    message: "Elige un cliente existente o crea uno nuevo",
    path: ["customerId"],
  })
  .refine((d) => new Set(d.items.map((i) => i.productId)).size === d.items.length, {
    message: "Hay productos repetidos en el pedido",
    path: ["items"],
  });

export type CreateOrderValues = z.infer<typeof createOrderSchema>;
