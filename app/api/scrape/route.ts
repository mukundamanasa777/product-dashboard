import { NextResponse } from "next/server";
import { TriggerSource } from "@/app/generated/prisma";
import {
  triggerAllActive,
  triggerManufacturerScan,
} from "@/features/scanning/services/triggerScan.service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const rawId = body?.boardManufacturerId;

  if (rawId === undefined || rawId === null) {
    const runs = await triggerAllActive(TriggerSource.MANUAL);
    return NextResponse.json(
      { scanRunIds: runs.map((run) => run.id), count: runs.length },
      { status: 202 },
    );
  }

  const boardManufacturerId = Number(rawId);
  if (!Number.isInteger(boardManufacturerId)) {
    return NextResponse.json(
      { error: "boardManufacturerId must be an integer" },
      { status: 400 },
    );
  }

  const run = await triggerManufacturerScan(
    boardManufacturerId,
    TriggerSource.MANUAL,
  );

  return NextResponse.json(
    { scanRunId: run.id, status: run.status },
    { status: 202 },
  );
}
