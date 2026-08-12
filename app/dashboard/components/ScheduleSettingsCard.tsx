"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Badge,
  Button,
  Card,
  Group,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { formatDateTime } from "../utils/humanize";
import type { ScheduleFrequency } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";
import { useGetScheduleQuery, useUpdateScheduleMutation } from "@/lib/redux/api";

const FREQUENCY_OPTIONS: { value: ScheduleFrequency; label: string }[] = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
];

const DAY_OF_WEEK_OPTIONS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour),
  label: `${String(hour).padStart(2, "0")}:00`,
}));

const MINUTE_OPTIONS = ["0", "5", "15", "30", "45", "50"].map((minute) => ({
  value: minute,
  label: minute.padStart(2, "0"),
}));

// The viewer's IANA timezone (e.g. "Asia/Kolkata"). This never changes for
// the lifetime of the page, so `subscribe` is a no-op — but the value still
// needs `useSyncExternalStore`'s server/client split: the server snapshot
// would otherwise report the *server's* zone (wrong), not the browser's.
function subscribeToTimezone() {
  return () => {};
}
function getTimezoneSnapshot() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
function getServerTimezoneSnapshot() {
  return "UTC";
}

export function ScheduleSettingsCard() {
  const { data: schedule, isLoading: loading } = useGetScheduleQuery();
  const [updateSchedule, { isLoading: saving }] = useUpdateScheduleMutation();
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [frequency, setFrequency] = useState<ScheduleFrequency>("WEEKLY");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [hour, setHour] = useState("4");
  const [minute, setMinute] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const formSeededFor = useRef<number | null>(null);

  // The viewer's real IANA timezone (e.g. "Asia/Kolkata"), not a fixed one.
  const timezone = useSyncExternalStore(
    subscribeToTimezone,
    getTimezoneSnapshot,
    getServerTimezoneSnapshot,
  );

  // Seed the form fields once the schedule loads (or reloads after a save
  // elsewhere invalidates it) — keyed by id so this doesn't refight the
  // user's in-progress edits on every background refetch.
  useEffect(() => {
    if (!schedule || formSeededFor.current === schedule.id) return;
    formSeededFor.current = schedule.id;
    setFrequency(schedule.frequency);
    setDayOfWeek(String(schedule.dayOfWeek));
    setDayOfMonth(schedule.dayOfMonth);
    setHour(String(schedule.hour));
    setMinute(String(schedule.minute));
    setIsActive(schedule.isActive);
  }, [schedule]);

  // Once we know both the saved schedule and the viewer's real timezone,
  // silently re-save if they don't match — e.g. the schedule was created
  // with a server-side default zone before anyone had picked a real one.
  // This keeps "4am" meaning 4am for the person looking at the screen
  // instead of a fixed zone no one asked for. Reads straight from
  // `schedule` (not the form state above) so it can't race the form-seed
  // effect — it only ever needs to correct the timezone field, so it
  // carries every other field through unchanged from the source of truth.
  const selfHealedRef = useRef(false);
  useEffect(() => {
    if (!schedule || schedule.timezone === timezone) return;
    if (selfHealedRef.current) return;
    selfHealedRef.current = true;

    updateSchedule({
      frequency: schedule.frequency,
      dayOfWeek: schedule.dayOfWeek,
      dayOfMonth: schedule.dayOfMonth,
      hour: schedule.hour,
      minute: schedule.minute,
      isActive: schedule.isActive,
      timezone,
    }).catch(() => {
      // Best-effort — the next manual Save will include the right zone too.
    });
  }, [schedule, timezone, updateSchedule]);

  async function handleSave() {
    setError(null);
    try {
      await updateSchedule({
        frequency,
        dayOfWeek: Number(dayOfWeek),
        dayOfMonth,
        hour: Number(hour),
        minute: Number(minute),
        isActive,
        timezone,
      }).unwrap();
    } catch {
      setError("Could not save the schedule. Please try again.");
    }
  }

  return (
    <Card withBorder padding="lg">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={5}>Schedule Settings</Title>
            <Text size="sm" c="dimmed">
              Choose how often scans run automatically for all active board
              manufacturers. Times below are in your local timezone (
              {timezone}).
            </Text>
          </div>
          <Switch
            label="Active"
            checked={isActive}
            onChange={(event) => setIsActive(event.currentTarget.checked)}
          />
        </Group>

        <Group grow align="flex-end">
          <Select
            label="Frequency"
            data={FREQUENCY_OPTIONS}
            value={frequency}
            onChange={(value) => value && setFrequency(value as ScheduleFrequency)}
            allowDeselect={false}
          />

          {frequency === "WEEKLY" && (
            <Select
              label="Day of week"
              data={DAY_OF_WEEK_OPTIONS}
              value={dayOfWeek}
              onChange={(value) => value && setDayOfWeek(value)}
              allowDeselect={false}
            />
          )}

          {frequency === "MONTHLY" && (
            <NumberInput
              label="Day of month"
              min={1}
              max={28}
              value={dayOfMonth}
              onChange={(value) => setDayOfMonth(Number(value) || 1)}
            />
          )}

          <Select
            label="Hour"
            data={HOUR_OPTIONS}
            value={hour}
            onChange={(value) => value && setHour(value)}
            allowDeselect={false}
          />

          <Select
            label="Minute"
            data={MINUTE_OPTIONS}
            value={minute}
            onChange={(value) => value && setMinute(value)}
            allowDeselect={false}
          />
        </Group>

        {error && (
          <Text size="sm" c="red">
            {error}
          </Text>
        )}

        <Group justify="space-between" align="center">
          <Group gap="xl">
            <Stack gap={0}>
              <Text size="xs" c="dimmed">
                Last run
              </Text>
              <Text size="sm">
                {loading ? "…" : formatDateTime(schedule?.lastRunAt)}
              </Text>
            </Stack>
            <Stack gap={0}>
              <Text size="xs" c="dimmed">
                Next run
              </Text>
              <Group gap={6}>
                <Text size="sm">
                  {loading ? "…" : formatDateTime(schedule?.nextRunAt)}
                </Text>
                {!loading && !schedule?.isActive && (
                  <Badge size="xs" color="gray" variant="light">
                    Paused
                  </Badge>
                )}
              </Group>
            </Stack>
          </Group>

          <Button
            onClick={() => setConfirmOpen(true)}
            loading={saving}
            disabled={loading}
          >
            Save Schedule
          </Button>
        </Group>
      </Stack>

      <ConfirmDialog
        opened={confirmOpen}
        title="Save this schedule?"
        message="Future automatic scans will run on this new schedule instead of the current one. You can update it at any time."
        confirmLabel="Save Schedule"
        loading={saving}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          handleSave();
        }}
      />
    </Card>
  );
}
