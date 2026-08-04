import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { toCsv, PRODUCT_CSV_HEADERS } from "@/lib/csv";

export async function GET() {
  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return new Response("No autorizado", { status: 401 });

  const db = createAdminClient();
  const { data: products } = await db
    .from("products")
    .select(
      "*,brand:brands(nombre),category:categories(nombre),subcategory:subcategories(nombre)"
    )
    .order("orden", { ascending: true });

  const boolCsv = (v: boolean) => (v ? "si" : "no");

  const rows = (products ?? []).map((p) => [
    p.nombre,
    p.sku ?? "",
    p.codigo_interno ?? "",
    Number(p.precio),
    p.precio_oferta != null ? Number(p.precio_oferta) : "",
    p.costo != null ? Number(p.costo) : "",
    p.cantidad,
    p.stock_minimo,
    (p.brand as { nombre: string } | null)?.nombre ?? "",
    (p.category as { nombre: string } | null)?.nombre ?? "",
    (p.subcategory as { nombre: string } | null)?.nombre ?? "",
    p.descripcion_corta ?? "",
    p.descripcion_larga ?? "",
    boolCsv(p.destacado),
    boolCsv(p.nuevo),
    boolCsv(p.mas_vendido),
    boolCsv(p.activo),
  ]);

  const fecha = new Date().toISOString().slice(0, 10);

  return new Response(toCsv([...PRODUCT_CSV_HEADERS], rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="productos-glowbylk-${fecha}.csv"`,
    },
  });
}
