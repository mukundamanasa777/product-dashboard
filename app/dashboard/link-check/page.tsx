"use client";

import { Suspense, useState } from "react";
import {
  Alert,
  Anchor,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { LinkCheckScheduleCard } from "../components/LinkCheckScheduleCard";
import { LinkCheckRunsTable } from "../components/LinkCheckRunsTable";
import { useCheckProductLinksMutation } from "@/lib/redux/api";

/**
 * Dedicated page for the "Check All Links" job — the link-check equivalent
 * of /dashboard/instant + /dashboard/scheduled combined into one page
 * (link checks aren't scoped to a manufacturer, so there's no need to
 * split instant/scheduled triggering across two pages the way scanning
 * does; one page with a trigger card, a schedule card, and one run-history
 * table covering both trigger sources is enough).
 */
export default function LinkCheckPage() {
  const [checkProductLinks, { isLoading: triggering }] =
    useCheckProductLinksMutation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [triggerResult, setTriggerResult] = useState<
    { runId: number } | { error: string } | null
  >(null);

  async function handleTrigger() {
    setConfirmOpen(false);
    setTriggerResult(null);
    try {
      const { linkCheckRunId } = await checkProductLinks().unwrap();
      setTriggerResult({ runId: linkCheckRunId });
    } catch {
      setTriggerResult({
        error: "Could not start the link check. Please try again.",
      });
    }
  }

  return (
    <Stack gap="lg">
      <Card withBorder padding="lg">
        <Group justify="space-between" align="center">
          <div>
            <Title order={5}>Check All Links Now</Title>
            <Text size="sm" c="dimmed">
              Fetches every active product&apos;s URL right away and flags any
              that aren&apos;t working as Not Found, moving them to Pending
              for review. Runs in the background — this can take a while for
              a large catalog.
            </Text>
          </div>
          <Button onClick={() => setConfirmOpen(true)} loading={triggering}>
            Check All Links Now
          </Button>
        </Group>

        {triggerResult &&
          ("error" in triggerResult ? (
            <Alert color="red" title="Link check failed to start" mt="sm">
              {triggerResult.error}
            </Alert>
          ) : (
            <Alert color="blue" title="Link check started" mt="sm">
              Running in the background — see it appear in the table below,
              and once it finishes, review whatever got flagged on the{" "}
              <Anchor href="/dashboard/products" size="sm">
                Products page
              </Anchor>
              .
            </Alert>
          ))}
      </Card>

      <LinkCheckScheduleCard />

      <Suspense
        fallback={
          <Center py="xl">
            <Loader size="sm" />
          </Center>
        }
      >
        <LinkCheckRunsTable />
      </Suspense>

      <ConfirmDialog
        opened={confirmOpen}
        title="Check all product links now?"
        message="This fetches every active product's URL and flags any that aren't working as Not Found, moving them to Pending for review. This can take a while for a large catalog."
        confirmLabel="Check Links"
        loading={triggering}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleTrigger}
      />
    </Stack>
  );
}
