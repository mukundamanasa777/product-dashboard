-- AlterTable
ALTER TABLE "scan_runs" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "jobId" TEXT,
ADD COLUMN     "processingStartedAt" TIMESTAMP(3),
ADD COLUMN     "triggerSource" "TriggerSource" NOT NULL DEFAULT 'MANUAL',
ALTER COLUMN "status" SET DEFAULT 'PENDING';
