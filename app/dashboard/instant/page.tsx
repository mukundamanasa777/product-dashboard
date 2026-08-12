"use client";

import { Suspense, useState } from "react";
import {
  Button,
  Card,
  Center,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { ScanRunsTable } from "../components/ScanRunsTable";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useTriggerScanMutation } from "@/lib/redux/api";

export default function InstantTriggeringPage() {
  const [triggerScan, { isLoading: triggering }] = useTriggerScanMutation();
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleTriggerAll() {
    setError(null);
    try {
      await triggerScan().unwrap();
    } catch {
      setError("Could not trigger the scan. Please try again.");
    }
  }

  return (
    <Stack gap="lg">
      <Card withBorder padding="lg">
        <Group justify="space-between" align="center">
          <div>
            <Title order={5}>Instant Trigger</Title>
            <Text size="sm" c="dimmed">
              Runs a scan right now for every active board manufacturer.
            </Text>
          </div>
          <Button onClick={() => setConfirmOpen(true)} loading={triggering}>
            Trigger All Active Manufacturers
          </Button>
        </Group>
        {error && (
          <Text size="sm" c="red" mt="sm">
            {error}
          </Text>
        )}
      </Card>

      <Suspense
        fallback={
          <Center py="xl">
            <Loader size="sm" />
          </Center>
        }
      >
        <ScanRunsTable triggerSource="MANUAL" />
      </Suspense>

      <ConfirmDialog
        opened={confirmOpen}
        title="Trigger a scan now?"
        message="This will start a scan for every active board manufacturer right away. You can't undo this action."
        confirmLabel="Trigger All"
        loading={triggering}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          handleTriggerAll();
        }}
      />
    </Stack>
  );
}
