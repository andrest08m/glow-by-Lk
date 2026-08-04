import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/products/product-form";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  const db = createAdminClient();
  const [{ data: brands }, { data: categories }] = await Promise.all([
    db.from("brands").select("id,nombre").order("orden", { ascending: true }),
    db
      .from("categories")
      .select("id,nombre,subcategories(id,nombre,orden)")
      .order("orden", { ascending: true }),
  ]);

  const categoriesMapped = (categories ?? []).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    subcategories: [...(c.subcategories ?? [])]
      .sort((a, b) => a.orden - b.orden)
      .map((s) => ({ id: s.id, nombre: s.nombre })),
  }));

  return <ProductForm mode="create" brands={brands ?? []} categories={categoriesMapped} />;
}
