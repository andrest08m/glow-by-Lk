import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Devuelve el usuario admin de la sesión o redirige a login. Para páginas/layouts. */
export async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  return user;
}

/**
 * Defensa en profundidad para server actions de escritura: además del middleware
 * que protege /admin, cada acción confirma que hay sesión antes de tocar datos.
 * Devuelve el email del admin (para el kardex).
 */
export async function requireAdminSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");
  return { user, email: user.email ?? null };
}
