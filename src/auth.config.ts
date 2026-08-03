import type { NextAuthConfig } from "next-auth";

// Config "edge-safe": sin providers ni acceso a base de datos.
// La usa el middleware (Edge runtime) y auth.ts (Node runtime) por igual.
export const authConfig = {
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname === "/admin/login";
      const isAdminRoute = nextUrl.pathname.startsWith("/admin");

      if (isLoginPage) {
        if (isLoggedIn) return Response.redirect(new URL("/admin", nextUrl));
        return true;
      }
      if (isAdminRoute) return isLoggedIn;
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
