/**
 * Seed para el proyecto Supabase de glow by Lk.
 * Ejecutar (con las migraciones ya aplicadas): pnpm tsx scripts/seed.ts
 * Lee credenciales de .env.local (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY,
 * y ADMIN_EMAIL / ADMIN_PASSWORD para crear el usuario admin de Supabase Auth).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminEmail = process.env.ADMIN_EMAIL || "admin@glowbylk.com";
const adminPassword = process.env.ADMIN_PASSWORD || "glowbylk2026";

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const SETTINGS = {
  whatsapp_number: "573000000000",
  hero_title: "Tu glow, tu estilo",
  hero_subtitle: "Maquillaje y cuidado personal, seleccionado para ti.",
};

// nombre, precio, marca, categoria
const PRODUCTS: [string, number, string, string][] = [
  ["3 Corrector PEQUEÑO Bloomshell 1 & 4", 23000, "Bloomshell", "Rostro"],
  ["MINI Miel 20 ml Click Hair", 29900, "Click Hair", "Cabello"],
  ["Termoprotector Bifásico Leche y Miel Click Hair", 49900, "Click Hair", "Cabello"],
  ["Gel Got2B 35 gramos", 23500, "Got2B", "Cabello"],
  ["4 Pestañinas Prosa (volumen rosada y morada, efecto extensión y alargadas)", 20000, "Prosa", "Ojos"],
  ["Paquete de medias x10 pares", 35000, "Sin marca", "Accesorios"],
  ["Pañitos Lula x 30", 9000, "Lula", "Cuidado"],
  ["4 Parches de colágeno frontales antiedad Eelhoe", 1000, "Eelhoe", "Cuidado facial"],
  ["4 Parches de colágeno nasolabial antiedad Eelhoe", 1000, "Eelhoe", "Cuidado facial"],
  ["Click gloss Bloomshell", 17000, "Bloomshell", "Labios"],
  ["Lip Oil Bloom One Bloomshell", 15000, "Bloomshell", "Labios"],
  ["Rubor líquido ANI-K", 27000, "ANI-K", "Rostro"],
  ["Rubor-contorno-iluminador x3 Sagui", 26000, "Sagui", "Rostro"],
  ["Polvo pequeño ROSADO Atenea", 35000, "Atenea", "Rostro"],
  ["Polvo 2 en 1 PEQUEÑO Bloomshell rosado y natural", 31500, "Bloomshell", "Rostro"],
  ["Polvo matte mini Bloomshell", 27500, "Bloomshell", "Rostro"],
];

async function main() {
  // 1. Admin (Supabase Auth)
  const { data: users } = await db.auth.admin.listUsers();
  const existing = users?.users.find((u) => u.email === adminEmail);
  if (!existing) {
    const { error } = await db.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });
    if (error) throw error;
    console.log(`admin creado: ${adminEmail}`);
  } else {
    console.log(`admin ya existía: ${adminEmail}`);
  }

  // 2. Ajustes
  await db
    .from("site_settings")
    .upsert(Object.entries(SETTINGS).map(([clave, valor]) => ({ clave, valor })), { onConflict: "clave" });
  console.log("ajustes listos");

  // 3. Marcas y categorías
  const marcas = [...new Set(PRODUCTS.map((p) => p[2]))];
  const categorias = [...new Set(PRODUCTS.map((p) => p[3]))];

  const brandId = new Map<string, string>();
  for (let i = 0; i < marcas.length; i++) {
    const nombre = marcas[i];
    const { data } = await db
      .from("brands")
      .upsert({ nombre, slug: slugify(nombre), orden: i + 1 }, { onConflict: "slug" })
      .select("id")
      .single();
    brandId.set(nombre, data!.id);
  }
  const catId = new Map<string, string>();
  for (let i = 0; i < categorias.length; i++) {
    const nombre = categorias[i];
    const { data } = await db
      .from("categories")
      .upsert({ nombre, slug: slugify(nombre), orden: i + 1 }, { onConflict: "slug" })
      .select("id")
      .single();
    catId.set(nombre, data!.id);
  }
  console.log(`${marcas.length} marcas, ${categorias.length} categorías`);

  // 4. Productos
  let n = 0;
  for (let i = 0; i < PRODUCTS.length; i++) {
    const [nombre, precio, marca, categoria] = PRODUCTS[i];
    const slug = slugify(nombre);
    const { error } = await db.from("products").upsert(
      {
        nombre,
        slug,
        precio,
        cantidad: 10,
        stock_minimo: 3,
        estado: "DISPONIBLE",
        activo: true,
        nuevo: i < 4,
        destacado: i % 5 === 0,
        mas_vendido: i % 4 === 0,
        orden: i + 1,
        brand_id: brandId.get(marca) ?? null,
        category_id: catId.get(categoria) ?? null,
      },
      { onConflict: "slug" }
    );
    if (error) console.warn(`producto "${nombre}":`, error.message);
    else n++;
  }
  console.log(`${n} productos listos (sin imágenes — súbelas desde /admin/productos)`);
  console.log("\nSeed completo.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
