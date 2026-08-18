import { z } from "zod";

export const customerSchema = z.object({
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(120),
  // Teléfono opcional. Si se ingresa, debe ser un celular de 10 dígitos.
  whatsapp: z
    .string()
    .trim()
    .regex(/^\d{10}$|^57\d{10}$/, "Número de celular de 10 dígitos (ej: 3001234567)")
    .optional()
    .or(z.literal("")),
  direccion: z.string().trim().max(300, "Máximo 300 caracteres").optional().or(z.literal("")),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
