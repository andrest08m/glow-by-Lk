import { z } from "zod";

export const customerSchema = z.object({
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(120),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/, "Solo dígitos, con indicativo de país (ej: 573001234567)"),
  direccion: z.string().trim().max(300, "Máximo 300 caracteres").optional().or(z.literal("")),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
