"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
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
  const [zoom, setZoom] = useState(false);
  const current = images[active];

  const go = (dir: 1 | -1) =>
    setActive((i) => (i + dir + images.length) % images.length);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "ArrowRight" && images.length > 1) go(1);
      if (e.key === "ArrowLeft" && images.length > 1) go(-1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, images.length]);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => current && setZoom(true)}
        className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-[2rem] bg-blush"
        aria-label={current ? `Ampliar imagen de ${nombre}` : "Sin imagen"}
      >
        {current ? (
          <>
            <Image
              src={current.url}
              alt={current.alt || nombre}
              fill
              priority
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <span className="absolute right-3 bottom-3 flex size-9 items-center justify-center rounded-full bg-ink/70 text-cream opacity-0 transition-opacity group-hover:opacity-100">
              <ZoomIn className="size-4.5" />
            </span>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Sin imagen
          </div>
        )}
      </button>

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

      {/* Lightbox: imagen completa sin recorte */}
      {zoom && current && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4 backdrop-blur-sm"
          onClick={() => setZoom(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Imagen ampliada de ${nombre}`}
        >
          <button
            type="button"
            onClick={() => setZoom(false)}
            className="absolute top-4 right-4 flex size-11 items-center justify-center rounded-full bg-cream/10 text-cream transition-colors hover:bg-cream/20"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                className="absolute left-4 flex size-11 items-center justify-center rounded-full bg-cream/10 text-cream transition-colors hover:bg-cream/20"
                aria-label="Anterior"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                className="absolute right-4 flex size-11 items-center justify-center rounded-full bg-cream/10 text-cream transition-colors hover:bg-cream/20"
                aria-label="Siguiente"
              >
                <ChevronRight className="size-6" />
              </button>
            </>
          )}

          <div
            className="relative h-full max-h-[85vh] w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={current.url}
              alt={current.alt || nombre}
              fill
              sizes="90vw"
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
