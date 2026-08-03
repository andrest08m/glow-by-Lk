import { Prisma, type ProductStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const adminListInclude = {
  images: { orderBy: { orden: "asc" as const }, take: 1 },
  brand: { select: { nombre: true } },
  category: { select: { nombre: true } },
} satisfies Prisma.ProductInclude;

export type AdminProductFilters = {
  q?: string;
  marca?: string;
  categoria?: string;
  estado?: ProductStatus;
  page?: number;
  pageSize?: number;
};

export async function adminSearchProducts(filters: AdminProductFilters) {
  const { q, marca, categoria, estado, page = 1, pageSize = 20 } = filters;

  const where: Prisma.ProductWhereInput = {
    ...(q ? { nombre: { contains: q, mode: "insensitive" } } : {}),
    ...(marca ? { brandId: marca } : {}),
    ...(categoria ? { categoryId: categoria } : {}),
    ...(estado ? { estado } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: adminListInclude,
      orderBy: [{ activo: "desc" }, { orden: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
