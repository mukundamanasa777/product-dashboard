import { CronExpressionParser } from "cron-parser";
import { ScheduleFrequency } from "@/app/generated/prisma";

export interface ScheduleFields {
  frequency: ScheduleFrequency;
  dayOfWeek: number;
  dayOfMonth: number;
  hour: number;
  minute: number;
}

/**
 * Builds a 5-field cron pattern from structured schedule fields.
 * WEEKLY uses dayOfWeek (0=Sunday..6=Saturday), MONTHLY uses dayOfMonth (1-28).
 */
export function buildCronPattern({
  frequency,
  dayOfWeek,
  dayOfMonth,
  hour,
  minute,
}: ScheduleFields): string {
  switch (frequency) {
    case "DAILY":
      return `${minute} ${hour} * * *`;
    case "WEEKLY":
      return `${minute} ${hour} * * ${dayOfWeek}`;
    case "MONTHLY":
      return `${minute} ${hour} ${dayOfMonth} * *`;
  }
}

/**
 * Computes the next occurrence of a cron pattern strictly after `from`
 * (defaults to now).
 */
export function computeNextRunAt(
  cronPattern: string,
  timezone: string,
  from: Date = new Date(),
): Date {
  const interval = CronExpressionParser.parse(cronPattern, {
    currentDate: from,
    tz: timezone,
  });
  return interval.next().toDate();
}
