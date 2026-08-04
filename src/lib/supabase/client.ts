import { createBrowserClient } from "@supabase/ssr";

// Cliente para componentes de cliente (p. ej. el formulario de login).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
