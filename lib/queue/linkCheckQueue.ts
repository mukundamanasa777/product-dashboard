import { Queue } from "bullmq";
import { connection } from "@/lib/redis";

export const LINK_CHECK_QUEUE_NAME = "link-check-queue";

export interface RunLinkCheckJobData {
  linkCheckRunId: number;
}

export type LinkCheckJobData = RunLinkCheckJobData | Record<string, never>;

export const linkCheckQueue = new Queue<LinkCheckJobData>(
  LINK_CHECK_QUEUE_NAME,
  {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  },
);
