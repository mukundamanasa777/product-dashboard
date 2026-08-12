// Loads .env for local dev; silently does nothing if the file doesn't
// exist (e.g. in production, where the platform injects env vars
// directly into process.env instead).
import "dotenv/config";
import { scanWorker } from "@/lib/queue/scanWorker";
import { fileUploadWorker } from "@/lib/queue/fileUploadWorker";
import { registerScanSchedule } from "@/lib/queue/scheduler";

async function main() {
  await registerScanSchedule();
  console.log("Scan worker started, listening for jobs...");
  console.log("File upload worker started, listening for jobs...");
}

main().catch((error) => {
  console.error("Failed to start scan worker:", error);
  process.exit(1);
});

process.on("SIGTERM", async () => {
  await scanWorker.close();
  await fileUploadWorker.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await scanWorker.close();
  await fileUploadWorker.close();
  process.exit(0);
});
