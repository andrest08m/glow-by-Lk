import type { ProductStatus } from "@/generated/prisma/client";

export type ProductImageDTO = {
  id: string;
  url: string;
  alt: string | null;
  orden: number;
};

export type ProductCardDTO = {
  id: string;
  nombre: string;
  slug: string;
  precio: number;
  precioOferta: number | null;
  descuentoPct: number | null;
  estado: ProductStatus;
  destacado: boolean;
  nuevo: boolean;
  masVendido: boolean;
  imagenPrincipal: string | null;
  marca: { nombre: string; slug: string } | null;
  categoria: { nombre: string; slug: string } | null;
};

export type ProductDetailDTO = ProductCardDTO & {
  codigoInterno: string | null;
  sku: string | null;
  descripcionCorta: string | null;
  descripcionLarga: string | null;
  cantidad: number;
  images: ProductImageDTO[];
  subcategoria: { nombre: string; slug: string } | null;
};
