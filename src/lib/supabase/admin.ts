import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Cliente service-role: bypassa RLS. SOLO en el servidor, para las operaciones
// del panel de admin (CRUD, RPC de inventario/pedidos, storage). Se crea lazy
// para no romper el build ni el runtime de Workers cuando la env no está al
// cargar el módulo (los secrets existen por request).
let client: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase no está configurado: faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export function getStorageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET || "product-images";
}
