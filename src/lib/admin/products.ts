import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProductStatus } from "@/lib/supabase/database.types";

export type AdminProductFilters = {
  q?: string;
  marca?: string; // brand id
  categoria?: string; // category id
  estado?: ProductStatus;
  page?: number;
  pageSize?: number;
};

const ADMIN_SELECT =
  "id,nombre,precio,precio_oferta,cantidad,estado,activo," +
  "images:product_images(url,orden),brand:brands(nombre),category:categories(nombre)";

export type AdminProductListRow = {
  id: string;
  nombre: string;
  precio: number;
  precio_oferta: number | null;
  cantidad: number;
  estado: ProductStatus;
  activo: boolean;
  images: { url: string; orden: number }[] | null;
  brand: { nombre: string } | null;
  category: { nombre: string } | null;
};

export async function adminSearchProducts(filters: AdminProductFilters) {
  const { q, marca, categoria, estado, page = 1, pageSize = 20 } = filters;
  const supabase = createAdminClient();

  let query = supabase.from("products").select(ADMIN_SELECT, { count: "exact" });
  if (q) query = query.ilike("nombre", `%${q}%`);
  if (marca) query = query.eq("brand_id", marca);
  if (categoria) query = query.eq("category_id", categoria);
  if (estado) query = query.eq("estado", estado);

  const from = (page - 1) * pageSize;
  const { data, count } = await query
    .order("activo", { ascending: false })
    .order("orden", { ascending: true })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  const total = count ?? 0;
  return {
    items: (data as AdminProductListRow[] | null) ?? [],
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
