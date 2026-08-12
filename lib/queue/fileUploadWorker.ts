import { Worker, type Job } from "bullmq";
import { connection } from "@/lib/redis";
import {
  ImportStructureError,
  importProducts,
} from "@/features/import-export/services/productImport.service";
import {
  getSourceFile,
  markProcessing,
  markRowErrors,
  markStructuralFailure,
  markSuccess,
} from "@/features/import-export/repositories/fileUpload.repository";
import {
  FILE_UPLOAD_QUEUE_NAME,
  type ProcessFileUploadJobData,
} from "./fileUploadQueue";

async function handleProcessFileUpload(job: Job<ProcessFileUploadJobData>) {
  const { fileUploadId } = job.data;

  await markProcessing(fileUploadId);

  try {
    const record = await getSourceFile(fileUploadId);
    if (!record) {
      throw new Error(`FileUpload #${fileUploadId} not found`);
    }

    // Prisma hands back Bytes columns as Uint8Array<ArrayBuffer>, not a
    // Node Buffer — importProducts wants a real Buffer.
    const result = await importProducts(Buffer.from(record.sourceFile));

    if (!result.ok) {
      await markRowErrors(fileUploadId, {
        totalRows: result.totalRows,
        errorCount: result.errorCount,
        errorFile: result.errorFileBuffer,
      });
      return;
    }

    await markSuccess(fileUploadId, result.created);
  } catch (error) {
    const message =
      error instanceof ImportStructureError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);
    await markStructuralFailure(fileUploadId, message);
    // Not re-thrown: a bad file isn't a transient failure BullMQ should
    // retry (attempts: 1 on the queue already reflects this), and the
    // FileUpload row itself is the durable record of what happened.
  }
}

export const fileUploadWorker = new Worker(
  FILE_UPLOAD_QUEUE_NAME,
  async (job) => handleProcessFileUpload(job as Job<ProcessFileUploadJobData>),
  { connection, concurrency: 2 },
);
