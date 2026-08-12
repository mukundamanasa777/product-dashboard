-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('PENDING', 'APPROVED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ChangeType" AS ENUM ('NONE', 'NEW', 'URL_CHANGED', 'DESCRIPTION_CHANGED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "board_manufacturers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "scraperConfig" JSONB NOT NULL,
    "pageUrls" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "board_manufacturers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "semi_suppliers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "semi_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_manufacturer_semi_suppliers" (
    "id" SERIAL NOT NULL,
    "boardManufacturerId" INTEGER NOT NULL,
    "semiSupplierId" INTEGER NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "board_manufacturer_semi_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "boardManufacturerSemiSupplierId" INTEGER NOT NULL,
    "scanRunId" INTEGER,
    "name" TEXT NOT NULL,
    "productUrl" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'PENDING',
    "changeType" "ChangeType" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_runs" (
    "id" SERIAL NOT NULL,
    "boardManufacturerId" INTEGER NOT NULL,
    "status" "ScanStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "totalProducts" INTEGER NOT NULL DEFAULT 0,
    "newProducts" INTEGER NOT NULL DEFAULT 0,
    "updatedProducts" INTEGER NOT NULL DEFAULT 0,
    "removedProducts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "scan_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "board_manufacturers_name_key" ON "board_manufacturers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "semi_suppliers_name_key" ON "semi_suppliers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "board_manufacturer_semi_suppliers_boardManufacturerId_semiS_key" ON "board_manufacturer_semi_suppliers"("boardManufacturerId", "semiSupplierId");

-- CreateIndex
CREATE UNIQUE INDEX "products_boardManufacturerSemiSupplierId_name_key" ON "products"("boardManufacturerSemiSupplierId", "name");

-- AddForeignKey
ALTER TABLE "board_manufacturer_semi_suppliers" ADD CONSTRAINT "board_manufacturer_semi_suppliers_boardManufacturerId_fkey" FOREIGN KEY ("boardManufacturerId") REFERENCES "board_manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_manufacturer_semi_suppliers" ADD CONSTRAINT "board_manufacturer_semi_suppliers_semiSupplierId_fkey" FOREIGN KEY ("semiSupplierId") REFERENCES "semi_suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_boardManufacturerSemiSupplierId_fkey" FOREIGN KEY ("boardManufacturerSemiSupplierId") REFERENCES "board_manufacturer_semi_suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_scanRunId_fkey" FOREIGN KEY ("scanRunId") REFERENCES "scan_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_runs" ADD CONSTRAINT "scan_runs_boardManufacturerId_fkey" FOREIGN KEY ("boardManufacturerId") REFERENCES "board_manufacturers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
