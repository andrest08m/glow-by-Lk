import { Prisma } from "@/generated/prisma/client";
import type { ProductStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { computeDescuentoPct } from "@/lib/product-status";
import type { ProductCardDTO, ProductDetailDTO } from "@/types/product";

const cardInclude = {
  images: { orderBy: { orden: "asc" as const }, take: 1 },
  brand: { select: { nombre: true, slug: true } },
  category: { select: { nombre: true, slug: true } },
} satisfies Prisma.ProductInclude;

type ProductCardRow = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

function serializeCard(p: ProductCardRow): ProductCardDTO {
  const precio = Number(p.precio);
  const precioOferta = p.precioOferta ? Number(p.precioOferta) : null;
  return {
    id: p.id,
    nombre: p.nombre,
    slug: p.slug,
    precio,
    precioOferta,
    descuentoPct: computeDescuentoPct(precio, precioOferta),
    estado: p.estado,
    destacado: p.destacado,
    nuevo: p.nuevo,
    masVendido: p.masVendido,
    imagenPrincipal: p.images[0]?.url ?? null,
    marca: p.brand ? { nombre: p.brand.nombre, slug: p.brand.slug } : null,
    categoria: p.category ? { nombre: p.category.nombre, slug: p.category.slug } : null,
  };
}

export async function getFeaturedProducts(limit = 8) {
  const rows = await prisma.product.findMany({
    where: { activo: true, destacado: true },
    include: cardInclude,
    orderBy: { orden: "asc" },
    take: limit,
  });
  return rows.map(serializeCard);
}

export async function getNewProducts(limit = 8) {
  const rows = await prisma.product.findMany({
    where: { activo: true, nuevo: true },
    include: cardInclude,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(serializeCard);
}

export async function getBestSellers(limit = 8) {
  const rows = await prisma.product.findMany({
    where: { activo: true, masVendido: true },
    include: cardInclude,
    orderBy: { orden: "asc" },
    take: limit,
  });
  return rows.map(serializeCard);
}

export async function getProductBySlug(slug: string): Promise<ProductDetailDTO | null> {
  const p = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { orden: "asc" } },
      brand: { select: { nombre: true, slug: true } },
      category: { select: { nombre: true, slug: true } },
      subcategory: { select: { nombre: true, slug: true } },
    },
  });
  if (!p || !p.activo) return null;

  const precio = Number(p.precio);
  const precioOferta = p.precioOferta ? Number(p.precioOferta) : null;

  return {
    id: p.id,
    nombre: p.nombre,
    slug: p.slug,
    precio,
    precioOferta,
    descuentoPct: computeDescuentoPct(precio, precioOferta),
    estado: p.estado,
    destacado: p.destacado,
    nuevo: p.nuevo,
    masVendido: p.masVendido,
    imagenPrincipal: p.images[0]?.url ?? null,
    marca: p.brand ? { nombre: p.brand.nombre, slug: p.brand.slug } : null,
    categoria: p.category ? { nombre: p.category.nombre, slug: p.category.slug } : null,
    codigoInterno: p.codigoInterno,
    sku: p.sku,
    descripcionCorta: p.descripcionCorta,
    descripcionLarga: p.descripcionLarga,
    cantidad: p.cantidad,
    images: p.images.map((img) => ({ id: img.id, url: img.url, alt: img.alt, orden: img.orden })),
    subcategoria: p.subcategory ? { nombre: p.subcategory.nombre, slug: p.subcategory.slug } : null,
  };
}

export type ProductFilters = {
  q?: string;
  marca?: string;
  categoria?: string;
  precioMin?: number;
  precioMax?: number;
  disponibilidad?: ProductStatus;
  page?: number;
  pageSize?: number;
};

export async function searchProducts(filters: ProductFilters) {
  const { q, marca, categoria, precioMin, precioMax, disponibilidad, page = 1, pageSize = 24 } = filters;

  const where: Prisma.ProductWhereInput = {
    activo: true,
    ...(q ? { nombre: { contains: q, mode: "insensitive" } } : {}),
    ...(marca ? { brand: { slug: marca } } : {}),
    ...(categoria ? { category: { slug: categoria } } : {}),
    ...(disponibilidad ? { estado: disponibilidad } : {}),
    ...(precioMin !== undefined || precioMax !== undefined
      ? {
          precio: {
            ...(precioMin !== undefined ? { gte: precioMin } : {}),
            ...(precioMax !== undefined ? { lte: precioMax } : {}),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: cardInclude,
      orderBy: { orden: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: rows.map(serializeCard),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getCategoriesWithImage() {
  return prisma.category.findMany({ orderBy: { orden: "asc" } });
}

export async function getBrands() {
  return prisma.brand.findMany({ orderBy: { orden: "asc" } });
}
