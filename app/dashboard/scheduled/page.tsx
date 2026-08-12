"use client";

import { Suspense } from "react";
import { Center, Loader, Stack } from "@mantine/core";
import { ScheduleSettingsCard } from "../components/ScheduleSettingsCard";
import { ScanRunsTable } from "../components/ScanRunsTable";

export default function ScheduledTriggeringPage() {
  return (
    <Stack gap="lg">
      <ScheduleSettingsCard />
      <Suspense
        fallback={
          <Center py="xl">
            <Loader size="sm" />
          </Center>
        }
      >
        <ScanRunsTable triggerSource="SCHEDULED" />
      </Suspense>
    </Stack>
  );
}
