import { createClient } from "@/lib/supabase/server";
import { computeDescuentoPct } from "@/lib/product-status";
import type { ProductCardDTO, ProductDetailDTO } from "@/types/product";
import type { ProductStatus } from "@/lib/supabase/database.types";

// Selección para tarjetas: producto + imágenes + marca + categoría (embeds por FK).
const CARD_SELECT =
  "id,nombre,slug,precio,precio_oferta,estado,destacado,nuevo,mas_vendido," +
  "images:product_images(url,orden),brand:brands(nombre,slug),category:categories(nombre,slug)";

type CardRow = {
  id: string;
  nombre: string;
  slug: string;
  precio: number;
  precio_oferta: number | null;
  estado: ProductStatus;
  destacado: boolean;
  nuevo: boolean;
  mas_vendido: boolean;
  images: { url: string; orden: number }[] | null;
  brand: { nombre: string; slug: string } | null;
  category: { nombre: string; slug: string } | null;
};

function mainImage(images: { url: string; orden: number }[] | null) {
  if (!images || images.length === 0) return null;
  return [...images].sort((a, b) => a.orden - b.orden)[0].url;
}

function serializeCard(p: CardRow): ProductCardDTO {
  const precio = Number(p.precio);
  const precioOferta = p.precio_oferta != null ? Number(p.precio_oferta) : null;
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
    masVendido: p.mas_vendido,
    imagenPrincipal: mainImage(p.images),
    marca: p.brand ? { nombre: p.brand.nombre, slug: p.brand.slug } : null,
    categoria: p.category ? { nombre: p.category.nombre, slug: p.category.slug } : null,
  };
}

export async function getFeaturedProducts(limit = 8): Promise<ProductCardDTO[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(CARD_SELECT)
    .eq("activo", true)
    .eq("destacado", true)
    .order("orden", { ascending: true })
    .limit(limit);
  return ((data as CardRow[] | null) ?? []).map(serializeCard);
}

export async function getNewProducts(limit = 8): Promise<ProductCardDTO[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(CARD_SELECT)
    .eq("activo", true)
    .eq("nuevo", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data as CardRow[] | null) ?? []).map(serializeCard);
}

export async function getBestSellers(limit = 8): Promise<ProductCardDTO[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(CARD_SELECT)
    .eq("activo", true)
    .eq("mas_vendido", true)
    .order("orden", { ascending: true })
    .limit(limit);
  return ((data as CardRow[] | null) ?? []).map(serializeCard);
}

export async function getProductBySlug(slug: string): Promise<ProductDetailDTO | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(
      "*,images:product_images(id,url,alt,orden),tonos:product_tonos(id,nombre,imagen,orden)," +
        "brand:brands(nombre,slug),category:categories(nombre,slug),subcategory:subcategories(nombre,slug)"
    )
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle();

  if (!data) return null;
  const p = data as unknown as CardRow & {
    tonos: { id: string; nombre: string; imagen: string | null; orden: number }[] | null;
    codigo_interno: string | null;
    sku: string | null;
    descripcion_corta: string | null;
    descripcion_larga: string | null;
    cantidad: number;
    images: { id: string; url: string; alt: string | null; orden: number }[] | null;
    subcategory: { nombre: string; slug: string } | null;
  };

  const precio = Number(p.precio);
  const precioOferta = p.precio_oferta != null ? Number(p.precio_oferta) : null;
  const images = [...(p.images ?? [])].sort((a, b) => a.orden - b.orden);

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
    masVendido: p.mas_vendido,
    imagenPrincipal: images[0]?.url ?? null,
    marca: p.brand ? { nombre: p.brand.nombre, slug: p.brand.slug } : null,
    categoria: p.category ? { nombre: p.category.nombre, slug: p.category.slug } : null,
    codigoInterno: p.codigo_interno,
    sku: p.sku,
    descripcionCorta: p.descripcion_corta,
    descripcionLarga: p.descripcion_larga,
    cantidad: p.cantidad,
    images: images.map((img) => ({ id: img.id, url: img.url, alt: img.alt, orden: img.orden })),
    tonos: [...(p.tonos ?? [])]
      .sort((a, b) => a.orden - b.orden)
      .map((t) => ({ id: t.id, nombre: t.nombre, imagen: t.imagen })),
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
  const supabase = await createClient();

  // Resolver slugs de marca/categoría a ids (filtro simple y confiable).
  let brandId: string | undefined;
  let categoryId: string | undefined;
  if (marca) {
    const { data } = await supabase.from("brands").select("id").eq("slug", marca).maybeSingle();
    brandId = data?.id ?? "__none__";
  }
  if (categoria) {
    const { data } = await supabase.from("categories").select("id").eq("slug", categoria).maybeSingle();
    categoryId = data?.id ?? "__none__";
  }

  let query = supabase
    .from("products")
    .select(CARD_SELECT, { count: "exact" })
    .eq("activo", true);

  if (q) query = query.ilike("nombre", `%${q}%`);
  if (brandId) query = query.eq("brand_id", brandId);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (disponibilidad) query = query.eq("estado", disponibilidad);
  if (precioMin !== undefined) query = query.gte("precio", precioMin);
  if (precioMax !== undefined) query = query.lte("precio", precioMax);

  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("orden", { ascending: true })
    .range(from, from + pageSize - 1);

  const total = count ?? 0;
  return {
    items: ((data as CardRow[] | null) ?? []).map(serializeCard),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getCategoriesWithImage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id,nombre,slug,imagen,orden")
    .order("orden", { ascending: true });
  return data ?? [];
}

export async function getBrands() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brands")
    .select("id,nombre,slug,imagen,orden")
    .order("orden", { ascending: true });
  return data ?? [];
}
