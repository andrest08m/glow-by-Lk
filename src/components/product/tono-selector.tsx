"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProductTonoDTO } from "@/types/product";

export function TonoSelector({ tonos }: { tonos: ProductTonoDTO[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = tonos.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="space-y-3 border-t border-border/60 pt-5">
      <div className="space-y-1.5">
        <label className="font-heading text-lg text-foreground">Elegí tu tono</label>
        <Select value={selectedId} onValueChange={(v) => setSelectedId(v as string)}>
          <SelectTrigger className="w-full sm:w-80">
            <SelectValue>{selected ? selected.nombre : "Ver los tonos disponibles"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {tonos.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <AnimatePresence mode="wait">
        {selected?.imagen && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="relative aspect-square w-full max-w-xs overflow-hidden rounded-3xl bg-blush"
          >
            <Image
              src={selected.imagen}
              alt={`Tono ${selected.nombre}`}
              fill
              sizes="320px"
              className="object-cover"
            />
            <span className="absolute bottom-3 left-3 rounded-full bg-ink/80 px-3 py-1 text-xs font-medium text-cream">
              {selected.nombre}
            </span>
          </motion.div>
        )}
        {selected && !selected.imagen && (
          <p className="text-sm text-muted-foreground">Tono: {selected.nombre}</p>
        )}
      </AnimatePresence>
    </div>
  );
}
