import type { MovementType, Prisma } from "@/generated/prisma/client";
import { computeEstado } from "@/lib/product-status";

export type TxClient = Prisma.TransactionClient;

export class StockInsuficienteError extends Error {
  constructor(
    public productoNombre: string,
    public disponible: number,
    public solicitado: number
  ) {
    super(
      `Stock insuficiente de "${productoNombre}": quedan ${disponible} y se pidieron ${solicitado}.`
    );
    this.name = "StockInsuficienteError";
  }
}

export type MovimientoInput = {
  productId: string;
  tipo: MovementType;
  /** ENTRADA/SALIDA: unidades (positivo). AJUSTE: cantidad final exacta tras conteo físico. */
  cantidad: number;
  motivo?: string | null;
  adminEmail?: string | null;
  orderId?: string | null;
};

/**
 * Registra un movimiento de inventario y actualiza Product.cantidad + estado.
 * SIEMPRE debe llamarse dentro de prisma.$transaction — recibe el cliente
 * transaccional para que pedidos pueda componer N movimientos atómicos.
 *
 * La SALIDA usa una guarda atómica (update condicional cantidad >= n): si dos
 * ventas simultáneas compiten por el mismo stock, una de las dos falla con
 * StockInsuficienteError y su transacción completa se revierte.
 */
export async function registrarMovimiento(tx: TxClient, input: MovimientoInput) {
  const { productId, tipo, cantidad, motivo, adminEmail, orderId } = input;

  if (!Number.isInteger(cantidad)) throw new Error("La cantidad debe ser un número entero.");
  if (tipo !== "AJUSTE" && cantidad <= 0) throw new Error("La cantidad debe ser mayor a 0.");
  if (tipo === "AJUSTE" && cantidad < 0) throw new Error("La cantidad final no puede ser negativa.");

  let delta: number;

  if (tipo === "ENTRADA") {
    await tx.product.update({
      where: { id: productId },
      data: { cantidad: { increment: cantidad } },
    });
    delta = cantidad;
  } else if (tipo === "SALIDA") {
    const updated = await tx.product.updateMany({
      where: { id: productId, cantidad: { gte: cantidad } },
      data: { cantidad: { decrement: cantidad } },
    });
    if (updated.count === 0) {
      const p = await tx.product.findUniqueOrThrow({
        where: { id: productId },
        select: { nombre: true, cantidad: true },
      });
      throw new StockInsuficienteError(p.nombre, p.cantidad, cantidad);
    }
    delta = -cantidad;
  } else {
    // AJUSTE: fija la cantidad exacta (conteo físico); el kardex guarda el delta con signo
    const before = await tx.product.findUniqueOrThrow({
      where: { id: productId },
      select: { cantidad: true },
    });
    delta = cantidad - before.cantidad;
    await tx.product.update({ where: { id: productId }, data: { cantidad } });
  }

  const after = await tx.product.findUniqueOrThrow({
    where: { id: productId },
    select: { cantidad: true, stockMinimo: true },
  });
  await tx.product.update({
    where: { id: productId },
    data: { estado: computeEstado(after.cantidad, after.stockMinimo) },
  });

  return tx.inventoryMovement.create({
    data: {
      productId,
      tipo,
      cantidad: delta,
      saldoResultante: after.cantidad,
      motivo: motivo || null,
      adminEmail: adminEmail || null,
      orderId: orderId || null,
    },
  });
}
