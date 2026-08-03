"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ProductImageDTO } from "@/types/product";

export function ProductGallery({
  images,
  nombre,
}: {
  images: ProductImageDTO[];
  nombre: string;
}) {
  const [active, setActive] = useState(0);
  const current = images[active];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-blush">
        {current ? (
          <Image
            src={current.url}
            alt={current.alt || nombre}
            fill
            priority
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Sin imagen
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-2xl border-2 bg-blush transition-colors",
                i === active ? "border-primary" : "border-transparent"
              )}
              aria-label={`Ver imagen ${i + 1} de ${nombre}`}
              aria-pressed={i === active}
            >
              <Image src={img.url} alt={img.alt || nombre} fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
