import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/site/container";
import { ProductGallery } from "@/components/product/product-gallery";
import { EstadoBadge } from "@/components/product/estado-badge";
import { WhatsAppButton } from "@/components/site/whatsapp-button";
import { Reveal } from "@/components/motion/reveal";
import { formatCOP } from "@/lib/format";
import { productWhatsAppMessage } from "@/lib/whatsapp";
import { getProductBySlug } from "@/lib/products";
import { getSiteSettings } from "@/lib/site-settings";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const description = product.descripcionCorta ?? product.descripcionLarga ?? undefined;

  return {
    title: product.nombre,
    description,
    openGraph: {
      title: product.nombre,
      description,
      images: product.imagenPrincipal ? [{ url: product.imagenPrincipal }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProductBySlug(slug), getSiteSettings()]);

  if (!product) notFound();

  return (
    <Container className="py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-primary">
          Inicio
        </Link>
        <ChevronRight className="size-3.5" />
        <Link href="/productos" className="hover:text-primary">
          Catálogo
        </Link>
        {product.categoria && (
          <>
            <ChevronRight className="size-3.5" />
            <Link href={`/productos?categoria=${product.categoria.slug}`} className="hover:text-primary">
              {product.categoria.nombre}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <ProductGallery images={product.images} nombre={product.nombre} />
        </Reveal>

        <Reveal delay={0.1} className="flex flex-col gap-5">
          <div className="space-y-1.5">
            {product.marca && (
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {product.marca.nombre}
              </span>
            )}
            <h1 className="font-heading text-3xl text-foreground sm:text-4xl">{product.nombre}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <EstadoBadge estado={product.estado} />
            {product.estado !== "AGOTADO" && (
              <span className="text-sm text-muted-foreground">{product.cantidad} disponibles</span>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {product.precioOferta ? (
              <>
                <span className="font-heading text-3xl font-semibold text-primary">
                  {formatCOP(product.precioOferta)}
                </span>
                <span className="text-lg text-muted-foreground line-through">
                  {formatCOP(product.precio)}
                </span>
                {product.descuentoPct && (
                  <span className="rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-cream">
                    -{product.descuentoPct}%
                  </span>
                )}
              </>
            ) : (
              <span className="font-heading text-3xl font-semibold text-foreground">
                {formatCOP(product.precio)}
              </span>
            )}
          </div>

          {product.descripcionCorta && (
            <p className="text-base text-foreground/80">{product.descripcionCorta}</p>
          )}

          <WhatsAppButton
            phone={settings.whatsapp_number}
            message={productWhatsAppMessage(product.nombre)}
            className="w-full sm:w-auto"
          />

          {product.descripcionLarga && (
            <div className="mt-4 space-y-2 border-t border-border/60 pt-6">
              <h2 className="font-heading text-lg text-foreground">Descripción</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/80">
                {product.descripcionLarga}
              </p>
            </div>
          )}
        </Reveal>
      </div>
    </Container>
  );
}
