"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { siteSettingsSchema, type SiteSettingsValues } from "@/lib/validations/settings";
import { updateSiteSettings } from "./actions";

export function SettingsForm({ defaultValues }: { defaultValues: SiteSettingsValues }) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<SiteSettingsValues>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues,
  });

  function onSubmit(values: SiteSettingsValues) {
    const fd = new FormData();
    Object.entries(values).forEach(([key, value]) => fd.append(key, value));

    startTransition(async () => {
      try {
        await updateSiteSettings(fd);
        toast.success("Ajustes guardados");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Ocurrió un error");
      }
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5 rounded-3xl border border-border/60 bg-card p-5 sm:p-6"
      >
        <FormField
          control={form.control}
          name="whatsapp_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de WhatsApp</FormLabel>
              <FormControl>
                <Input placeholder="573001234567" {...field} />
              </FormControl>
              <FormDescription>
                Solo dígitos, con indicativo de país. Ej: 57 + número para Colombia.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="hero_title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título del hero</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="hero_subtitle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subtítulo del hero</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </form>
    </Form>
  );
}
