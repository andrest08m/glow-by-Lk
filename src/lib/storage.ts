import "server-only";
import { createAdminClient, getStorageBucket } from "@/lib/supabase/admin";

function extensionFromFile(file: File) {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5 && fromName !== file.name) return fromName.toLowerCase();
  const fromType = file.type.split("/").pop();
  return fromType || "jpg";
}

// Algunos navegadores no envían content-type (p. ej. HEIC): lo inferimos de la extensión.
const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
  bmp: "image/bmp",
  svg: "image/svg+xml",
};

/** Sube un archivo a Supabase Storage dentro de una carpeta y devuelve la URL pública. */
export async function uploadImage(file: File, folder: string) {
  const supabase = createAdminClient();
  const bucket = getStorageBucket();
  const ext = extensionFromFile(file);
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const contentType = file.type || MIME_BY_EXT[ext] || "application/octet-stream";

  // Convertimos a ArrayBuffer para no depender de cómo el runtime del Worker
  // maneje el streaming del File (más robusto en Cloudflare Workers).
  const bytes = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, { contentType, upsert: false });

  if (error) throw new Error(`Error subiendo imagen: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** Elimina una imagen de Supabase Storage a partir de su URL pública. */
export async function deleteImageByUrl(url: string) {
  const bucket = getStorageBucket();
  const marker = `/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.slice(idx + marker.length);
  await createAdminClient().storage.from(bucket).remove([path]);
}
