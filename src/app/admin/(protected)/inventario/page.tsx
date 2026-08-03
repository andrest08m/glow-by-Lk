import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { ComingSoon } from "@/components/admin/coming-soon";

export const metadata: Metadata = { title: "Inventario" };

export default function AdminInventoryPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl text-foreground sm:text-3xl">Inventario</h1>
      <ComingSoon
        icon={ClipboardList}
        title="Kardex de movimientos"
        description="Aquí podrás registrar entradas, salidas y ajustes de inventario con motivo y fecha."
      />
    </div>
  );
}
