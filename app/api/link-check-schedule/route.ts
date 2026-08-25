import { NextResponse } from "next/server";
import { ScheduleFrequency } from "@/app/generated/prisma";
import {
  getOrCreate,
  update,
} from "@/features/schedule/repositories/linkCheckSchedule.repository";

const VALID_FREQUENCIES = new Set(Object.values(ScheduleFrequency));

function isIntInRange(value: unknown, min: number, max: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

export async function GET() {
  const schedule = await getOrCreate();
  return NextResponse.json(schedule);
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || !VALID_FREQUENCIES.has(body.frequency)) {
    return NextResponse.json(
      { error: "frequency must be one of DAILY, WEEKLY, MONTHLY" },
      { status: 400 },
    );
  }
  if (!isIntInRange(body.dayOfWeek, 0, 6)) {
    return NextResponse.json(
      { error: "dayOfWeek must be an integer between 0 and 6" },
      { status: 400 },
    );
  }
  if (!isIntInRange(body.dayOfMonth, 1, 28)) {
    return NextResponse.json(
      { error: "dayOfMonth must be an integer between 1 and 28" },
      { status: 400 },
    );
  }
  if (!isIntInRange(body.hour, 0, 23)) {
    return NextResponse.json(
      { error: "hour must be an integer between 0 and 23" },
      { status: 400 },
    );
  }
  if (!isIntInRange(body.minute, 0, 59)) {
    return NextResponse.json(
      { error: "minute must be an integer between 0 and 59" },
      { status: 400 },
    );
  }
  if (typeof body.isActive !== "boolean") {
    return NextResponse.json(
      { error: "isActive must be a boolean" },
      { status: 400 },
    );
  }

  const schedule = await update({
    frequency: body.frequency,
    dayOfWeek: body.dayOfWeek,
    dayOfMonth: body.dayOfMonth,
    hour: body.hour,
    minute: body.minute,
    timezone:
      typeof body.timezone === "string" && body.timezone ? body.timezone : "UTC",
    isActive: body.isActive,
  });

  return NextResponse.json(schedule);
}
