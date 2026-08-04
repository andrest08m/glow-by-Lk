import type { Metadata } from "next";
import { NewOrderForm } from "@/components/admin/orders/new-order-form";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Nuevo pedido" };

export default async function NewOrderPage() {
  const db = createAdminClient();
  const [{ data: products }, { data: customers }] = await Promise.all([
    db
      .from("products")
      .select("id,nombre,precio,precio_oferta,cantidad")
      .eq("activo", true)
      .order("nombre", { ascending: true }),
    db.from("customers").select("id,nombre,whatsapp").order("nombre", { ascending: true }),
  ]);

  return (
    <NewOrderForm
      products={(products ?? []).map((p) => ({
        id: p.id,
        nombre: p.nombre,
        precio: Number(p.precio_oferta ?? p.precio),
        stock: p.cantidad,
      }))}
      customers={customers ?? []}
    />
  );
}
