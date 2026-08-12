/*
  Warnings:

  - A unique constraint covering the columns `[boardManufacturerId,semiSupplierId,status]` on the table `board_manufacturer_semi_suppliers` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "board_manufacturer_semi_suppliers_boardManufacturerId_semiS_key";

-- CreateIndex
CREATE UNIQUE INDEX "board_manufacturer_semi_suppliers_boardManufacturerId_semiS_key" ON "board_manufacturer_semi_suppliers"("boardManufacturerId", "semiSupplierId", "status");

-- CreateIndex
CREATE INDEX "products_boardManufacturerSemiSupplierId_status_idx" ON "products"("boardManufacturerSemiSupplierId", "status");

-- CreateIndex
CREATE INDEX "products_scanRunId_idx" ON "products"("scanRunId");

-- CreateIndex
CREATE INDEX "scan_runs_boardManufacturerId_startedAt_idx" ON "scan_runs"("boardManufacturerId", "startedAt");
