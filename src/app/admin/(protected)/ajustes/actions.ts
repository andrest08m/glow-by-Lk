"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin/guard";
import { DEFAULT_SETTINGS, type SettingKey } from "@/lib/site-settings";
import { siteSettingsSchema } from "@/lib/validations/settings";

export async function updateSiteSettings(formData: FormData) {
  await requireAdminSession();

  const keys = Object.keys(DEFAULT_SETTINGS) as SettingKey[];
  const data = siteSettingsSchema.parse(Object.fromEntries(keys.map((k) => [k, formData.get(k)])));

  await prisma.$transaction(
    keys.map((key) =>
      prisma.siteSetting.upsert({
        where: { clave: key },
        update: { valor: data[key] },
        create: { clave: key, valor: data[key] },
      })
    )
  );

  revalidatePath("/", "layout");
  revalidatePath("/admin/ajustes");
}
