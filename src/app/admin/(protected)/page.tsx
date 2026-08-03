import Link from "next/link";
import type { Metadata } from "next";
import { Package, PackageCheck, AlertTriangle, PackageX, Tags, Award } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { EstadoBadge } from "@/components/product/estado-badge";
import { EmptyState } from "@/components/site/empty-state";
import { getDashboardStats } from "@/lib/admin/stats";

export const metadata: Metadata = { title: "Resumen" };

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl text-foreground sm:text-3xl">Resumen</h1>
        <p className="mt-1 text-sm text-muted-foreground">Estado general del catálogo.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Productos" value={stats.total} icon={Package} />
        <StatCard label="Activos" value={stats.activos} icon={PackageCheck} />
        <StatCard label="Poco stock" value={stats.pocoStock} icon={AlertTriangle} tone="warning" />
        <StatCard label="Agotados" value={stats.agotados} icon={PackageX} tone="danger" />
        <StatCard label="Categorías" value={stats.categorias} icon={Tags} />
        <StatCard label="Marcas" value={stats.marcas} icon={Award} />
      </div>

      <div className="rounded-3xl border border-border/60 bg-card p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg text-foreground">Necesitan atención</h2>
          <Link href="/admin/productos" className="text-sm font-medium text-primary hover:underline">
            Ver productos
          </Link>
        </div>

        {stats.alertas.length === 0 ? (
          <EmptyState title="Todo en orden" description="No hay productos con poco stock o agotados." className="py-10" />
        ) : (
          <ul className="divide-y divide-border/60">
            {stats.alertas.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <Link href={`/admin/productos/${p.id}`} className="text-sm font-medium text-foreground hover:text-primary">
                    {p.nombre}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {p.cantidad} unidades · mínimo {p.stockMinimo}
                  </p>
                </div>
                <EstadoBadge estado={p.estado} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
