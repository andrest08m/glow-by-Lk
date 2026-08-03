import type { Metadata } from "next";
import { ShoppingBag } from "lucide-react";
import { ComingSoon } from "@/components/admin/coming-soon";

export const metadata: Metadata = { title: "Pedidos" };

export default function AdminOrdersPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl text-foreground sm:text-3xl">Pedidos</h1>
      <ComingSoon
        icon={ShoppingBag}
        title="Gestión de pedidos"
        description="Aquí podrás ver y actualizar el estado de los pedidos hechos por WhatsApp."
      />
    </div>
  );
}
