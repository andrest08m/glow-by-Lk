/**
 * Prueba del servicio de inventario contra la base de datos real.
 * Ejecutar: pnpm tsx scripts/test-inventario.ts
 *
 * Crea un producto desechable, ejercita entrada/salida/ajuste, verifica
 * rollback de transacciones compuestas y la guarda atómica bajo concurrencia,
 * y elimina el producto al final (los movimientos caen en cascada).
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { registrarMovimiento, StockInsuficienteError } from "../src/lib/inventory";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

let failures = 0;

function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ok  ${name}`);
  } else {
    failures++;
    console.error(`FALLO  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function getProducto(id: string) {
  return prisma.product.findUniqueOrThrow({
    where: { id },
    select: { cantidad: true, estado: true },
  });
}

async function main() {
  const producto = await prisma.product.create({
    data: {
      nombre: "TEST inventario (borrar)",
      slug: `test-inventario-${Date.now()}`,
      precio: 1000,
      cantidad: 20,
      stockMinimo: 5,
      estado: "DISPONIBLE",
      activo: false,
    },
  });
  const id = producto.id;
  console.log("\n— entrada / salida / ajuste —");

  await prisma.$transaction((tx) =>
    registrarMovimiento(tx, { productId: id, tipo: "ENTRADA", cantidad: 5, motivo: "test entrada" })
  );
  let p = await getProducto(id);
  check("ENTRADA +5 => 25", p.cantidad === 25, `cantidad=${p.cantidad}`);

  await prisma.$transaction((tx) =>
    registrarMovimiento(tx, { productId: id, tipo: "SALIDA", cantidad: 3, motivo: "test salida" })
  );
  p = await getProducto(id);
  check("SALIDA 3 => 22", p.cantidad === 22, `cantidad=${p.cantidad}`);

  await prisma.$transaction((tx) =>
    registrarMovimiento(tx, { productId: id, tipo: "AJUSTE", cantidad: 10, motivo: "conteo test" })
  );
  p = await getProducto(id);
  check("AJUSTE fija en 10", p.cantidad === 10, `cantidad=${p.cantidad}`);

  const ajuste = await prisma.inventoryMovement.findFirst({
    where: { productId: id, tipo: "AJUSTE" },
    orderBy: { fecha: "desc" },
  });
  check("AJUSTE guarda delta -12", ajuste?.cantidad === -12, `delta=${ajuste?.cantidad}`);
  check("AJUSTE guarda saldo 10", ajuste?.saldoResultante === 10, `saldo=${ajuste?.saldoResultante}`);

  console.log("\n— estados —");
  await prisma.$transaction((tx) =>
    registrarMovimiento(tx, { productId: id, tipo: "SALIDA", cantidad: 6, motivo: "bajar a poco stock" })
  );
  p = await getProducto(id);
  check("cantidad 4 <= minimo 5 => POCO_STOCK", p.estado === "POCO_STOCK", `estado=${p.estado}`);

  await prisma.$transaction((tx) =>
    registrarMovimiento(tx, { productId: id, tipo: "AJUSTE", cantidad: 0, motivo: "agotar" })
  );
  p = await getProducto(id);
  check("cantidad 0 => AGOTADO", p.estado === "AGOTADO", `estado=${p.estado}`);

  console.log("\n— stock insuficiente y rollback —");
  await prisma.$transaction((tx) =>
    registrarMovimiento(tx, { productId: id, tipo: "AJUSTE", cantidad: 8, motivo: "preparar rollback" })
  );

  let errorCorrecto = false;
  const movimientosAntes = await prisma.inventoryMovement.count({ where: { productId: id } });
  try {
    // transacción compuesta: una entrada válida + una salida imposible => TODO debe revertirse
    await prisma.$transaction(async (tx) => {
      await registrarMovimiento(tx, { productId: id, tipo: "ENTRADA", cantidad: 100, motivo: "no debe quedar" });
      await registrarMovimiento(tx, { productId: id, tipo: "SALIDA", cantidad: 999, motivo: "imposible" });
    });
  } catch (e) {
    errorCorrecto = e instanceof StockInsuficienteError;
  }
  p = await getProducto(id);
  const movimientosDespues = await prisma.inventoryMovement.count({ where: { productId: id } });
  check("SALIDA imposible lanza StockInsuficienteError", errorCorrecto);
  check("rollback: cantidad sigue en 8", p.cantidad === 8, `cantidad=${p.cantidad}`);
  check(
    "rollback: la ENTRADA +100 de la misma transacción no quedó registrada",
    movimientosDespues === movimientosAntes,
    `antes=${movimientosAntes} después=${movimientosDespues}`
  );

  console.log("\n— concurrencia: dos salidas de 6 con stock 8 —");
  const resultados = await Promise.allSettled([
    prisma.$transaction((tx) =>
      registrarMovimiento(tx, { productId: id, tipo: "SALIDA", cantidad: 6, motivo: "carrera A" })
    ),
    prisma.$transaction((tx) =>
      registrarMovimiento(tx, { productId: id, tipo: "SALIDA", cantidad: 6, motivo: "carrera B" })
    ),
  ]);
  const exitos = resultados.filter((r) => r.status === "fulfilled").length;
  const rechazosPorStock = resultados.filter(
    (r) => r.status === "rejected" && r.reason instanceof StockInsuficienteError
  ).length;
  p = await getProducto(id);
  check("exactamente 1 salida gana la carrera", exitos === 1, `éxitos=${exitos}`);
  check("la otra falla por stock insuficiente", rechazosPorStock === 1, `rechazos=${rechazosPorStock}`);
  check("cantidad final 2 (nunca negativa)", p.cantidad === 2, `cantidad=${p.cantidad}`);

  await prisma.product.delete({ where: { id } });
  const restantes = await prisma.inventoryMovement.count({ where: { productId: id } });
  check("\nlimpieza: movimientos eliminados en cascada", restantes === 0, `quedan=${restantes}`);

  console.log(failures === 0 ? "\nTODO OK" : `\n${failures} FALLOS`);
  process.exit(failures === 0 ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
