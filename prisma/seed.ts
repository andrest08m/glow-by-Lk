import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

import bcrypt from "bcryptjs";
import slugify from "slugify";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type ProductStatus } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function toSlug(text: string) {
  return slugify(text, { lower: true, strict: true, locale: "es", trim: true });
}

function computeEstado(cantidad: number, stockMinimo: number): ProductStatus {
  if (cantidad <= 0) return "AGOTADO";
  if (cantidad <= stockMinimo) return "POCO_STOCK";
  return "DISPONIBLE";
}

async function seedAdminUser() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("Define ADMIN_EMAIL y ADMIN_PASSWORD en .env.local antes de correr el seed.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash, nombre: "Admin" },
  });
  console.log(`admin user listo: ${email}`);
}

async function seedSiteSettings() {
  const defaults: Record<string, string> = {
    whatsapp_number: "573000000000",
    hero_title: "Tu glow, tu estilo",
    hero_subtitle: "Maquillaje y cuidado personal, seleccionado para ti.",
  };

  for (const [clave, valor] of Object.entries(defaults)) {
    await prisma.siteSetting.upsert({ where: { clave }, update: {}, create: { clave, valor } });
  }
  console.log("ajustes del sitio listos (whatsapp_number es un placeholder, cámbialo en /admin/ajustes)");
}

async function seedBrands() {
  const nombres = [
    "Bloomshell",
    "Click Hair",
    "Got2B",
    "Prosa",
    "Lula",
    "Eelhoe",
    "ANI-K",
    "Sagui",
    "Atenea",
  ];

  const map = new Map<string, string>();
  for (const [i, nombre] of nombres.entries()) {
    const slug = toSlug(nombre);
    const brand = await prisma.brand.upsert({
      where: { slug },
      update: {},
      create: { nombre, slug, orden: i },
    });
    map.set(nombre, brand.id);
  }
  console.log(`${map.size} marcas listas`);
  return map;
}

async function seedCategories() {
  const nombres = ["Rostro", "Cabello", "Ojos", "Accesorios", "Cuidado", "Cuidado facial", "Labios"];

  const map = new Map<string, string>();
  for (const [i, nombre] of nombres.entries()) {
    const slug = toSlug(nombre);
    const category = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { nombre, slug, orden: i },
    });
    map.set(nombre, category.id);
  }
  console.log(`${map.size} categorías listas`);
  return map;
}

type SeedProduct = {
  nombre: string;
  precio: number;
  marca: string | null;
  categoria: string;
  cantidad: number;
  destacado?: boolean;
  nuevo?: boolean;
  masVendido?: boolean;
};

const SEED_PRODUCTS: SeedProduct[] = [
  { nombre: "3 Corrector PEQUEÑO Bloomshell 1 & 4", precio: 23000, marca: "Bloomshell", categoria: "Rostro", cantidad: 18 },
  { nombre: "MINI Miel 20 ml Click Hair", precio: 29900, marca: "Click Hair", categoria: "Cabello", cantidad: 22 },
  { nombre: "Termoprotector Bifásico Leche y Miel Click Hair", precio: 49900, marca: "Click Hair", categoria: "Cabello", cantidad: 30, destacado: true },
  { nombre: "Gel Got2B 35 gramos", precio: 23500, marca: "Got2B", categoria: "Cabello", cantidad: 14 },
  { nombre: "4 Pestañinas Prosa (volumen rosada y morada, efecto extensión y alargadas)", precio: 20000, marca: "Prosa", categoria: "Ojos", cantidad: 25, nuevo: true },
  { nombre: "Paquete de medias x10 pares", precio: 35000, marca: null, categoria: "Accesorios", cantidad: 40 },
  { nombre: "Pañitos Lula x 30", precio: 9000, marca: "Lula", categoria: "Cuidado", cantidad: 50 },
  { nombre: "4 Parches de colágeno frontales antiedad Eelhoe", precio: 1000, marca: "Eelhoe", categoria: "Cuidado facial", cantidad: 3 },
  { nombre: "4 Parches de colágeno nasolabial antiedad Eelhoe", precio: 1000, marca: "Eelhoe", categoria: "Cuidado facial", cantidad: 0 },
  { nombre: "Click gloss Bloomshell", precio: 17000, marca: "Bloomshell", categoria: "Labios", cantidad: 20, destacado: true },
  { nombre: "Lip Oil Bloom One Bloomshell", precio: 15000, marca: "Bloomshell", categoria: "Labios", cantidad: 16, nuevo: true },
  { nombre: "Rubor líquido ANI-K", precio: 27000, marca: "ANI-K", categoria: "Rostro", cantidad: 12 },
  { nombre: "Rubor-contorno-iluminador x3 Sagui", precio: 26000, marca: "Sagui", categoria: "Rostro", cantidad: 9, masVendido: true },
  { nombre: "Polvo pequeño ROSADO Atenea", precio: 35000, marca: "Atenea", categoria: "Rostro", cantidad: 4, masVendido: true },
  { nombre: "Polvo 2 en 1 PEQUEÑO Bloomshell rosado y natural", precio: 31500, marca: "Bloomshell", categoria: "Rostro", cantidad: 27, masVendido: true },
  { nombre: "Polvo matte mini Bloomshell", precio: 27500, marca: "Bloomshell", categoria: "Rostro", cantidad: 19 },
];

async function seedProducts(brands: Map<string, string>, categories: Map<string, string>) {
  const stockMinimo = 5;

  for (const [i, p] of SEED_PRODUCTS.entries()) {
    const slug = toSlug(p.nombre);
    await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        nombre: p.nombre,
        slug,
        precio: p.precio,
        cantidad: p.cantidad,
        stockMinimo,
        estado: computeEstado(p.cantidad, stockMinimo),
        destacado: p.destacado ?? false,
        nuevo: p.nuevo ?? false,
        masVendido: p.masVendido ?? false,
        activo: true,
        orden: i,
        brandId: p.marca ? brands.get(p.marca) : null,
        categoryId: categories.get(p.categoria),
      },
    });
  }
  console.log(`${SEED_PRODUCTS.length} productos listos (sin imágenes todavía — súbelas desde /admin/productos)`);
}

async function main() {
  await seedAdminUser();
  await seedSiteSettings();
  const brands = await seedBrands();
  const categories = await seedCategories();
  await seedProducts(brands, categories);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
