import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

// Se envuelve en una función literal: el detector de Next.js para el export
// de proxy no reconoce un identificador reasignado (export const proxy = auth).
export const proxy = ((...args: Parameters<typeof auth>) => auth(...args)) as typeof auth;

export const config = {
  matcher: ["/admin/:path*"],
};
