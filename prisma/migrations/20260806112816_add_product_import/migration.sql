-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "product_imports" (
    "id" SERIAL NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "sourceFile" BYTEA NOT NULL,
    "totalRows" INTEGER,
    "createdCount" INTEGER,
    "errorCount" INTEGER,
    "errorMessage" TEXT,
    "errorFile" BYTEA,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_imports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_imports_createdAt_idx" ON "product_imports"("createdAt");
