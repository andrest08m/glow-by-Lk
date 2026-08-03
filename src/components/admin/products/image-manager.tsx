"use client";

import { useCallback, useId } from "react";
import Image from "next/image";
import { X, GripVertical, ImagePlus } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

export type ImageItem =
  | { kind: "existing"; id: string; url: string; alt: string | null }
  | { kind: "new"; tempId: string; file: File; previewUrl: string };

function itemKey(item: ImageItem) {
  return item.kind === "existing" ? `existing-${item.id}` : `new-${item.tempId}`;
}

function SortableThumb({
  item,
  index,
  onRemove,
}: {
  item: ImageItem;
  index: number;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: itemKey(item),
  });

  const url = item.kind === "existing" ? item.url : item.previewUrl;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative aspect-square overflow-hidden rounded-2xl border border-border/60 bg-blush",
        isDragging && "z-10 opacity-70"
      )}
    >
      <Image
        src={url}
        alt=""
        fill
        sizes="140px"
        className="object-cover"
        unoptimized={item.kind === "new"}
      />
      {index === 0 && (
        <span className="absolute top-2 left-2 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-medium text-cream">
          Principal
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-ink/80 text-cream opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Quitar imagen"
      >
        <X className="size-3.5" />
      </button>
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute right-2 bottom-2 flex size-6 cursor-grab items-center justify-center rounded-full bg-ink/80 text-cream opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        aria-label="Arrastrar para reordenar"
      >
        <GripVertical className="size-3.5" />
      </button>
    </div>
  );
}

export function ImageManager({
  images,
  onChange,
}: {
  images: ImageItem[];
  onChange: (items: ImageItem[]) => void;
}) {
  const inputId = useId();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const next: ImageItem[] = Array.from(files).map((file) => ({
        kind: "new",
        tempId: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      onChange([...images, ...next]);
    },
    [images, onChange]
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = images.findIndex((i) => itemKey(i) === active.id);
    const newIndex = images.findIndex((i) => itemKey(i) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(images, oldIndex, newIndex));
  }

  function removeAt(index: number) {
    const item = images[index];
    if (item.kind === "new") URL.revokeObjectURL(item.previewUrl);
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={images.map(itemKey)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {images.map((item, i) => (
              <SortableThumb key={itemKey(item)} item={item} index={i} onRemove={() => removeAt(i)} />
            ))}

            <label
              htmlFor={inputId}
              className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <ImagePlus className="size-5" />
              <span className="text-xs font-medium">Agregar</span>
              <input
                id={inputId}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </SortableContext>
      </DndContext>
      <p className="text-xs text-muted-foreground">
        Arrastra para reordenar. La primera imagen es la principal del producto.
      </p>
    </div>
  );
}
