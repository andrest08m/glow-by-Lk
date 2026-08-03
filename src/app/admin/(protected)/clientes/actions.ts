"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
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

export async function createCustomer(formData: FormData): Promise<ActionResult> {
  await requireAdminSession();
  const parsed = parseCustomer(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  try {
    const customer = await prisma.customer.create({
      data: {
        nombre: parsed.data.nombre,
        whatsapp: parsed.data.whatsapp,
        direccion: parsed.data.direccion || null,
      },
    });
    revalidateCustomers();
    return { ok: true, id: customer.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "Ya existe un cliente con ese número de WhatsApp." };
    }
    console.error("createCustomer:", error);
    return { ok: false, error: "No se pudo crear el cliente." };
  }
}

export async function updateCustomer(id: string, formData: FormData): Promise<ActionResult> {
  await requireAdminSession();
  const parsed = parseCustomer(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  try {
    await prisma.customer.update({
      where: { id },
      data: {
        nombre: parsed.data.nombre,
        whatsapp: parsed.data.whatsapp,
        direccion: parsed.data.direccion || null,
      },
    });
    revalidateCustomers(id);
    return { ok: true, id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "Ya existe otro cliente con ese número de WhatsApp." };
    }
    console.error("updateCustomer:", error);
    return { ok: false, error: "No se pudo actualizar el cliente." };
  }
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  await requireAdminSession();
  try {
    await prisma.customer.delete({ where: { id } });
    revalidateCustomers();
    return { ok: true };
  } catch (error) {
    console.error("deleteCustomer:", error);
    return { ok: false, error: "No se pudo eliminar el cliente." };
  }
}
