-- CreateEnum
CREATE TYPE "ProductSource" AS ENUM ('SCRAPED', 'UPLOADED');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "source" "ProductSource" NOT NULL DEFAULT 'SCRAPED';
