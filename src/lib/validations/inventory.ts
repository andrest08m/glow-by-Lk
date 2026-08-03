import { z } from "zod";

export const movementSchema = z.object({
  productId: z.string().min(1, "Elige un producto"),
  tipo: z.enum(["ENTRADA", "SALIDA", "AJUSTE"]),
  cantidad: z.coerce
    .number({ message: "Ingresa una cantidad" })
    .int("Debe ser un número entero")
    .nonnegative("No puede ser negativa"),
  motivo: z.string().trim().max(300, "Máximo 300 caracteres").optional().or(z.literal("")),
});

export type MovementFormValues = z.input<typeof movementSchema>;

export const MOVEMENT_TYPE_LABEL = {
  ENTRADA: "Entrada",
  SALIDA: "Salida",
  AJUSTE: "Ajuste",
} as const;
