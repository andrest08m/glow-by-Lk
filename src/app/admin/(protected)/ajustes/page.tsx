import type { Metadata } from "next";
import { DatabaseBackup } from "lucide-react";
import { Button } from "@/components/ui/button";
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

      <div className="space-y-3 rounded-3xl border border-border/60 bg-card p-5 sm:p-6">
        <h2 className="font-heading text-lg text-foreground">Respaldo de datos</h2>
        <p className="text-sm text-muted-foreground">
          Descarga un archivo JSON con todas las tablas (productos, pedidos, clientes,
          inventario...). Supabase ya hace copias automáticas del proyecto; este es un respaldo
          extra bajo demanda para guardar donde quieras.
        </p>
        <Button variant="outline" className="gap-1.5" render={<a href="/admin/ajustes/backup" download />}>
          <DatabaseBackup className="size-4" /> Descargar respaldo JSON
        </Button>
      </div>
    </div>
  );
}
