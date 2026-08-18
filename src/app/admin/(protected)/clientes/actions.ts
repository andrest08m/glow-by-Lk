"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminSession } from "@/lib/admin/guard";
import { customerSchema } from "@/lib/validations/customer";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

function parseCustomer(formData: FormData) {
  return customerSchema.safeParse({
    nombre: formData.get("nombre"),
    whatsapp: formData.get("whatsapp"),
    direccion: formData.get("direccion"),
  });
}

function revalidateCustomers(id?: string) {
  revalidatePath("/admin/clientes");
  if (id) revalidatePath(`/admin/clientes/${id}`);
  revalidatePath("/admin");
}

const DUPLICATE = "23505"; // unique_violation

export async function createCustomer(formData: FormData): Promise<ActionResult> {
  await requireAdminSession();
  const parsed = parseCustomer(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const db = createAdminClient();

  const { data, error } = await db
    .from("customers")
    .insert({
      nombre: parsed.data.nombre,
      whatsapp: parsed.data.whatsapp || null,
      direccion: parsed.data.direccion || null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === DUPLICATE) return { ok: false, error: "Ya existe un cliente con ese número de WhatsApp." };
    console.error("createCustomer:", error);
    return { ok: false, error: "No se pudo crear el cliente." };
  }
  revalidateCustomers();
  return { ok: true, id: data.id };
}

export async function updateCustomer(id: string, formData: FormData): Promise<ActionResult> {
  await requireAdminSession();
  const parsed = parseCustomer(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const db = createAdminClient();

  const { error } = await db
    .from("customers")
    .update({
      nombre: parsed.data.nombre,
      whatsapp: parsed.data.whatsapp || null,
      direccion: parsed.data.direccion || null,
    })
    .eq("id", id);

  if (error) {
    if (error.code === DUPLICATE) return { ok: false, error: "Ya existe otro cliente con ese número de WhatsApp." };
    console.error("updateCustomer:", error);
    return { ok: false, error: "No se pudo actualizar el cliente." };
  }
  revalidateCustomers(id);
  return { ok: true, id };
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  await requireAdminSession();
  const db = createAdminClient();
  const { error } = await db.from("customers").delete().eq("id", id);
  if (error) {
    console.error("deleteCustomer:", error);
    return { ok: false, error: "No se pudo eliminar el cliente." };
  }
  revalidateCustomers();
  return { ok: true };
}
