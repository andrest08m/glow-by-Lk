import { Truck, MessageCircleHeart, ShieldCheck } from "lucide-react";
import { Container } from "@/components/site/container";

const ITEMS = [
  {
    icon: Truck,
    title: "Envíos a todo el país",
    desc: "Coordinamos el envío por WhatsApp.",
  },
  {
    icon: MessageCircleHeart,
    title: "Atención personalizada",
    desc: "Te asesoramos con tu compra al instante.",
  },
  {
    icon: ShieldCheck,
    title: "Productos originales",
    desc: "Maquillaje y cuidado seleccionado.",
  },
];

export function TrustBar() {
  return (
    <Container as="section" className="pt-8">
      <div className="grid gap-3 sm:grid-cols-3">
        {ITEMS.map((it) => (
          <div
            key={it.title}
            className="flex items-center gap-3 rounded-3xl border border-border/60 bg-card p-4"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blush text-raspberry">
              <it.icon className="size-5.5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{it.title}</p>
              <p className="text-xs text-muted-foreground">{it.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
