import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const DEFAULT_SETTINGS = {
  whatsapp_number: "573000000000",
  hero_title: "Tu glow, tu estilo",
  hero_subtitle: "Maquillaje y cuidado personal, seleccionado para ti.",
} as const;

export type SettingKey = keyof typeof DEFAULT_SETTINGS;

export const SETTING_LABELS: Record<SettingKey, string> = {
  whatsapp_number: "Número de WhatsApp (solo dígitos, con indicativo de país. Ej: 573001234567)",
  hero_title: "Título del hero (portada)",
  hero_subtitle: "Subtítulo del hero (portada)",
};

export const getSiteSettings = cache(async (): Promise<Record<SettingKey, string>> => {
  const rows = await prisma.siteSetting.findMany();
  const map = new Map(rows.map((r) => [r.clave, r.valor]));

  const keys = Object.keys(DEFAULT_SETTINGS) as SettingKey[];
  return Object.fromEntries(
    keys.map((key) => [key, map.get(key) ?? DEFAULT_SETTINGS[key]])
  ) as Record<SettingKey, string>;
});
