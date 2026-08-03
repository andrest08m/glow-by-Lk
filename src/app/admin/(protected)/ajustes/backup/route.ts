import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return new Response("No autorizado", { status: 401 });

  const [
    products,
    productImages,
    brands,
    categories,
    subcategories,
    siteSettings,
    customers,
    orders,
    orderItems,
    inventoryMovements,
    adminUsers,
  ] = await Promise.all([
    prisma.product.findMany(),
    prisma.productImage.findMany(),
    prisma.brand.findMany(),
    prisma.category.findMany(),
    prisma.subcategory.findMany(),
    prisma.siteSetting.findMany(),
    prisma.customer.findMany(),
    prisma.order.findMany(),
    prisma.orderItem.findMany(),
    prisma.inventoryMovement.findMany(),
    // sin passwordHash: el respaldo no debe contener credenciales
    prisma.adminUser.findMany({ select: { id: true, email: true, nombre: true, createdAt: true } }),
  ]);

  const backup = {
    app: "glow-by-lk",
    exportadoEn: new Date().toISOString(),
    nota: "Respaldo manual de la base de datos. Los usuarios admin se exportan sin contraseña.",
    tablas: {
      products,
      productImages,
      brands,
      categories,
      subcategories,
      siteSettings,
      customers,
      orders,
      orderItems,
      inventoryMovements,
      adminUsers,
    },
  };

  const fecha = new Date().toISOString().slice(0, 10);

  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="backup-glowbylk-${fecha}.json"`,
    },
  });
}
