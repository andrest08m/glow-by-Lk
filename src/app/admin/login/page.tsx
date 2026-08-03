import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Ingresar",
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 py-12">
      <div className="w-full max-w-sm space-y-8 rounded-[2rem] bg-card p-8 shadow-xl">
        <div className="space-y-1 text-center">
          <p className="font-heading text-2xl text-foreground">
            glow <span className="italic text-primary">by Lk</span>
          </p>
          <p className="text-sm text-muted-foreground">Panel de administración</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
