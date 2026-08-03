"use client";

import { useId } from "react";
import Image from "next/image";
import { ImagePlus } from "lucide-react";

export type ImageFieldValue = {
  file?: File;
  previewUrl: string | null;
  removed: boolean;
};

export function SingleImageField({
  value,
  onChange,
}: {
  value: ImageFieldValue;
  onChange: (next: ImageFieldValue) => void;
}) {
  const inputId = useId();

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-blush">
        {value.previewUrl ? (
          <Image
            src={value.previewUrl}
            alt=""
            fill
            sizes="80px"
            className="object-cover"
            unoptimized={!!value.file}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImagePlus className="size-5" />
          </div>
        )}
      </div>
      <div className="flex flex-col items-start gap-1.5">
        <label htmlFor={inputId} className="cursor-pointer text-sm font-medium text-primary hover:underline">
          {value.previewUrl ? "Cambiar imagen" : "Subir imagen"}
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            onChange({ file, previewUrl: URL.createObjectURL(file), removed: false });
          }}
        />
        {value.previewUrl && (
          <button
            type="button"
            onClick={() => onChange({ file: undefined, previewUrl: null, removed: true })}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            Quitar imagen
          </button>
        )}
      </div>
    </div>
  );
}
