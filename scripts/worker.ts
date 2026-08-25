// Loads .env for local dev; silently does nothing if the file doesn't
// exist (e.g. in production, where the platform injects env vars
// directly into process.env instead).
import "dotenv/config";
import { scanWorker } from "@/lib/queue/scanWorker";
import { fileUploadWorker } from "@/lib/queue/fileUploadWorker";
import { linkCheckWorker } from "@/lib/queue/linkCheckWorker";
import { registerScanSchedule } from "@/lib/queue/scheduler";
import { registerLinkCheckSchedule } from "@/lib/queue/linkCheckScheduler";

async function main() {
  await registerScanSchedule();
  await registerLinkCheckSchedule();
  console.log("Scan worker started, listening for jobs...");
  console.log("File upload worker started, listening for jobs...");
  console.log("Link check worker started, listening for jobs...");
}

main().catch((error) => {
  console.error("Failed to start scan worker:", error);
  process.exit(1);
});

process.on("SIGTERM", async () => {
  await scanWorker.close();
  await fileUploadWorker.close();
  await linkCheckWorker.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await scanWorker.close();
  await fileUploadWorker.close();
  await linkCheckWorker.close();
  process.exit(0);
});
