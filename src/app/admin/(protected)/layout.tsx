import { getAdminUser } from "@/lib/admin/guard";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAdminUser();

  return <AdminShell userEmail={user.email ?? ""}>{children}</AdminShell>;
}
