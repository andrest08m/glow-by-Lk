/**
 * Prueba de importación CSV (previewImport/applyImport) contra la base real.
 * Ejecutar: pnpm tsx scripts/test-import.ts
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

let failures = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FALLO  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main() {
  const { previewImport, applyImport } = await import("../src/lib/admin/import-products");

  const stamp = Date.now();
  const base = await prisma.product.create({
    data: {
      nombre: "TEST import base (borrar)",
      slug: `test-import-${stamp}`,
      sku: `TST-${stamp}`,
      precio: 10000,
      cantidad: 8,
      stockMinimo: 3,
      estado: "DISPONIBLE",
      activo: false,
    },
  });

  const rows: Record<string, string>[] = [
    // actualizar por SKU: nuevo precio y cantidad que dispara POCO_STOCK
    {
      nombre: "TEST import base RENOMBRADO (borrar)",
      sku: `TST-${stamp}`,
      codigoInterno: "",
      precio: "12500",
      cantidad: "2",
      stockMinimo: "3",
      marca: "MarcaImport (borrar)",
      categoria: "CatImport (borrar)",
      activo: "no",
    },
    // crear nuevo
    {
      nombre: `TEST import nuevo ${stamp} (borrar)`,
      sku: `TST-NEW-${stamp}`,
      precio: "5000",
      cantidad: "10",
      stockMinimo: "2",
      destacado: "si",
      activo: "no",
    },
    // fila con error (precio inválido)
    { nombre: "TEST fila mala", precio: "-99", cantidad: "1" },
  ];

  console.log("\n— vista previa —");
  const preview = await previewImport(rows);
  check("1 a actualizar", preview.actualizar === 1, `=${preview.actualizar}`);
  check("1 a crear", preview.crear === 1, `=${preview.crear}`);
  check("1 con error", preview.errores === 1, `=${preview.errores}`);
  check(
    "match reporta 'sku'",
    preview.filas.find((f) => f.accion === "actualizar")?.matchPor === "sku"
  );
  check(
    "el error menciona el precio",
    preview.filas.find((f) => f.accion === "error")?.error?.includes("precio") ?? false,
    preview.filas.find((f) => f.accion === "error")?.error
  );

  console.log("\n— aplicar —");
  const result = await applyImport(rows);
  check("aplicó 1 creado", result.creados === 1, `=${result.creados}`);
  check("aplicó 1 actualizado", result.actualizados === 1, `=${result.actualizados}`);
  check("omitió 1", result.omitidos === 1, `=${result.omitidos}`);

  const actualizado = await prisma.product.findUniqueOrThrow({
    where: { id: base.id },
    include: { brand: true, category: true },
  });
  check("precio actualizado a 12500", Number(actualizado.precio) === 12500, `=${actualizado.precio}`);
  check("cantidad actualizada a 2", actualizado.cantidad === 2);
  check("estado recalculado a POCO_STOCK", actualizado.estado === "POCO_STOCK", actualizado.estado);
  check("marca creada y asociada", actualizado.brand?.nombre === "MarcaImport (borrar)");
  check("categoría creada y asociada", actualizado.category?.nombre === "CatImport (borrar)");

  const creado = await prisma.product.findFirst({ where: { sku: `TST-NEW-${stamp}` } });
  check("producto nuevo existe", !!creado);
  check("nuevo con slug generado", !!creado?.slug && creado.slug.startsWith("test-import-nuevo"));
  check("nuevo destacado=true", creado?.destacado === true);

  // limpieza
  await prisma.product.deleteMany({ where: { id: { in: [base.id, creado?.id ?? ""] } } });
  await prisma.brand.deleteMany({ where: { nombre: "MarcaImport (borrar)" } });
  await prisma.category.deleteMany({ where: { nombre: "CatImport (borrar)" } });
  console.log("\nlimpieza lista");

  console.log(failures === 0 ? "\nTODO OK" : `\n${failures} FALLOS`);
  process.exit(failures === 0 ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
