import { prisma } from "@/lib/prisma";
import { ScheduleFrequency } from "@/app/generated/prisma";
import {
  buildCronPattern,
  computeNextRunAt,
  type ScheduleFields,
} from "../utils/schedule";

const SCHEDULE_ID = 1;

const DEFAULT_SCHEDULE: ScheduleFields = {
  frequency: ScheduleFrequency.WEEKLY,
  dayOfWeek: 1,
  dayOfMonth: 1,
  hour: 4,
  minute: 0,
};

/**
 * Loads the single global link-check schedule row, creating it with sane
 * defaults (weekly, Monday 4am UTC, inactive-by-default is *not* assumed —
 * matches ScanSchedule's own default of active) on first use.
 */
export async function getOrCreate() {
  const existing = await prisma.linkCheckSchedule.findUnique({
    where: { id: SCHEDULE_ID },
  });
  if (existing) return existing;

  const timezone = "GMT";
  const cronPattern = buildCronPattern(DEFAULT_SCHEDULE);

  return prisma.linkCheckSchedule.create({
    data: {
      id: SCHEDULE_ID,
      ...DEFAULT_SCHEDULE,
      timezone,
      cronPattern,
      nextRunAt: computeNextRunAt(cronPattern, timezone),
    },
  });
}

export interface UpdateScheduleInput extends ScheduleFields {
  timezone: string;
  isActive: boolean;
}

export async function update(input: UpdateScheduleInput) {
  const cronPattern = buildCronPattern(input);

  return prisma.linkCheckSchedule.upsert({
    where: { id: SCHEDULE_ID },
    update: {
      ...input,
      cronPattern,
      nextRunAt: input.isActive
        ? computeNextRunAt(cronPattern, input.timezone)
        : null,
    },
    create: {
      id: SCHEDULE_ID,
      ...input,
      cronPattern,
      nextRunAt: input.isActive
        ? computeNextRunAt(cronPattern, input.timezone)
        : null,
    },
  });
}

export async function markTriggered(now: Date) {
  const schedule = await prisma.linkCheckSchedule.findUniqueOrThrow({
    where: { id: SCHEDULE_ID },
  });

  return prisma.linkCheckSchedule.update({
    where: { id: SCHEDULE_ID },
    data: {
      lastRunAt: now,
      nextRunAt: computeNextRunAt(schedule.cronPattern, schedule.timezone, now),
    },
  });
}
