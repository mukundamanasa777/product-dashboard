-- AlterTable
ALTER TABLE "scan_runs" ADD COLUMN     "pageResults" JSONB,
ADD COLUMN     "pagesFailed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pagesSucceeded" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pagesTimedOut" INTEGER NOT NULL DEFAULT 0;
