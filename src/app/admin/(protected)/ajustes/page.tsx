import type { Metadata } from "next";
import { SettingsForm } from "./settings-form";
import { getSiteSettings } from "@/lib/site-settings";

export const metadata: Metadata = { title: "Ajustes" };

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-foreground sm:text-3xl">Ajustes del sitio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Estos textos y el número de WhatsApp se muestran en el catálogo público.
        </p>
      </div>
      <SettingsForm defaultValues={settings} />
    </div>
  );
}
