import type { OrderStatus, PrismaClient } from "@/generated/prisma/client";
import { registrarMovimiento } from "@/lib/inventory";
import { ORDER_STATUS_LABEL, ORDER_TRANSITIONS } from "@/lib/orders";

export class TransicionInvalidaError extends Error {
  constructor(desde: OrderStatus, hacia: OrderStatus) {
    super(`No se puede pasar un pedido de "${ORDER_STATUS_LABEL[desde]}" a "${ORDER_STATUS_LABEL[hacia]}".`);
    this.name = "TransicionInvalidaError";
  }
}

export type CrearPedidoInput = {
  customerId?: string | null;
  nuevoCliente?: { nombre: string; whatsapp: string; direccion?: string | null } | null;
  items: { productId: string; cantidad: number }[];
};

/**
 * Crea un pedido en estado PENDIENTE con precios snapshot (oferta si existe).
 * No toca stock: el stock se descuenta al CONFIRMAR.
 */
export async function crearPedido(prisma: PrismaClient, input: CrearPedidoInput) {
  return prisma.$transaction(async (tx) => {
    let customerId = input.customerId ?? null;
    let clienteNombre: string;
    let clienteTelefono: string;

    if (input.nuevoCliente) {
      const existente = await tx.customer.findUnique({
        where: { whatsapp: input.nuevoCliente.whatsapp },
      });
      const customer =
        existente ??
        (await tx.customer.create({
          data: {
            nombre: input.nuevoCliente.nombre,
            whatsapp: input.nuevoCliente.whatsapp,
            direccion: input.nuevoCliente.direccion || null,
          },
        }));
      customerId = customer.id;
      clienteNombre = customer.nombre;
      clienteTelefono = customer.whatsapp;
    } else if (customerId) {
      const customer = await tx.customer.findUniqueOrThrow({ where: { id: customerId } });
      clienteNombre = customer.nombre;
      clienteTelefono = customer.whatsapp;
    } else {
      throw new Error("Elige un cliente existente o crea uno nuevo.");
    }

    const ids = input.items.map((i) => i.productId);
    const productos = await tx.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, nombre: true, precio: true, precioOferta: true },
    });

    const items = input.items.map((item) => {
      const producto = productos.find((p) => p.id === item.productId);
      if (!producto) throw new Error("Uno de los productos del pedido ya no existe.");
      const precioUnitario = Number(producto.precioOferta ?? producto.precio);
      return { productId: item.productId, cantidad: item.cantidad, precioUnitario };
    });

    const total = items.reduce((sum, i) => sum + i.cantidad * i.precioUnitario, 0);

    return tx.order.create({
      data: {
        customerId,
        clienteNombre,
        clienteTelefono,
        total,
        items: { create: items },
      },
      include: { items: true },
    });
  });
}

/**
 * Cambia el estado de un pedido validando la transición.
 * - PENDIENTE -> CONFIRMADO: descuenta stock (SALIDA por ítem) en la MISMA
 *   transacción; si algún producto no alcanza, TODO se revierte con
 *   StockInsuficienteError.
 * - -> CANCELADO con stock ya descontado: lo devuelve (ENTRADA por ítem).
 */
export async function cambiarEstadoPedido(
  prisma: PrismaClient,
  orderId: string,
  nuevoEstado: OrderStatus,
  adminEmail?: string | null
) {
  return prisma.$transaction(
    async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { items: true },
      });

      if (!ORDER_TRANSITIONS[order.estado].includes(nuevoEstado)) {
        throw new TransicionInvalidaError(order.estado, nuevoEstado);
      }

      let stockDescontado = order.stockDescontado;

      if (nuevoEstado === "CONFIRMADO" && !order.stockDescontado) {
        for (const item of order.items) {
          await registrarMovimiento(tx, {
            productId: item.productId,
            tipo: "SALIDA",
            cantidad: item.cantidad,
            motivo: `Pedido #${order.numero}`,
            adminEmail,
            orderId: order.id,
          });
        }
        stockDescontado = true;
      }

      if (nuevoEstado === "CANCELADO" && order.stockDescontado) {
        for (const item of order.items) {
          await registrarMovimiento(tx, {
            productId: item.productId,
            tipo: "ENTRADA",
            cantidad: item.cantidad,
            motivo: `Cancelación pedido #${order.numero}`,
            adminEmail,
            orderId: order.id,
          });
        }
        stockDescontado = false;
      }

      return tx.order.update({
        where: { id: orderId },
        data: { estado: nuevoEstado, stockDescontado },
      });
    },
    // margen amplio: un pedido grande contra la pooler de Supabase hace varias queries por ítem
    { timeout: 20000 }
  );
}
