import { Worker, type Job } from "bullmq";
import { connection } from "@/lib/redis";
import { scrapeProducts } from "@/features/scanning/services/scrapeProducts";
import { syncProducts } from "@/features/products/services/productSync.service";
import {
  findById,
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

// How long a PROCESSING run is trusted to still genuinely be running before
// a second dispatch for the same scanRunId is allowed to actually redo the
// work. Comfortably above the slowest real run recorded so far (Advantech,
// ~16 min; ADLINK, ~33 min) — high enough that a live run is never mistaken
// for dead, but low enough that a truly crashed worker's job isn't stuck
// PROCESSING forever.
const STALE_PROCESSING_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

async function handleRunScan(job: Job<RunScanJobData>) {
  const { scanRunId, boardManufacturerId } = job.data;

  // BullMQ's stalled-job detector can redeliver a job it *thinks* died
  // (e.g. a brief Redis hiccup delayed a lock-renewal ping) even though the
  // original execution is still alive and finishes normally moments later —
  // this happened for real to Advantech (see run 158 and run 1). Without
  // this guard, that redelivery silently reruns the entire scan from
  // scratch, wasting ~15 minutes and overwriting the first attempt's
  // pageResults/errorMessage before anyone can see what actually happened.
  // If this run is already PROCESSING and recently started, this
  // invocation is almost certainly a duplicate dispatch, not a genuine
  // retry (a genuine retry only happens after markFailed + a throw, which
  // moves status to FAILED first) — skip it entirely rather than redo the
  // work. A PROCESSING row older than the threshold is instead assumed to
  // be a real crash, and allowed to proceed and recover normally.
  const existing = await findById(scanRunId);
  if (
    existing?.status === "PROCESSING" &&
    existing.processingStartedAt &&
    Date.now() - existing.processingStartedAt.getTime() <
      STALE_PROCESSING_THRESHOLD_MS
  ) {
    console.warn(
      `Scan run ${scanRunId} is already PROCESSING (started ${existing.processingStartedAt.toISOString()}) — ` +
        "this looks like a duplicate/stalled-job redelivery, not a genuine retry. Skipping.",
    );
    return;
  }

  await markProcessing(scanRunId);

  // Captured as soon as scraping finishes, so a later failure (e.g. the DB
  // write in syncProducts) still reports which pages actually came back
  // instead of losing that info to the catch block below.
  let pageResults: PageResult[] = [];

  try {
    const scraped = await scrapeProducts(boardManufacturerId);
    pageResults = scraped.pageResults;
    const pageStats = summarizePageResults(pageResults);

    // "No products found" only means something if the scan actually
    // worked. Skip the expiry step — rather than wrongly flagging live
    // products as gone — when either nothing was scraped at all, or any
    // of this manufacturer's pages failed/timed out this run.
    const hadPageFailures = pageStats.pagesFailed > 0 || pageStats.pagesTimedOut > 0;
    const foundNothing = scraped.products.length === 0;
    const skipExpiry = foundNothing || hadPageFailures;
    const skipExpiryReason = foundNothing
      ? "scan returned 0 products"
      : hadPageFailures
        ? `${pageStats.pagesFailed} page(s) failed, ${pageStats.pagesTimedOut} timed out`
        : undefined;

    const result = await syncProducts(
      boardManufacturerId,
      scraped.products,
      scanRunId,
      { skipExpiry, skipExpiryReason },
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
  {
    connection,
    concurrency: 2,
    // Default is 30s — far too short for a browser-rendered scan that can
    // legitimately run 15+ minutes (Advantech: ~16 min, ADLINK: ~33 min).
    // A lock that short means any brief Redis hiccup during a long scan
    // can make BullMQ think the worker died and redeliver the job while
    // the original is still very much alive — exactly what happened to
    // Advantech runs 1 and 158. This is the actual root-cause fix; the
    // STALE_PROCESSING_THRESHOLD_MS guard above is the backstop in case a
    // duplicate dispatch happens anyway (a real crash, a manual re-trigger).
    lockDuration: 60 * 60 * 1000, // 1 hour
  },
);
