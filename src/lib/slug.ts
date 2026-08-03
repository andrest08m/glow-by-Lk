import slugify from "slugify";

export function toSlug(text: string) {
  return slugify(text, { lower: true, strict: true, locale: "es", trim: true });
}

/** Genera un slug único añadiendo -2, -3... si `exists` devuelve true. */
export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>) {
  const root = toSlug(base);
  let slug = root;
  let i = 2;
  while (await exists(slug)) {
    slug = `${root}-${i}`;
    i++;
  }
  return slug;
}
