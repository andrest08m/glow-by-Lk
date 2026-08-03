import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeEstado } from "@/lib/product-status";
import { toSlug, uniqueSlug } from "@/lib/slug";

const emptyToUndefined = (v: unknown) => {
  if (typeof v !== "string") return v;
  const t = v.trim();
  return t === "" ? undefined : t.replace(",", ".");
};

const boolish = z.preprocess((v) => {
  if (typeof v !== "string") return v;
  const t = v.trim().toLowerCase();
  if (["si", "sí", "true", "1", "x", "yes"].includes(t)) return true;
  if (["no", "false", "0", ""].includes(t)) return false;
  return v;
}, z.boolean().optional());

const rowSchema = z.object({
  nombre: z.string().trim().min(2, "nombre muy corto").max(200),
  sku: z.string().trim().max(100).optional().default(""),
  codigoInterno: z.string().trim().max(100).optional().default(""),
  precio: z.preprocess(emptyToUndefined, z.coerce.number({ message: "precio inválido" }).positive("precio debe ser > 0")),
  precioOferta: z.preprocess(emptyToUndefined, z.coerce.number().positive().optional()),
  costo: z.preprocess(emptyToUndefined, z.coerce.number().nonnegative().optional()),
  cantidad: z.preprocess(emptyToUndefined, z.coerce.number().int("cantidad debe ser entera").nonnegative().optional()),
  stockMinimo: z.preprocess(emptyToUndefined, z.coerce.number().int().nonnegative().optional()),
  marca: z.string().trim().max(100).optional().default(""),
  categoria: z.string().trim().max(100).optional().default(""),
  subcategoria: z.string().trim().max(100).optional().default(""),
  descripcionCorta: z.string().trim().max(300).optional().default(""),
  descripcionLarga: z.string().trim().max(5000).optional().default(""),
  destacado: boolish,
  nuevo: boolish,
  masVendido: boolish,
  activo: boolish,
});

export type ImportRow = Record<string, string>;

export type RowPlan = {
  fila: number;
  accion: "crear" | "actualizar" | "error";
  nombre: string;
  matchPor?: "sku" | "codigoInterno";
  error?: string;
};

export type ImportPreview = {
  crear: number;
  actualizar: number;
  errores: number;
  filas: RowPlan[];
};

type ParsedRow = z.output<typeof rowSchema>;

async function planRows(rows: ImportRow[]) {
  const parsed: { fila: number; data?: ParsedRow; error?: string }[] = rows.map((raw, i) => {
    const result = rowSchema.safeParse(raw);
    if (!result.success) {
      const issue = result.error.issues[0];
      return { fila: i + 2, error: `${issue?.path.join(".") || "fila"}: ${issue?.message ?? "inválida"}` };
    }
    return { fila: i + 2, data: result.data };
  });

  const skus = parsed.flatMap((p) => (p.data?.sku ? [p.data.sku] : []));
  const codigos = parsed.flatMap((p) => (p.data?.codigoInterno ? [p.data.codigoInterno] : []));

  const existentes = await prisma.product.findMany({
    where: {
      OR: [
        ...(skus.length ? [{ sku: { in: skus } }] : []),
        ...(codigos.length ? [{ codigoInterno: { in: codigos } }] : []),
      ],
    },
    select: { id: true, sku: true, codigoInterno: true },
  });

  const porSku = new Map(existentes.filter((p) => p.sku).map((p) => [p.sku!, p.id]));
  const porCodigo = new Map(existentes.filter((p) => p.codigoInterno).map((p) => [p.codigoInterno!, p.id]));

  return parsed.map((p) => {
    if (!p.data) {
      return { fila: p.fila, plan: { fila: p.fila, accion: "error" as const, nombre: rows[p.fila - 2]?.nombre ?? "", error: p.error } };
    }
    const matchSku = p.data.sku ? porSku.get(p.data.sku) : undefined;
    const matchCodigo = p.data.codigoInterno ? porCodigo.get(p.data.codigoInterno) : undefined;
    const targetId = matchSku ?? matchCodigo;
    return {
      fila: p.fila,
      data: p.data,
      targetId,
      plan: {
        fila: p.fila,
        accion: (targetId ? "actualizar" : "crear") as "crear" | "actualizar",
        nombre: p.data.nombre,
        matchPor: matchSku ? ("sku" as const) : matchCodigo ? ("codigoInterno" as const) : undefined,
      },
    };
  });
}

export async function previewImport(rows: ImportRow[]): Promise<ImportPreview> {
  const planned = await planRows(rows);
  const filas = planned.map((p) => p.plan);
  return {
    crear: filas.filter((f) => f.accion === "crear").length,
    actualizar: filas.filter((f) => f.accion === "actualizar").length,
    errores: filas.filter((f) => f.accion === "error").length,
    filas,
  };
}

