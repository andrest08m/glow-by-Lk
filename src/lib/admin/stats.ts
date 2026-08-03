import { prisma } from "@/lib/prisma";

export async function getDashboardStats() {
  const [total, activos, pocoStock, agotados, categorias, marcas, alertas] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { activo: true } }),
    prisma.product.count({ where: { estado: "POCO_STOCK" } }),
    prisma.product.count({ where: { estado: "AGOTADO" } }),
    prisma.category.count(),
    prisma.brand.count(),
    prisma.product.findMany({
      where: { activo: true, estado: { in: ["POCO_STOCK", "AGOTADO"] } },
      orderBy: { cantidad: "asc" },
      take: 6,
      select: { id: true, nombre: true, slug: true, cantidad: true, stockMinimo: true, estado: true },
    }),
  ]);

  return { total, activos, pocoStock, agotados, categorias, marcas, alertas };
}
