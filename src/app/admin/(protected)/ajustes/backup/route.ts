import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return new Response("No autorizado", { status: 401 });

  const db = createAdminClient();

  const tablas = [
    "products",
    "product_images",
    "brands",
    "categories",
    "subcategories",
    "site_settings",
    "customers",
    "orders",
    "order_items",
    "inventory_movements",
  ] as const;

  const results = await Promise.all(tablas.map((t) => db.from(t).select("*")));
  const data = Object.fromEntries(tablas.map((t, i) => [t, results[i].data ?? []]));

  const backup = {
    app: "glow-by-lk",
    exportadoEn: new Date().toISOString(),
    nota: "Respaldo manual de la base de datos (tablas públicas). Los usuarios admin viven en Supabase Auth y no se incluyen aquí.",
    tablas: data,
  };

  const fecha = new Date().toISOString().slice(0, 10);

  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="backup-glowbylk-${fecha}.json"`,
    },
  });
}
