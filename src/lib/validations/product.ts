import { z } from "zod";

const emptyToUndefined = (val: unknown) => (val === "" || val === null ? undefined : val);

const optionalPositiveNumber = z.preprocess(
  emptyToUndefined,
  z.coerce.number().positive("Debe ser mayor a 0").optional()
);

const optionalNonNegativeNumber = z.preprocess(
  emptyToUndefined,
  z.coerce.number().nonnegative("No puede ser negativo").optional()
);

const optionalRelationId = z.preprocess(
  (val) => (val === "" || val === "none" || val === null ? undefined : val),
  z.string().optional()
);

export const productSchema = z
  .object({
    nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(200),
    slug: z
      .string()
      .trim()
      .max(200)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones")
      .optional()
      .or(z.literal("")),
    codigoInterno: z.string().trim().max(100).optional().or(z.literal("")),
    sku: z.string().trim().max(100).optional().or(z.literal("")),
    descripcionCorta: z.string().trim().max(300).optional().or(z.literal("")),
    descripcionLarga: z.string().trim().max(5000).optional().or(z.literal("")),
    precio: z.coerce.number().positive("Debe ser mayor a 0"),
    precioOferta: optionalPositiveNumber,
    costo: optionalNonNegativeNumber,
    cantidad: z.coerce.number().int().nonnegative("No puede ser negativo"),
    stockMinimo: z.coerce.number().int().nonnegative("No puede ser negativo"),
    destacado: z.boolean().default(false),
    nuevo: z.boolean().default(false),
    masVendido: z.boolean().default(false),
    activo: z.boolean().default(true),
    brandId: optionalRelationId,
    categoryId: optionalRelationId,
    subcategoryId: optionalRelationId,
  })
  .refine((data) => !data.precioOferta || data.precioOferta < data.precio, {
    message: "Debe ser menor al precio regular",
    path: ["precioOferta"],
  });

export type ProductFormValues = z.input<typeof productSchema>;
export type ProductFormParsed = z.output<typeof productSchema>;

export const imageManifestEntrySchema = z.union([
  z.object({ kind: z.literal("existing"), id: z.string(), orden: z.number().int() }),
  z.object({ kind: z.literal("new"), tempId: z.string(), orden: z.number().int() }),
]);

export const imageManifestSchema = z.array(imageManifestEntrySchema);
