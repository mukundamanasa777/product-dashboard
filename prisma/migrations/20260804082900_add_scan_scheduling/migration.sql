-- CreateEnum
CREATE TYPE "TriggerSource" AS ENUM ('MANUAL', 'SCHEDULED');

-- AlterEnum
-- New enum values must be committed in their own transaction before a
-- later statement (e.g. a column default) can reference them, so the
-- ALTER TABLE that uses 'PENDING' is split into a separate migration.
ALTER TYPE "ScanStatus" ADD VALUE 'PENDING';
ALTER TYPE "ScanStatus" ADD VALUE 'PROCESSING';
