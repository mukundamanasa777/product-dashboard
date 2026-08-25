import { linkCheckQueue } from "./linkCheckQueue";

const LINK_CHECK_SCHEDULER_ID = "global-link-check-schedule";

/**
 * Registers a fixed every-minute repeatable job, same pattern as
 * registerScanSchedule — the actual frequency/time lives in the
 * LinkCheckSchedule DB row and is evaluated by handleScheduleTick on every
 * one of these ticks, so this repeatable job's own cadence never changes.
 */
export async function registerLinkCheckSchedule() {
  await linkCheckQueue.upsertJobScheduler(
    LINK_CHECK_SCHEDULER_ID,
    { every: 60_000 },
    { name: "link-check-schedule-tick", data: {} },
  );
}
