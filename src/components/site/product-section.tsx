import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { Container } from "@/components/site/container";
import { ProductCard } from "@/components/product/product-card";
import type { ProductCardDTO } from "@/types/product";

export function ProductSection({
  title,
  subtitle,
  products,
  viewAllHref,
}: {
  title: string;
  subtitle?: string;
  products: ProductCardDTO[];
  viewAllHref?: string;
}) {
  if (products.length === 0) return null;

  return (
    <section className="py-12 sm:py-16">
      <Container>
        <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl text-foreground sm:text-3xl">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Ver todo <ArrowRight className="size-3.5" />
            </Link>
          )}
        </Reveal>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
          {products.map((product, i) => (
            <ProductCard key={product.id} product={product} priority={i < 4} />
          ))}
        </div>
      </Container>
    </section>
  );
}
