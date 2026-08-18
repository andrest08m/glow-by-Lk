"use client";

import { useId } from "react";
import Image from "next/image";
import { X, ImagePlus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type TonoItem = {
  key: string;
  id?: string; // existente
  nombre: string;
  imagenUrl: string | null; // existente o preview
  file?: File; // nueva imagen
};

export function TonoManager({
  tonos,
  onChange,
}: {
  tonos: TonoItem[];
  onChange: (items: TonoItem[]) => void;
}) {
  const inputBaseId = useId();

  function update(key: string, patch: Partial<TonoItem>) {
    onChange(tonos.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  }

  function add() {
    onChange([...tonos, { key: crypto.randomUUID(), nombre: "", imagenUrl: null }]);
  }

  function remove(key: string) {
    const t = tonos.find((x) => x.key === key);
    if (t?.file && t.imagenUrl) URL.revokeObjectURL(t.imagenUrl);
    onChange(tonos.filter((x) => x.key !== key));
  }

  function setFile(key: string, file: File | null) {
    if (!file) return;
    update(key, { file, imagenUrl: URL.createObjectURL(file) });
  }

  return (
    <div className="space-y-3">
      {tonos.map((t) => {
        const fileId = `${inputBaseId}-${t.key}`;
        return (
          <div
            key={t.key}
            className="flex items-center gap-3 rounded-2xl border border-border/60 p-3"
          >
            <label
              htmlFor={fileId}
              className="relative size-16 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-dashed border-border bg-blush"
            >
              {t.imagenUrl ? (
                <Image
                  src={t.imagenUrl}
                  alt={t.nombre || "tono"}
                  fill
                  sizes="64px"
                  className="object-cover"
                  unoptimized={!!t.file}
                />
              ) : (
                <span className="flex h-full flex-col items-center justify-center gap-0.5 text-muted-foreground">
                  <ImagePlus className="size-4" />
                  <span className="text-[10px]">Foto</span>
                </span>
              )}
              <input
                id={fileId}
                type="file"
                accept="image/*,.heic,.heif,.webp"
                className="hidden"
                onChange={(e) => {
                  setFile(t.key, e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
            </label>
            <Input
              value={t.nombre}
              onChange={(e) => update(t.key, { nombre: e.target.value })}
              placeholder="Nombre del tono (ej: 01 Natural)"
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => remove(t.key)}
              aria-label="Quitar tono"
            >
              <X className="size-4 text-destructive" />
            </Button>
          </div>
        );
      })}

      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={add}>
        <Plus className="size-4" /> Agregar tono
      </Button>
      <p className="text-xs text-muted-foreground">
        Cada tono con su foto. En la página del producto, el cliente elige el tono y ve su imagen.
      </p>
    </div>
  );
}
