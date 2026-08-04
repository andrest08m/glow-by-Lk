import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";

// El layout llama a la DB (SiteFooter -> getSiteSettings) y los datos del
// catálogo cambian (stock/precios), así que todo el segmento público se
// renderiza por request. Esto cubre home, /productos y /producto/[slug] a la
// vez y evita que `next build` intente prerenderizar tocando la base de datos.
export const dynamic = "force-dynamic";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
