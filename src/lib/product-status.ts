import { ProductStatus } from "@/generated/prisma/client";

export function computeEstado(cantidad: number, stockMinimo: number): ProductStatus {
  if (cantidad <= 0) return "AGOTADO";
  if (cantidad <= stockMinimo) return "POCO_STOCK";
  return "DISPONIBLE";
}

export function computeDescuentoPct(precio: number, precioOferta?: number | null) {
  if (!precioOferta || precioOferta <= 0 || precioOferta >= precio) return null;
  return Math.round(((precio - precioOferta) / precio) * 100);
}

export const ESTADO_LABEL: Record<ProductStatus, string> = {
  DISPONIBLE: "Disponible",
  POCO_STOCK: "Poco stock",
  AGOTADO: "Agotado",
};
