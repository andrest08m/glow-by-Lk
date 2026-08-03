import { z } from "zod";

export const siteSettingsSchema = z.object({
  whatsapp_number: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/, "Solo dígitos, con indicativo de país (ej: 573001234567)"),
  hero_title: z.string().trim().min(2, "Mínimo 2 caracteres").max(120),
  hero_subtitle: z.string().trim().min(2, "Mínimo 2 caracteres").max(300),
});

export type SiteSettingsValues = z.infer<typeof siteSettingsSchema>;
