import { scanQueue } from "./scanQueue";

const SCAN_SCHEDULER_ID = "global-scan-schedule";

/**
 * Registers a fixed every-minute repeatable job. The schedule itself
 * (frequency/time) lives in the ScanSchedule DB row and is evaluated by
 * handleScheduleTick on every one of these ticks — this repeatable job's
 * own cadence never needs to change.
 */
export async function registerScanSchedule() {
  await scanQueue.upsertJobScheduler(
    SCAN_SCHEDULER_ID,
    { every: 60_000 },
    { name: "schedule-tick", data: {} },
  );
}
