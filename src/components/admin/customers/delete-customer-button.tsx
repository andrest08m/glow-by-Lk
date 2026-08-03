"use client";

import { useRouter } from "next/navigation";
import { DeleteButton } from "@/components/admin/taxonomy/delete-button";
import { deleteCustomer } from "@/app/admin/(protected)/clientes/actions";

export function DeleteCustomerButton({
  id,
  nombre,
  pedidos,
  redirectTo,
}: {
  id: string;
  nombre: string;
  pedidos: number;
  redirectTo?: string;
}) {
  const router = useRouter();

  return (
    <DeleteButton
      title={`¿Eliminar a ${nombre}?`}
      description={
        pedidos > 0
          ? `Sus ${pedidos} pedido(s) se conservarán con los datos del cliente como texto, pero quedarán sin cliente asociado.`
          : "Esta acción no se puede deshacer."
      }
      action={async () => {
        const result = await deleteCustomer(id);
        if (!result.ok) throw new Error(result.error);
        if (redirectTo) router.push(redirectTo);
      }}
      successMessage="Cliente eliminado"
    />
  );
}