export async function applyImport(rows: ImportRow[]) {
  const planned = await planRows(rows);
  const validas = planned.filter((p) => p.data);

  let creados = 0;
  let actualizados = 0;

  await prisma.$transaction(
    async (tx) => {
      const brandCache = new Map<string, string>();
      const categoryCache = new Map<string, string>();
      const subcategoryCache = new Map<string, string>();

      async function resolveBrand(nombre: string) {
        const key = nombre.toLowerCase();
        if (brandCache.has(key)) return brandCache.get(key)!;
        let brand = await tx.brand.findFirst({ where: { nombre: { equals: nombre, mode: "insensitive" } } });
        if (!brand) {
          const max = await tx.brand.aggregate({ _max: { orden: true } });
          brand = await tx.brand.create({
            data: { nombre, slug: toSlug(nombre), orden: (max._max.orden ?? 0) + 1 },
          });
        }
        brandCache.set(key, brand.id);
        return brand.id;
      }

      async function resolveCategory(nombre: string) {
        const key = nombre.toLowerCase();
        if (categoryCache.has(key)) return categoryCache.get(key)!;
        let category = await tx.category.findFirst({ where: { nombre: { equals: nombre, mode: "insensitive" } } });
        if (!category) {
          const max = await tx.category.aggregate({ _max: { orden: true } });
          category = await tx.category.create({
            data: { nombre, slug: toSlug(nombre), orden: (max._max.orden ?? 0) + 1 },
          });
        }
        categoryCache.set(key, category.id);
        return category.id;
      }

      async function resolveSubcategory(categoryId: string, nombre: string) {
        const key = `${categoryId}:${nombre.toLowerCase()}`;
        if (subcategoryCache.has(key)) return subcategoryCache.get(key)!;
        let sub = await tx.subcategory.findFirst({
          where: { categoryId, nombre: { equals: nombre, mode: "insensitive" } },
        });
        if (!sub) {
          const max = await tx.subcategory.aggregate({ where: { categoryId }, _max: { orden: true } });
          sub = await tx.subcategory.create({
            data: { categoryId, nombre, slug: toSlug(nombre), orden: (max._max.orden ?? 0) + 1 },
          });
        }
        subcategoryCache.set(key, sub.id);
        return sub.id;
      }

      for (const item of validas) {
        const data = item.data!;
        const brandId = data.marca ? await resolveBrand(data.marca) : null;
        const categoryId = data.categoria ? await resolveCategory(data.categoria) : null;
        const subcategoryId =
          categoryId && data.subcategoria ? await resolveSubcategory(categoryId, data.subcategoria) : null;

        const base = {
          nombre: data.nombre,
          sku: data.sku || null,
          codigoInterno: data.codigoInterno || null,
          precio: data.precio,
          precioOferta: data.precioOferta ?? null,
          costo: data.costo ?? null,
          descripcionCorta: data.descripcionCorta || null,
          descripcionLarga: data.descripcionLarga || null,
          brandId,
          categoryId,
          subcategoryId,
        };

        if (item.targetId) {
          const existing = await tx.product.findUniqueOrThrow({
            where: { id: item.targetId },
            select: { cantidad: true, stockMinimo: true },
          });
          const cantidad = data.cantidad ?? existing.cantidad;
          const stockMinimo = data.stockMinimo ?? existing.stockMinimo;
          await tx.product.update({
            where: { id: item.targetId },
            data: {
              ...base,
              cantidad,
              stockMinimo,
              estado: computeEstado(cantidad, stockMinimo),
              ...(data.destacado !== undefined ? { destacado: data.destacado } : {}),
              ...(data.nuevo !== undefined ? { nuevo: data.nuevo } : {}),
              ...(data.masVendido !== undefined ? { masVendido: data.masVendido } : {}),
              ...(data.activo !== undefined ? { activo: data.activo } : {}),
            },
          });
          actualizados++;
        } else {
          const cantidad = data.cantidad ?? 0;
          const stockMinimo = data.stockMinimo ?? 5;
          const slug = await uniqueSlug(data.nombre, (s) =>
            tx.product.findUnique({ where: { slug: s } }).then(Boolean)
          );
          await tx.product.create({
            data: {
              ...base,
              slug,
              cantidad,
              stockMinimo,
              estado: computeEstado(cantidad, stockMinimo),
              destacado: data.destacado ?? false,
              nuevo: data.nuevo ?? false,
              masVendido: data.masVendido ?? false,
              activo: data.activo ?? true,
            },
          });
          creados++;
        }
      }
    },
    { timeout: 120000 }
  );

  return { creados, actualizados, omitidos: planned.length - validas.length };
}
