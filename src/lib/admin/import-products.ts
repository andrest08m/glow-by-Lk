import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
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
type AdminDb = ReturnType<typeof createAdminClient>;

type Planned = {
  fila: number;
  data?: ParsedRow;
  targetId?: string;
  plan: RowPlan;
};

async function planRows(db: AdminDb, rows: ImportRow[]): Promise<Planned[]> {
  const parsed = rows.map((raw, i) => {
    const result = rowSchema.safeParse(raw);
    if (!result.success) {
      const issue = result.error.issues[0];
      return { fila: i + 2, error: `${issue?.path.join(".") || "fila"}: ${issue?.message ?? "inválida"}` };
    }
    return { fila: i + 2, data: result.data };
  });

  const skus = parsed.flatMap((p) => (p.data?.sku ? [p.data.sku] : []));
  const codigos = parsed.flatMap((p) => (p.data?.codigoInterno ? [p.data.codigoInterno] : []));

  const existentes: { id: string; sku: string | null; codigo_interno: string | null }[] = [];
  if (skus.length) {
    const { data } = await db.from("products").select("id,sku,codigo_interno").in("sku", skus);
    existentes.push(...(data ?? []));
  }
  if (codigos.length) {
    const { data } = await db.from("products").select("id,sku,codigo_interno").in("codigo_interno", codigos);
    for (const row of data ?? []) if (!existentes.some((e) => e.id === row.id)) existentes.push(row);
  }

  const porSku = new Map(existentes.filter((p) => p.sku).map((p) => [p.sku!, p.id]));
  const porCodigo = new Map(existentes.filter((p) => p.codigo_interno).map((p) => [p.codigo_interno!, p.id]));

  return parsed.map((p) => {
    if (!p.data) {
      return {
        fila: p.fila,
        plan: { fila: p.fila, accion: "error" as const, nombre: rows[p.fila - 2]?.nombre ?? "", error: p.error },
      };
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
  const db = createAdminClient();
  const planned = await planRows(db, rows);
  const filas = planned.map((p) => p.plan);
  return {
    crear: filas.filter((f) => f.accion === "crear").length,
    actualizar: filas.filter((f) => f.accion === "actualizar").length,
    errores: filas.filter((f) => f.accion === "error").length,
    filas,
  };
}

export async function applyImport(rows: ImportRow[]) {
  const db = createAdminClient();
  const planned = await planRows(db, rows);
  const validas = planned.filter((p) => p.data);

  const brandCache = new Map<string, string>();
  const categoryCache = new Map<string, string>();
  const subcategoryCache = new Map<string, string>();

  async function resolveTaxonomy(
    table: "brands" | "categories",
    cache: Map<string, string>,
    nombre: string
  ) {
    const key = nombre.toLowerCase();
    if (cache.has(key)) return cache.get(key)!;
    const { data: found } = await db.from(table).select("id").ilike("nombre", nombre).limit(1);
    let id = found?.[0]?.id;
    if (!id) {
      const { data: max } = await db.from(table).select("orden").order("orden", { ascending: false }).limit(1);
      const { data: created } = await db
        .from(table)
        .insert({ nombre, slug: toSlug(nombre), orden: (max?.[0]?.orden ?? 0) + 1 })
        .select("id")
        .single();
      id = created!.id;
    }
    cache.set(key, id);
    return id;
  }

  async function resolveSubcategory(categoryId: string, nombre: string) {
    const key = `${categoryId}:${nombre.toLowerCase()}`;
    if (subcategoryCache.has(key)) return subcategoryCache.get(key)!;
    const { data: found } = await db
      .from("subcategories")
      .select("id")
      .eq("category_id", categoryId)
      .ilike("nombre", nombre)
      .limit(1);
    let id = found?.[0]?.id;
    if (!id) {
      const { data: max } = await db
        .from("subcategories")
        .select("orden")
        .eq("category_id", categoryId)
        .order("orden", { ascending: false })
        .limit(1);
      const { data: created } = await db
        .from("subcategories")
        .insert({ category_id: categoryId, nombre, slug: toSlug(nombre), orden: (max?.[0]?.orden ?? 0) + 1 })
        .select("id")
        .single();
      id = created!.id;
    }
    subcategoryCache.set(key, id);
    return id;
  }

  async function slugExists(slug: string) {
    const { data } = await db.from("products").select("id").eq("slug", slug).limit(1);
    return (data?.length ?? 0) > 0;
  }

  let creados = 0;
  let actualizados = 0;

  for (const item of validas) {
    const data = item.data!;
    const brandId = data.marca ? await resolveTaxonomy("brands", brandCache, data.marca) : null;
    const categoryId = data.categoria ? await resolveTaxonomy("categories", categoryCache, data.categoria) : null;
    const subcategoryId =
      categoryId && data.subcategoria ? await resolveSubcategory(categoryId, data.subcategoria) : null;

    const base = {
      nombre: data.nombre,
      sku: data.sku || null,
      codigo_interno: data.codigoInterno || null,
      precio: data.precio,
      precio_oferta: data.precioOferta ?? null,
      costo: data.costo ?? null,
      descripcion_corta: data.descripcionCorta || null,
      descripcion_larga: data.descripcionLarga || null,
      brand_id: brandId,
      category_id: categoryId,
      subcategory_id: subcategoryId,
    };

    if (item.targetId) {
      const { data: existing } = await db
        .from("products")
        .select("cantidad,stock_minimo")
        .eq("id", item.targetId)
        .single();
      const cantidad = data.cantidad ?? existing?.cantidad ?? 0;
      const stockMinimo = data.stockMinimo ?? existing?.stock_minimo ?? 5;
      await db
        .from("products")
        .update({
          ...base,
          cantidad,
          stock_minimo: stockMinimo,
          estado: computeEstado(cantidad, stockMinimo),
          ...(data.destacado !== undefined ? { destacado: data.destacado } : {}),
          ...(data.nuevo !== undefined ? { nuevo: data.nuevo } : {}),
          ...(data.masVendido !== undefined ? { mas_vendido: data.masVendido } : {}),
          ...(data.activo !== undefined ? { activo: data.activo } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.targetId);
      actualizados++;
    } else {
      const cantidad = data.cantidad ?? 0;
      const stockMinimo = data.stockMinimo ?? 5;
      const slug = await uniqueSlug(data.nombre, slugExists);
      await db.from("products").insert({
        ...base,
        slug,
        cantidad,
        stock_minimo: stockMinimo,
        estado: computeEstado(cantidad, stockMinimo),
        destacado: data.destacado ?? false,
        nuevo: data.nuevo ?? false,
        mas_vendido: data.masVendido ?? false,
        activo: data.activo ?? true,
      });
      creados++;
    }
  }

  return { creados, actualizados, omitidos: planned.length - validas.length };
}
