"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Tags,
  Award,
  Settings,
  LogOut,
  Menu,
  ExternalLink,
  ShoppingBag,
  Users,
  ClipboardList,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Logo } from "@/components/site/logo";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/inventario", label: "Inventario", icon: ClipboardList },
  { href: "/admin/productos", label: "Productos", icon: Package },
  { href: "/admin/categorias", label: "Categorías", icon: Tags },
  { href: "/admin/marcas", label: "Marcas", icon: Award },
  { href: "/admin/ajustes", label: "Ajustes", icon: Settings },
];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1 p-4">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-foreground/70 hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function AccountFooter({ userEmail }: { userEmail: string }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="border-t border-border/60 p-4">
      <p className="truncate px-1 text-xs text-muted-foreground">{userEmail}</p>
      <Button
        variant="ghost"
        size="sm"
        className="mt-1 w-full justify-start gap-2 text-muted-foreground"
        onClick={handleSignOut}
      >
        <LogOut className="size-4" /> Cerrar sesión
      </Button>
    </div>
  );
}

export function AdminShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border/60 bg-card lg:flex">
        <div className="border-b border-border/60 p-5">
          <Logo />
          <p className="mt-0.5 text-xs text-muted-foreground">Panel de administración</p>
        </div>
        <NavLinks pathname={pathname} />
        <AccountFooter userEmail={userEmail} />
      </aside>

      <div className="flex flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border/60 bg-background/90 px-4 backdrop-blur sm:px-6 lg:justify-end lg:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <Sheet>
              <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Abrir menú" />}>
                <Menu className="size-5" />
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="border-b border-border/60 p-5">
                  <SheetTitle>
                    <Logo />
                  </SheetTitle>
                </SheetHeader>
                <NavLinks pathname={pathname} />
                <AccountFooter userEmail={userEmail} />
              </SheetContent>
            </Sheet>
            <span className="font-heading text-lg text-foreground">
              glow <span className="italic text-primary">by Lk</span>
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            render={<Link href="/" target="_blank" rel="noopener noreferrer" />}
          >
            Ver sitio <ExternalLink className="size-3.5" />
          </Button>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
