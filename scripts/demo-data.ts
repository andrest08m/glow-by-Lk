/**
 * Datos de demostración para DESARROLLO: clientes y pedidos retro-fechados
 * (últimas 3 semanas) usando los servicios reales, para ver el dashboard con datos.
 * Ejecutar: pnpm tsx scripts/demo-data.ts
 * NO ejecutar contra la base de producción.
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { crearPedido, cambiarEstadoPedido } from "../src/lib/order-service";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CLIENTES = [
  { nombre: "María Gómez", whatsapp: "573001112233", direccion: "Cra 10 # 20-30, Medellín" },
  { nombre: "Laura Restrepo", whatsapp: "573014445566", direccion: "Cll 45 # 12-08" },
  { nombre: "Camila Torres", whatsapp: "573027778899" },
  { nombre: "Valentina Ruiz", whatsapp: "573030001122", direccion: "Envigado" },
];

async function main() {
  const productos = await prisma.product.findMany({
    where: { activo: true, cantidad: { gt: 2 } },
    select: { id: true, cantidad: true },
  });
  if (productos.length < 3) {
    console.error("No hay suficientes productos con stock. Corre primero pnpm db:seed");
    process.exit(1);
  }

  const clientes = [];
  for (const c of CLIENTES) {
    clientes.push(
      await prisma.customer.upsert({ where: { whatsapp: c.whatsapp }, update: {}, create: c })
    );
  }
  console.log(`${clientes.length} clientes demo`);

  // ~10 pedidos repartidos en 21 días; la mayoría avanzan de estado
  const DIA = 24 * 60 * 60 * 1000;
  let creados = 0;
  for (let i = 0; i < 10; i++) {
    const cliente = clientes[i % clientes.length];
    const numItems = 1 + (i % 3);
    const elegidos = [...productos].sort(() => Math.random() - 0.5).slice(0, numItems);
    const items = elegidos.map((p) => ({ productId: p.id, cantidad: 1 + (i % 2) }));

    try {
      const pedido = await crearPedido(prisma, { customerId: cliente.id, items });
      const diasAtras = Math.floor((i / 10) * 21);
      const fecha = new Date(Date.now() - diasAtras * DIA - (i % 12) * 60 * 60 * 1000);
      await prisma.order.update({ where: { id: pedido.id }, data: { createdAt: fecha } });

      // avanzar estados: 1 queda pendiente, 1 cancelado tras confirmar, el resto vende
      if (i === 3) {
        // pendiente
      } else if (i === 7) {
        await cambiarEstadoPedido(prisma, pedido.id, "CONFIRMADO", "demo@glowbylk.com");
        await cambiarEstadoPedido(prisma, pedido.id, "CANCELADO", "demo@glowbylk.com");
      } else {
        await cambiarEstadoPedido(prisma, pedido.id, "CONFIRMADO", "demo@glowbylk.com");
        if (i % 3 === 0) {
          await cambiarEstadoPedido(prisma, pedido.id, "ENVIADO", "demo@glowbylk.com");
          await cambiarEstadoPedido(prisma, pedido.id, "ENTREGADO", "demo@glowbylk.com");
        }
      }
      creados++;
    } catch (e) {
      console.warn(`pedido ${i} omitido:`, e instanceof Error ? e.message : e);
    }
  }
  console.log(`${creados} pedidos demo creados`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
