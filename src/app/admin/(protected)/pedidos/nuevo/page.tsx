import type { Metadata } from "next";
import { NewOrderForm } from "@/components/admin/orders/new-order-form";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Nuevo pedido" };

export default async function NewOrderPage() {
  const [products, customers] = await Promise.all([
    prisma.product.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, precio: true, precioOferta: true, cantidad: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.customer.findMany({
      select: { id: true, nombre: true, whatsapp: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  return (
    <NewOrderForm
      products={products.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        precio: Number(p.precioOferta ?? p.precio),
        stock: p.cantidad,
      }))}
      customers={customers}
    />
  );
}
