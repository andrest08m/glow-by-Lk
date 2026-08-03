import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { getSiteSettings } from "@/lib/site-settings";

export async function Hero() {
  const settings = await getSiteSettings();

  return (
    <Container as="section" className="pt-6 sm:pt-10">
      <div className="relative overflow-hidden rounded-[2.25rem] bg-ink px-6 py-16 text-cream sm:rounded-[3rem] sm:px-12 sm:py-24">
        <div
          aria-hidden
          className="blob absolute -top-24 -right-16 size-72 bg-raspberry/40 blur-2xl sm:size-96"
        />
        <div
          aria-hidden
          className="absolute -bottom-24 -left-10 size-64 rounded-full bg-blush/20 blur-3xl sm:size-80"
        />
        <div
          aria-hidden
          className="blob absolute top-1/2 right-8 hidden size-40 -translate-y-1/2 border border-blush/30 sm:block"
        />

        <div className="relative mx-auto flex max-w-xl flex-col items-center gap-6 text-center">
          <Reveal>
            <span className="inline-flex items-center rounded-full border border-blush/40 px-4 py-1.5 text-xs font-medium tracking-[0.2em] text-blush uppercase">
              Catálogo glow by Lk
            </span>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="text-balance font-heading text-4xl leading-tight sm:text-6xl">
              {settings.hero_title}
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="text-balance max-w-md text-base text-cream/80 sm:text-lg">
              {settings.hero_subtitle}
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <Button
              size="lg"
              className="h-11 gap-2 rounded-full bg-cream px-8 text-ink hover:bg-cream/90"
              render={<Link href="/productos" />}
            >
              Ver catálogo
              <ArrowRight className="size-4" />
            </Button>
          </Reveal>
        </div>
      </div>
    </Container>
  );
}
