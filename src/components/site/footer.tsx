import Link from "next/link";
import { Container } from "@/components/site/container";
import { Logo } from "@/components/site/logo";
import { getSiteSettings } from "@/lib/site-settings";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export async function SiteFooter() {
  const settings = await getSiteSettings();
  const whatsappUrl = buildWhatsAppUrl(
    settings.whatsapp_number,
    "Hola, tengo una pregunta sobre el catálogo de glow by Lk."
  );

  return (
    <footer className="mt-24 border-t border-border/60 bg-card">
      <Container className="flex flex-col gap-6 py-12 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            Catálogo de belleza. Maquillaje y cuidado personal seleccionado con cariño.
          </p>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <Link href="/productos" className="text-foreground/80 hover:text-primary">
            Ver catálogo
          </Link>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/80 hover:text-primary"
          >
            Escríbenos por WhatsApp
          </a>
        </div>
      </Container>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} glow by Lk. Todos los derechos reservados.
      </div>
    </footer>
  );
}
