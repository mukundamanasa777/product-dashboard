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
import { Prisma, TriggerSource } from "@/app/generated/prisma";
import { SCAN_QUEUE_NAME, type RunScanJobData } from "./scanQueue";
import {
  summarizePageResults,
  type PageResult,
} from "@/features/scanning/utils/pageResult";

async function handleRunScan(job: Job<RunScanJobData>) {
  const { scanRunId, boardManufacturerId } = job.data;

  await markProcessing(scanRunId);

  // Captured as soon as scraping finishes, so a later failure (e.g. the DB
  // write in syncProducts) still reports which pages actually came back
  // instead of losing that info to the catch block below.
  let pageResults: PageResult[] = [];

  try {
    const scraped = await scrapeProducts(boardManufacturerId);
    pageResults = scraped.pageResults;

    const result = await syncProducts(
      boardManufacturerId,
      scraped.products,
      scanRunId,
    );

    await markSuccess(scanRunId, {
      totalProducts: result.summary.scrapedRecords,
      newProducts: result.summary.newRecords,
      updatedProducts: result.summary.updatedRecords,
      removedProducts: result.summary.expiredRecords,
      ...summarizePageResults(pageResults),
      pageResults: pageResults as unknown as Prisma.InputJsonValue,
    });
  } catch (error) {
    await markFailed(
      scanRunId,
      error instanceof Error ? error.message : String(error),
      {
        ...summarizePageResults(pageResults),
        pageResults: pageResults as unknown as Prisma.InputJsonValue,
      },
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
