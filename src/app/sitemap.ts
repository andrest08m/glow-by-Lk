import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

// se genera en cada request (evita consultar la DB durante el build)
export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = createAdminClient();
  const [{ data: products }, { data: categories }] = await Promise.all([
    db.from("products").select("slug,updated_at").eq("activo", true),
    db.from("categories").select("slug"),
  ]);

  return [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/productos`, changeFrequency: "daily", priority: 0.9 },
    ...(categories ?? []).map((c) => ({
      url: `${siteUrl}/productos?categoria=${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...(products ?? []).map((p) => ({
      url: `${siteUrl}/producto/${p.slug}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
