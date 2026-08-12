/*
  Warnings:

  - You are about to drop the `product_imports` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "FileUploadStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED');

-- DropTable
DROP TABLE "product_imports";

-- DropEnum
DROP TYPE "ImportStatus";

-- CreateTable
CREATE TABLE "fileuploads" (
    "id" SERIAL NOT NULL,
    "fileName" TEXT NOT NULL,
    "status" "FileUploadStatus" NOT NULL DEFAULT 'PENDING',
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

    CONSTRAINT "fileuploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fileuploads_createdAt_idx" ON "fileuploads"("createdAt");
