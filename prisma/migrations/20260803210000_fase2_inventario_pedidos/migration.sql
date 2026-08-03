-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'EN_PREPARACION';

-- DropForeignKey
ALTER TABLE "InventoryMovement" DROP CONSTRAINT "InventoryMovement_productId_fkey";

-- DropIndex
DROP INDEX "InventoryMovement_productId_idx";

-- AlterTable
ALTER TABLE "InventoryMovement" ADD COLUMN     "adminEmail" TEXT,
ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "saldoResultante" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "numero" SERIAL NOT NULL,
ADD COLUMN     "stockDescontado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "InventoryMovement_productId_fecha_idx" ON "InventoryMovement"("productId", "fecha");

-- CreateIndex
CREATE INDEX "InventoryMovement_orderId_idx" ON "InventoryMovement"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_numero_key" ON "Order"("numero");

-- CreateIndex
CREATE INDEX "Order_estado_createdAt_idx" ON "Order"("estado", "createdAt");

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
