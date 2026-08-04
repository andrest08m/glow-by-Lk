import "server-only";
import { createAdminClient, getStorageBucket } from "@/lib/supabase/admin";

function extensionFromFile(file: File) {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type.split("/").pop() || "jpg";
}

/** Sube un archivo a Supabase Storage dentro de una carpeta y devuelve la URL pública. */
export async function uploadImage(file: File, folder: string) {
  const supabase = createAdminClient();
  const bucket = getStorageBucket();
  const ext = extensionFromFile(file);
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });

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
