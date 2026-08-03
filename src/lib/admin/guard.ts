import "server-only";
import { auth } from "@/auth";

/** Defensa extra en cada server action de escritura, además del middleware que ya protege /admin. */
export async function requireAdminSession() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("No autorizado");
  }
  return session;
}
