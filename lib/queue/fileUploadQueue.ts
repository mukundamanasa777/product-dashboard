import { Queue } from "bullmq";
import { connection } from "@/lib/redis";

export const FILE_UPLOAD_QUEUE_NAME = "file-upload-queue";

export interface ProcessFileUploadJobData {
  fileUploadId: number;
}

export const fileUploadQueue = new Queue<ProcessFileUploadJobData>(
  FILE_UPLOAD_QUEUE_NAME,
  {
    connection,
    defaultJobOptions: {
      // Upload failures are almost always data problems (bad columns, bad
      // rows), not transient ones — retrying won't fix a bad file, so
      // don't auto-retry like the scan queue does.
      attempts: 1,
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  },
);
