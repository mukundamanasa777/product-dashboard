import { TriggerSource } from "@/app/generated/prisma";
import { linkCheckQueue } from "@/lib/queue/linkCheckQueue";
import { createPending } from "../repositories/linkCheckRun.repository";

/**
 * Creates a pending link-check run and enqueues the job that actually
 * checks every product's URL — mirrors triggerScan.service.ts's
 * triggerManufacturerScan, just without a manufacturer to scope to (a link
 * check always covers every checkable product in one go).
 */
export async function triggerLinkCheck(triggerSource: TriggerSource) {
  const run = await createPending(triggerSource);
  await linkCheckQueue.add("run-link-check", { linkCheckRunId: run.id });
  return run;
}
