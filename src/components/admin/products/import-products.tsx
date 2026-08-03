"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Papa from "papaparse";
import { toast } from "sonner";
import { ArrowLeft, Download, FileUp, CheckCircle2, RefreshCcw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mapHeader } from "@/lib/csv";
import { cn } from "@/lib/utils";
import {
  previewImportAction,
  applyImportAction,
} from "@/app/admin/(protected)/productos/importar/actions";
import type { ImportPreview } from "@/lib/admin/import-products";

export function ImportProducts() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFile(file: File) {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => mapHeader(h) ?? h,
      complete: (result) => {
        const data = result.data.filter((r) => Object.values(r).some((v) => v?.trim()));
        if (data.length === 0) {
          toast.error("El archivo no tiene filas con datos.");
          return;
        }
        setFileName(file.name);
        setRows(data);
        setPreview(null);
        startTransition(async () => {
          const res = await previewImportAction(data);
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          setPreview(res.preview);
        });
      },
      error: () => toast.error("No se pudo leer el archivo. ¿Es un CSV válido?"),
    });
  }

  function apply() {
    startTransition(async () => {
      const res = await applyImportAction(rows);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Importación aplicada: ${res.creados} creados, ${res.actualizados} actualizados${res.omitidos ? `, ${res.omitidos} con error omitidos` : ""}.`
      );
      router.push("/admin/productos");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href="/admin/productos" />} aria-label="Volver">
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="font-heading text-2xl text-foreground sm:text-3xl">Importar productos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sube un CSV (separado por ; o ,). Se actualizan los productos que coincidan por SKU o
            código interno; el resto se crean.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-border/60 bg-card p-5">
        <Button
          variant="outline"
          className="gap-1.5"
          render={<a href="/admin/productos/importar/plantilla" download />}
        >
          <Download className="size-4" /> Descargar plantilla
        </Button>
        <Button className="gap-1.5" onClick={() => fileRef.current?.click()} disabled={isPending}>
          <FileUp className="size-4" /> {fileName ? "Elegir otro archivo" : "Subir CSV"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
      </div>

      {isPending && !preview && (
        <p className="text-sm text-muted-foreground">Analizando archivo...</p>
      )}

      {preview && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-3xl border border-border/60 bg-card p-4 text-center">
              <CheckCircle2 className="mx-auto size-5 text-emerald-600 dark:text-emerald-400" />
              <p className="mt-1 font-heading text-2xl text-foreground">{preview.crear}</p>
              <p className="text-xs text-muted-foreground">a crear</p>
            </div>
            <div className="rounded-3xl border border-border/60 bg-card p-4 text-center">
              <RefreshCcw className="mx-auto size-5 text-sky-600 dark:text-sky-400" />
              <p className="mt-1 font-heading text-2xl text-foreground">{preview.actualizar}</p>
              <p className="text-xs text-muted-foreground">a actualizar</p>
            </div>
            <div className="rounded-3xl border border-border/60 bg-card p-4 text-center">
              <AlertCircle className="mx-auto size-5 text-red-600 dark:text-red-400" />
              <p className="mt-1 font-heading text-2xl text-foreground">{preview.errores}</p>
              <p className="text-xs text-muted-foreground">con errores (se omiten)</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Fila</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead className="hidden sm:table-cell">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.filas.map((f) => (
                  <TableRow key={f.fila}>
                    <TableCell className="text-sm text-muted-foreground">{f.fila}</TableCell>
                    <TableCell className="text-sm font-medium text-foreground">
                      {f.nombre || "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                          f.accion === "crear" &&
                            "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
                          f.accion === "actualizar" &&
                            "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
                          f.accion === "error" &&
                            "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                        )}
                      >
                        {f.accion === "crear" ? "Crear" : f.accion === "actualizar" ? "Actualizar" : "Error"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                      {f.accion === "actualizar" && f.matchPor
                        ? `coincide por ${f.matchPor === "sku" ? "SKU" : "código interno"}`
                        : (f.error ?? "—")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/95 p-4 backdrop-blur">
            <p className="text-sm text-muted-foreground">
              Se aplicarán {preview.crear + preview.actualizar} cambios.
              {preview.errores > 0 && ` Las ${preview.errores} filas con error se omiten.`}
            </p>
            <Button onClick={apply} disabled={isPending || preview.crear + preview.actualizar === 0}>
              {isPending ? "Aplicando..." : "Aplicar importación"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
