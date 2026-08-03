/**
 * CSV con `;` como separador (formato regional de Excel en Colombia) y BOM
 * UTF-8 para que Excel muestre bien las tildes.
 */
const SEP = ";";
const BOM = "﻿";

function escapeCell(value: string) {
  if (value.includes(SEP) || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]) {
  const lines = [headers, ...rows].map((row) =>
    row.map((cell) => escapeCell(cell === null || cell === undefined ? "" : String(cell))).join(SEP)
  );
  return BOM + lines.join("\r\n");
}

export const PRODUCT_CSV_HEADERS = [
  "nombre",
  "sku",
  "codigoInterno",
  "precio",
  "precioOferta",
  "costo",
  "cantidad",
  "stockMinimo",
  "marca",
  "categoria",
  "subcategoria",
  "descripcionCorta",
  "descripcionLarga",
  "destacado",
  "nuevo",
  "masVendido",
  "activo",
] as const;

/** normaliza encabezados: minúsculas, sin tildes ni espacios (Categoría -> categoria) */
export function normalizeHeader(header: string) {
  return header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "");
}

const HEADER_ALIASES: Record<string, (typeof PRODUCT_CSV_HEADERS)[number]> = {
  nombre: "nombre",
  producto: "nombre",
  sku: "sku",
  codigointerno: "codigoInterno",
  codigo: "codigoInterno",
  precio: "precio",
  preciooferta: "precioOferta",
  oferta: "precioOferta",
  costo: "costo",
  cantidad: "cantidad",
  stock: "cantidad",
  stockminimo: "stockMinimo",
  minimo: "stockMinimo",
  marca: "marca",
  categoria: "categoria",
  subcategoria: "subcategoria",
  descripcioncorta: "descripcionCorta",
  descripcionlarga: "descripcionLarga",
  descripcion: "descripcionCorta",
  destacado: "destacado",
  nuevo: "nuevo",
  masvendido: "masVendido",
  activo: "activo",
};

export function mapHeader(header: string) {
  return HEADER_ALIASES[normalizeHeader(header)] ?? null;
}
