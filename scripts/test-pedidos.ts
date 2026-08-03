/**
 * Prueba del ciclo de vida de pedidos contra la base de datos real.
 * Ejecutar: pnpm tsx scripts/test-pedidos.ts
 *
 * Verifica: creación PENDIENTE sin tocar stock, confirmación que descuenta en
 * transacción, bloqueo total si un ítem no alcanza (rollback), devolución de
 * stock al cancelar, transiciones inválidas y snapshot de precio de oferta.
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { StockInsuficienteError } from "../src/lib/inventory";
import { crearPedido, cambiarEstadoPedido, TransicionInvalidaError } from "../src/lib/order-service";

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

async function stockDe(id: string) {
  return (await prisma.product.findUniqueOrThrow({ where: { id }, select: { cantidad: true } })).cantidad;
}

async function main() {
  const stamp = Date.now();
  const [prodA, prodB] = await Promise.all([
    prisma.product.create({
      data: {
        nombre: "TEST pedido A (borrar)",
        slug: `test-pedido-a-${stamp}`,
        precio: 10000,
        precioOferta: 8000,
        cantidad: 10,
        stockMinimo: 2,
        estado: "DISPONIBLE",
        activo: false,
      },
    }),
    prisma.product.create({
      data: {
        nombre: "TEST pedido B (borrar)",
        slug: `test-pedido-b-${stamp}`,
        precio: 5000,
        cantidad: 3,
        stockMinimo: 1,
        estado: "DISPONIBLE",
        activo: false,
      },
    }),
  ]);

  console.log("\n— creación con cliente nuevo —");
  const pedido = await crearPedido(prisma, {
    nuevoCliente: { nombre: "Cliente Test", whatsapp: `5730099${String(stamp).slice(-6)}` },
    items: [
      { productId: prodA.id, cantidad: 2 },
      { productId: prodB.id, cantidad: 1 },
    ],
  });
  check("pedido creado PENDIENTE", pedido.estado === "PENDIENTE");
  check("cliente creado al vuelo", !!pedido.customerId);
  check("precio snapshot usa la oferta (8000)", Number(pedido.items[0].precioUnitario) === 8000);
  check("total = 2*8000 + 1*5000 = 21000", Number(pedido.total) === 21000, `total=${pedido.total}`);
  check("crear NO toca stock A", (await stockDe(prodA.id)) === 10);
  check("crear NO toca stock B", (await stockDe(prodB.id)) === 3);

  console.log("\n— transición inválida —");
  let transErr = false;
  try {
    await cambiarEstadoPedido(prisma, pedido.id, "ENTREGADO");
  } catch (e) {
    transErr = e instanceof TransicionInvalidaError;
  }
  check("PENDIENTE -> ENTREGADO rechazado", transErr);

  console.log("\n— confirmar descuenta stock —");
  await cambiarEstadoPedido(prisma, pedido.id, "CONFIRMADO", "test@glowbylk.com");
  check("stock A 10 -> 8", (await stockDe(prodA.id)) === 8);
  check("stock B 3 -> 2", (await stockDe(prodB.id)) === 2);
  const movsConfirm = await prisma.inventoryMovement.count({ where: { orderId: pedido.id, tipo: "SALIDA" } });
  check("2 movimientos SALIDA ligados al pedido", movsConfirm === 2, `movs=${movsConfirm}`);

  console.log("\n— cancelar devuelve stock —");
  await cambiarEstadoPedido(prisma, pedido.id, "CANCELADO", "test@glowbylk.com");
  check("stock A restaurado a 10", (await stockDe(prodA.id)) === 10);
  check("stock B restaurado a 3", (await stockDe(prodB.id)) === 3);
  const movsCancel = await prisma.inventoryMovement.count({ where: { orderId: pedido.id, tipo: "ENTRADA" } });
  check("2 movimientos ENTRADA de la cancelación", movsCancel === 2, `movs=${movsCancel}`);
  const cancelado = await prisma.order.findUniqueOrThrow({ where: { id: pedido.id } });
  check("stockDescontado quedó en false", cancelado.stockDescontado === false);

  console.log("\n— confirmación bloqueada por stock insuficiente (rollback total) —");
  const pedidoGrande = await crearPedido(prisma, {
    customerId: pedido.customerId,
    items: [
      { productId: prodA.id, cantidad: 5 }, // alcanza (hay 10)
      { productId: prodB.id, cantidad: 99 }, // NO alcanza (hay 3)
    ],
  });
  let stockErr: StockInsuficienteError | null = null;
  try {
    await cambiarEstadoPedido(prisma, pedidoGrande.id, "CONFIRMADO");
  } catch (e) {
    if (e instanceof StockInsuficienteError) stockErr = e;
  }
  check("lanza StockInsuficienteError", !!stockErr);
  check("el mensaje nombra el producto", stockErr?.message.includes("TEST pedido B") ?? false, stockErr?.message);
  check("rollback: stock A intacto (10)", (await stockDe(prodA.id)) === 10);
  check("rollback: stock B intacto (3)", (await stockDe(prodB.id)) === 3);
  const sigue = await prisma.order.findUniqueOrThrow({ where: { id: pedidoGrande.id } });
  check("el pedido sigue PENDIENTE", sigue.estado === "PENDIENTE");
  const movsFallido = await prisma.inventoryMovement.count({ where: { orderId: pedidoGrande.id } });
  check("sin movimientos del intento fallido", movsFallido === 0, `movs=${movsFallido}`);

  console.log("\n— flujo completo hasta entregado —");
  await cambiarEstadoPedido(prisma, pedidoGrande.id, "CANCELADO");
  const pedidoOk = await crearPedido(prisma, {
    customerId: pedido.customerId,
    items: [{ productId: prodB.id, cantidad: 2 }],
  });
  await cambiarEstadoPedido(prisma, pedidoOk.id, "CONFIRMADO");
  await cambiarEstadoPedido(prisma, pedidoOk.id, "EN_PREPARACION");
  await cambiarEstadoPedido(prisma, pedidoOk.id, "ENVIADO");
  await cambiarEstadoPedido(prisma, pedidoOk.id, "ENTREGADO");
  const entregado = await prisma.order.findUniqueOrThrow({ where: { id: pedidoOk.id } });
  check("llegó a ENTREGADO", entregado.estado === "ENTREGADO");
  check("stock B en 1 tras entrega", (await stockDe(prodB.id)) === 1);
  let cancelEntregado = false;
  try {
    await cambiarEstadoPedido(prisma, pedidoOk.id, "CANCELADO");
  } catch (e) {
    cancelEntregado = e instanceof TransicionInvalidaError;
  }
  check("ENTREGADO no se puede cancelar", cancelEntregado);

  // limpieza: pedidos de prueba (items caen en cascada), luego productos y cliente
  await prisma.order.deleteMany({ where: { id: { in: [pedido.id, pedidoGrande.id, pedidoOk.id] } } });
  await prisma.product.deleteMany({ where: { id: { in: [prodA.id, prodB.id] } } });
  await prisma.customer.delete({ where: { id: pedido.customerId! } });
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
