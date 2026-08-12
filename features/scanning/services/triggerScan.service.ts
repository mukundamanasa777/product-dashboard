import { TriggerSource } from "@/app/generated/prisma";
import { scanQueue } from "@/lib/queue/scanQueue";
import { createPending } from "../repositories/scanRun.repository";
import { findAllActive } from "@/features/products/repositories/boardManufacturer.repository";

/**
 * Creates a pending scan run for a single manufacturer and enqueues the
 * job that will actually scrape it.
 */
export async function triggerManufacturerScan(
  boardManufacturerId: number,
  triggerSource: TriggerSource,
) {
  const run = await createPending(boardManufacturerId, triggerSource);
  await scanQueue.add("run-scan", {
    scanRunId: run.id,
    boardManufacturerId,
  });
  return run;
}

/**
 * Fans out a scan run for every currently active manufacturer. Shared by
 * the scheduled tick and the manual "trigger all" action so both paths
 * behave identically.
 */
export async function triggerAllActive(triggerSource: TriggerSource) {
  const manufacturers = await findAllActive();
  const runs = [];
  for (const manufacturer of manufacturers) {
    runs.push(await triggerManufacturerScan(manufacturer.id, triggerSource));
  }
  return runs;
}
