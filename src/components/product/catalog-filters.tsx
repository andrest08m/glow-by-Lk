"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type FilterOption = { nombre: string; slug: string };

const DISPONIBILIDAD_OPTIONS = [
  { value: "DISPONIBLE", label: "Disponible" },
  { value: "POCO_STOCK", label: "Poco stock" },
  { value: "AGOTADO", label: "Agotado" },
];

const FILTER_KEYS = ["marca", "categoria", "precioMin", "precioMax", "disponibilidad"];

export function CatalogFilters({
  brands,
  categories,
}: {
  brands: FilterOption[];
  categories: FilterOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(searchParams.get("q") ?? "");

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page");
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (q === current) return;
    const timeout = setTimeout(() => updateParam("q", q || null), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const activeFilterCount = FILTER_KEYS.filter((key) => searchParams.get(key)).length;

  const clearAll = () => {
    setQ("");
    startTransition(() => router.replace(pathname, { scroll: false }));
  };

  const filtersBody = (
    <div className="flex flex-col gap-5">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Marca</label>
        <Select
          value={searchParams.get("marca") ?? "all"}
          onValueChange={(v) => updateParam("marca", v === "all" ? null : (v as string))}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las marcas</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.slug} value={b.slug}>
                {b.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Categoría</label>
        <Select
          value={searchParams.get("categoria") ?? "all"}
          onValueChange={(v) => updateParam("categoria", v === "all" ? null : (v as string))}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Disponibilidad</label>
        <Select
          value={searchParams.get("disponibilidad") ?? "all"}
          onValueChange={(v) => updateParam("disponibilidad", v === "all" ? null : (v as string))}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {DISPONIBILIDAD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Precio (COP)</label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Mín"
            defaultValue={searchParams.get("precioMin") ?? ""}
            onBlur={(e) => updateParam("precioMin", e.target.value || null)}
            aria-label="Precio mínimo"
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Máx"
            defaultValue={searchParams.get("precioMax") ?? ""}
            onBlur={(e) => updateParam("precioMax", e.target.value || null)}
            aria-label="Precio máximo"
          />
        </div>
      </div>

      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" className="justify-start gap-1.5 text-muted-foreground" onClick={clearAll}>
          <X className="size-3.5" /> Limpiar filtros
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar productos..."
          className="pl-10"
          aria-label="Buscar productos"
        />
      </div>

      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger
            render={<Button variant="outline" className="w-full justify-between rounded-full" />}
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="size-4" /> Filtros
            </span>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl p-6">
            <SheetHeader className="p-0">
              <SheetTitle>Filtros</SheetTitle>
            </SheetHeader>
            <div className="mt-4">{filtersBody}</div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden lg:block">{filtersBody}</div>
    </div>
  );
}
