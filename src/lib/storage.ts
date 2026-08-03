import "server-only";
import { supabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase-admin";

function extensionFromFile(file: File) {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type.split("/").pop() || "jpg";
}

/** Sube un archivo a Supabase Storage dentro de una carpeta y devuelve la URL pública. */
export async function uploadImage(file: File, folder: string) {
  const ext = extensionFromFile(file);
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw new Error(`Error subiendo imagen: ${error.message}`);

  const { data } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Elimina una imagen de Supabase Storage a partir de su URL pública. */
export async function deleteImageByUrl(url: string) {
  const marker = `/object/public/${STORAGE_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.slice(idx + marker.length);
  await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([path]);
}
