import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export function WhatsAppButton({
  phone,
  message,
  className,
  children = "Comprar por WhatsApp",
}: {
  phone: string;
  message: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <a
      href={buildWhatsAppUrl(phone, message)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full bg-whatsapp px-6 py-3.5 text-sm font-semibold text-whatsapp-foreground shadow-sm transition-all hover:scale-[1.02] hover:shadow-md active:scale-[0.98]",
        className
      )}
    >
      <MessageCircle className="size-4.5" />
      {children}
    </a>
  );
}
