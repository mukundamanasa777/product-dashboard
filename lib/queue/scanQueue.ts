import { Queue } from "bullmq";
import { connection } from "@/lib/redis";

export const SCAN_QUEUE_NAME = "scan-queue";

export interface RunScanJobData {
  scanRunId: number;
  boardManufacturerId: number;
}

export type ScanJobData = RunScanJobData | Record<string, never>;

export const scanQueue = new Queue<ScanJobData>(SCAN_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});
