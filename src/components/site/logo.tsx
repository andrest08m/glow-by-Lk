import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "font-heading text-2xl leading-none tracking-tight text-foreground",
        className
      )}
    >
      glow <span className="text-primary italic">by Lk</span>
    </Link>
  );
}
