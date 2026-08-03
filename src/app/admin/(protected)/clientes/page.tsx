import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, ArrowRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/site/empty-state";
import { CatalogPagination } from "@/components/product/catalog-pagination";
import { SearchBox } from "@/components/admin/search-box";
import { CustomerFormDialog } from "@/components/admin/customers/customer-form-dialog";
import { DeleteCustomerButton } from "@/components/admin/customers/delete-customer-button";
import { prisma } from "@/lib/prisma";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { formatFechaCorta } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Clientes" };

type SearchParams = { q?: string; page?: string };

const PAGE_SIZE = 20;

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = sp.page ? Math.max(1, Number(sp.page)) : 1;

  const where: Prisma.CustomerWhereInput = sp.q
    ? {
        OR: [
          { nombre: { contains: sp.q, mode: "insensitive" } },
          { whatsapp: { contains: sp.q } },
        ],
      }
    : {};

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        _count: { select: { orders: true } },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.customer.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-foreground sm:text-3xl">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} cliente{total === 1 ? "" : "s"}
          </p>
        </div>
        <CustomerFormDialog mode="create" />
      </div>

      <SearchBox placeholder="Buscar por nombre o WhatsApp..." />

      {customers.length === 0 ? (
        <EmptyState
          title="Sin clientes"
          description="Crea clientes aquí o al momento de registrar un pedido."
        />
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border/60 bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden sm:table-cell">WhatsApp</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead className="hidden md:table-cell">Última compra</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/admin/clientes/${c.id}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {c.nombre}
                    </Link>
                    <p className="text-xs text-muted-foreground sm:hidden">{c.whatsapp}</p>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                    {c.whatsapp}
                  </TableCell>
                  <TableCell className="text-sm text-foreground">{c._count.orders}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {c.orders[0] ? formatFechaCorta(c.orders[0].createdAt) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Escribir por WhatsApp"
                        render={
                          <a
                            href={buildWhatsAppUrl(c.whatsapp, `Hola ${c.nombre}, te escribimos de glow by Lk.`)}
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        }
                      >
                        <MessageCircle className="size-4 text-whatsapp" />
                      </Button>
                      <CustomerFormDialog mode="edit" customer={c} />
                      <DeleteCustomerButton id={c.id} nombre={c.nombre} pedidos={c._count.orders} />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Ver ficha"
                        render={<Link href={`/admin/clientes/${c.id}`} />}
                      >
                        <ArrowRight className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CatalogPagination page={page} totalPages={totalPages} searchParams={sp} />
    </div>
  );
}
