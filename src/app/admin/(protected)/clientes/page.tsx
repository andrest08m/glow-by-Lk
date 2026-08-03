import type { Metadata } from "next";
import { Users } from "lucide-react";
import { ComingSoon } from "@/components/admin/coming-soon";

export const metadata: Metadata = { title: "Clientes" };

export default function AdminCustomersPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl text-foreground sm:text-3xl">Clientes</h1>
      <ComingSoon
        icon={Users}
        title="Directorio de clientes"
        description="Aquí verás el historial de compras y datos de contacto de tus clientas."
      />
    </div>
  );
}
