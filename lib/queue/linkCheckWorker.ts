import { Worker, type Job } from "bullmq";
import { connection } from "@/lib/redis";
import { checkAllProductLinks } from "@/features/products/services/linkCheck.service";
import {
  findById,
  markProcessing,
  markSuccess,
  markFailed,
} from "@/features/products/repositories/linkCheckRun.repository";
import {
  getOrCreate as getOrCreateLinkCheckSchedule,
  markTriggered,
} from "@/features/schedule/repositories/linkCheckSchedule.repository";
import { triggerLinkCheck } from "@/features/products/services/triggerLinkCheck.service";
import { TriggerSource } from "@/app/generated/prisma";
import {
  LINK_CHECK_QUEUE_NAME,
  type RunLinkCheckJobData,
} from "./linkCheckQueue";

// A link check has no browser-rendering waits or per-manufacturer throttling
// like a scan does — checkAllProductLinks just fetches every candidate URL
// at CONCURRENCY 8 — so it should never legitimately run anywhere near this
// long. Kept well above a realistically slow run rather than tuned tight,
// same reasoning as scanWorker's STALE_PROCESSING_THRESHOLD_MS.
const STALE_PROCESSING_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

async function handleRunLinkCheck(job: Job<RunLinkCheckJobData>) {
  const { linkCheckRunId } = job.data;

  // Same duplicate-dispatch guard as scanWorker's handleRunScan — a BullMQ
  // stalled-job redelivery shouldn't restart an already-running check.
  const existing = await findById(linkCheckRunId);
  if (
    existing?.status === "PROCESSING" &&
    existing.processingStartedAt &&
    Date.now() - existing.processingStartedAt.getTime() <
      STALE_PROCESSING_THRESHOLD_MS
  ) {
    console.warn(
      `Link check run ${linkCheckRunId} is already PROCESSING (started ${existing.processingStartedAt.toISOString()}) — ` +
        "this looks like a duplicate/stalled-job redelivery, not a genuine retry. Skipping.",
    );
    return;
  }

  await markProcessing(linkCheckRunId);

  try {
    const summary = await checkAllProductLinks();
    await markSuccess(linkCheckRunId, summary);
  } catch (error) {
    await markFailed(
      linkCheckRunId,
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

/**
 * Runs every minute (see registerLinkCheckSchedule). Checks the DB-backed
 * LinkCheckSchedule row and only fires a link-check run when it's actually
 * due — same pattern as scanWorker's handleScheduleTick.
 */
async function handleScheduleTick() {
  const now = new Date();
  const schedule = await getOrCreateLinkCheckSchedule();

  if (!schedule.isActive) return;
  if (!schedule.nextRunAt || schedule.nextRunAt > now) return;

  await triggerLinkCheck(TriggerSource.SCHEDULED);
  await markTriggered(now);
}

export const linkCheckWorker = new Worker(
  LINK_CHECK_QUEUE_NAME,
  async (job) => {
    if (job.name === "link-check-schedule-tick") {
      return handleScheduleTick();
    }
    if (job.name === "run-link-check") {
      return handleRunLinkCheck(job as Job<RunLinkCheckJobData>);
    }
  },
  {
    connection,
    // Only one link-check run is ever meaningful at a time (it isn't
    // scoped to a manufacturer like a scan job is) — concurrency 1 means a
    // second trigger while one is already running just queues behind it
    // instead of two runs racing to update the same products.
    concurrency: 1,
  },
);
