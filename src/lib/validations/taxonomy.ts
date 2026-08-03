import { z } from "zod";

export const taxonomySchema = z.object({
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(100),
  slug: z
    .string()
    .trim()
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones")
    .optional()
    .or(z.literal("")),
});

export type TaxonomyFormValues = z.infer<typeof taxonomySchema>;
