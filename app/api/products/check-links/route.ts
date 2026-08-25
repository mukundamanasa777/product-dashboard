import { NextResponse } from "next/server";
import { TriggerSource } from "@/app/generated/prisma";
import { triggerLinkCheck } from "@/features/products/services/triggerLinkCheck.service";

// Enqueues the check and returns immediately — see linkCheckWorker for the
// actual work. Mirrors app/api/scrape/route.ts's manual-trigger shape.
export async function POST() {
  const run = await triggerLinkCheck(TriggerSource.MANUAL);
  return NextResponse.json(
    { linkCheckRunId: run.id, status: run.status },
    { status: 202 },
  );
}
