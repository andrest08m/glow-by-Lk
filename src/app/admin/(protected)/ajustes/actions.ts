"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin/guard";
import { DEFAULT_SETTINGS, type SettingKey } from "@/lib/site-settings";
import { siteSettingsSchema } from "@/lib/validations/settings";

export async function updateSiteSettings(formData: FormData) {
  await requireAdminSession();
  const db = createAdminClient();

  const keys = Object.keys(DEFAULT_SETTINGS) as SettingKey[];
  const data = siteSettingsSchema.parse(Object.fromEntries(keys.map((k) => [k, formData.get(k)])));

  const rows = keys.map((clave) => ({ clave, valor: data[clave] }));
  const { error } = await db.from("site_settings").upsert(rows, { onConflict: "clave" });
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  revalidatePath("/admin/ajustes");
}
