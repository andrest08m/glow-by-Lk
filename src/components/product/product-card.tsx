"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { formatCOP } from "@/lib/format";
import type { ProductCardDTO } from "@/types/product";

export function ProductCard({
  product,
  priority = false,
}: {
  product: ProductCardDTO;
  priority?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Link
        href={`/producto/${product.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 bg-card transition-shadow hover:shadow-lg hover:shadow-primary/5"
      >
        <div className="relative aspect-square overflow-hidden bg-blush">
          {product.imagenPrincipal ? (
            <Image
              src={product.imagenPrincipal}
              alt={product.nombre}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sin imagen
            </div>
          )}

          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {product.nuevo && (
              <span className="rounded-full bg-raspberry px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-cream">
                Nuevo
              </span>
            )}
            {product.descuentoPct && (
              <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-cream">
                -{product.descuentoPct}%
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1 p-4">
          <h3 className="line-clamp-2 font-heading text-base leading-snug text-foreground">
            {product.nombre}
          </h3>
          {product.marca && (
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {product.marca.nombre}
            </span>
          )}

          <div className="mt-auto flex items-end justify-between gap-2 pt-3">
            <div className="flex flex-col">
              {product.precioOferta ? (
                <>
                  <span className="text-xs text-muted-foreground line-through">
                    {formatCOP(product.precio)}
                  </span>
                  <span className="font-heading text-lg font-semibold text-primary">
                    {formatCOP(product.precioOferta)}
                  </span>
                </>
              ) : (
                <span className="font-heading text-lg font-semibold text-foreground">
                  {formatCOP(product.precio)}
                </span>
              )}
            </div>
            {/* El público no ve el estado de stock (ni "Agotado" ni "Poco stock") */}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
