import { Worker, type Job } from "bullmq";
import { connection } from "@/lib/redis";
import { scrapeProducts } from "@/features/scanning/services/scrapeProducts";
import { syncProducts } from "@/features/products/services/productSync.service";
import {
  markProcessing,
  markSuccess,
  markFailed,
} from "@/features/scanning/repositories/scanRun.repository";
import {
  getOrCreate as getOrCreateSchedule,
  markTriggered,
} from "@/features/schedule/repositories/scanSchedule.repository";
import { triggerAllActive } from "@/features/scanning/services/triggerScan.service";
import { TriggerSource } from "@/app/generated/prisma";
import { SCAN_QUEUE_NAME, type RunScanJobData } from "./scanQueue";

async function handleRunScan(job: Job<RunScanJobData>) {
  const { scanRunId, boardManufacturerId } = job.data;

  await markProcessing(scanRunId);

  try {
    const scrapedProducts = await scrapeProducts(boardManufacturerId);
    const result = await syncProducts(
      boardManufacturerId,
      scrapedProducts,
      scanRunId,
    );

    await markSuccess(scanRunId, {
      totalProducts: result.summary.scrapedRecords,
      newProducts: result.summary.newRecords,
      updatedProducts: result.summary.updatedRecords,
      removedProducts: result.summary.expiredRecords,
    });
  } catch (error) {
    await markFailed(
      scanRunId,
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

/**
 * Runs every minute (see registerScanSchedule). Checks the DB-backed
 * ScanSchedule row and only fans out run-scan jobs when it's actually due,
 * then advances lastRunAt/nextRunAt for the next occurrence.
 */
async function handleScheduleTick() {
  const now = new Date();
  const schedule = await getOrCreateSchedule();

  if (!schedule.isActive) return;
  if (!schedule.nextRunAt || schedule.nextRunAt > now) return;

  await triggerAllActive(TriggerSource.SCHEDULED);
  await markTriggered(now);
}

export const scanWorker = new Worker(
  SCAN_QUEUE_NAME,
  async (job) => {
    if (job.name === "schedule-tick") {
      return handleScheduleTick();
    }
    if (job.name === "run-scan") {
      return handleRunScan(job as Job<RunScanJobData>);
    }
  },
  { connection, concurrency: 2 },
);
