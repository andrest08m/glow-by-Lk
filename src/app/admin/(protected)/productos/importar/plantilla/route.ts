import { auth } from "@/auth";
import { toCsv, PRODUCT_CSV_HEADERS } from "@/lib/csv";

export async function GET() {
  const session = await auth();
  if (!session?.user) return new Response("No autorizado", { status: 401 });

  const ejemplo = [
    "Labial mate rosa",
    "LAB-001",
    "INT-045",
    "25000",
    "19900",
    "12000",
    "10",
    "3",
    "Bloomshell",
    "Labios",
    "Labiales",
    "Labial de larga duración",
    "Descripción completa del producto...",
    "no",
    "si",
    "no",
    "si",
  ];

  return new Response(toCsv([...PRODUCT_CSV_HEADERS], [ejemplo]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plantilla-productos-glowbylk.csv"',
    },
  });
}
