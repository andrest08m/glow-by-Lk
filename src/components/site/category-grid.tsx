import Link from "next/link";
import Image from "next/image";
import { Reveal } from "@/components/motion/reveal";
import { Container } from "@/components/site/container";

type CategoryItem = { nombre: string; slug: string; imagen: string | null };

export function CategoryGrid({ categories }: { categories: CategoryItem[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="py-12 sm:py-16">
      <Container>
        <Reveal className="mb-8">
          <h2 className="font-heading text-2xl text-foreground sm:text-3xl">Categorías</h2>
        </Reveal>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/productos?categoria=${cat.slug}`}
              className="group flex flex-col items-center gap-3 rounded-3xl border border-border/60 bg-card p-5 text-center transition-shadow hover:shadow-md"
            >
              <div className="relative aspect-square w-full max-w-32 overflow-hidden rounded-full bg-blush">
                {cat.imagen ? (
                  <Image
                    src={cat.imagen}
                    alt={cat.nombre}
                    fill
                    sizes="128px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center font-heading text-2xl text-raspberry/50">
                    {cat.nombre.charAt(0)}
                  </div>
                )}
              </div>
              <span className="text-sm font-medium text-foreground">{cat.nombre}</span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
