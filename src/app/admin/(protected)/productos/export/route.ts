import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toCsv, PRODUCT_CSV_HEADERS } from "@/lib/csv";

export async function GET() {
  const session = await auth();
  if (!session?.user) return new Response("No autorizado", { status: 401 });

  const products = await prisma.product.findMany({
    include: {
      brand: { select: { nombre: true } },
      category: { select: { nombre: true } },
      subcategory: { select: { nombre: true } },
    },
    orderBy: { orden: "asc" },
  });

  const boolCsv = (v: boolean) => (v ? "si" : "no");

  const rows = products.map((p) => [
    p.nombre,
    p.sku ?? "",
    p.codigoInterno ?? "",
    Number(p.precio),
    p.precioOferta ? Number(p.precioOferta) : "",
    p.costo ? Number(p.costo) : "",
    p.cantidad,
    p.stockMinimo,
    p.brand?.nombre ?? "",
    p.category?.nombre ?? "",
    p.subcategory?.nombre ?? "",
    p.descripcionCorta ?? "",
    p.descripcionLarga ?? "",
    boolCsv(p.destacado),
    boolCsv(p.nuevo),
    boolCsv(p.masVendido),
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
