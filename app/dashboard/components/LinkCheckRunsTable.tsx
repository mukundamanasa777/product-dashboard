"use client";

import { useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Card,
  Center,
  Group,
  Loader,
  Pagination,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import { useGetLinkCheckRunsQuery } from "@/lib/redux/api";
import { formatDateTime } from "../utils/humanize";
import { TriggerFilter } from "./TriggerFilter";
import { LinkCheckStatusFilter } from "./LinkCheckStatusFilter";
import type { LinkCheckStatus, TriggerSource } from "../types";

const STATUS_COLORS: Record<LinkCheckStatus, string> = {
  PENDING: "gray",
  PROCESSING: "blue",
  SUCCESS: "green",
  FAILED: "red",
};

const TRIGGER_COLORS: Record<TriggerSource, string> = {
  MANUAL: "grape",
  SCHEDULED: "cyan",
};

const PAGE_SIZE = 10;

/**
 * Run history for the "Check All Links" job — lives on its own dedicated
 * page (unlike scanning, which splits Instant/Scheduled across two pages
 * and two ScanRunsTable instances), so this always shows every run
 * together with a Trigger column instead of taking a triggerSource prop.
 *
 * No board-manufacturer filter here — a link-check run isn't scoped to
 * one manufacturer at all (it checks every checkable product across every
 * manufacturer in a single run), so there's nothing per-row to filter by.
 */
export function LinkCheckRunsTable() {
  const [page, setPage] = useState(1);

  // Not URL-synced — same trade-off as ScanRunsTable's filters.
  const [triggerSources, setTriggerSources] = useState<TriggerSource[]>([]);
  const [statuses, setStatuses] = useState<LinkCheckStatus[]>([]);

  function handleTriggerSourcesChange(next: TriggerSource[]) {
    setTriggerSources(next);
    setPage(1);
  }
  function handleStatusesChange(next: LinkCheckStatus[]) {
    setStatuses(next);
    setPage(1);
  }

  const { data, isLoading, refetch } = useGetLinkCheckRunsQuery({
    triggerSources,
    statuses,
    page,
    pageSize: PAGE_SIZE,
  });

  const runs = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Stack gap="lg">
      <Card withBorder padding="md">
        <Group align="flex-start" gap="xl" wrap="wrap">
          <Box miw={220}>
            <TriggerFilter
              selected={triggerSources}
              onChange={handleTriggerSourcesChange}
            />
          </Box>
          <Box miw={220}>
            <LinkCheckStatusFilter
              selected={statuses}
              onChange={handleStatusesChange}
            />
          </Box>
        </Group>
      </Card>

      <Card withBorder padding="lg">
        <Stack gap="md">
          <Group justify="space-between">
            <Text fw={600} size="sm">
              Link check runs
            </Text>
            <Tooltip label="Refresh now">
              <ActionIcon
                variant="light"
                onClick={() => refetch()}
                aria-label="Refresh"
              >
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>

          {isLoading ? (
            <Center py="xl">
              <Loader size="sm" />
            </Center>
          ) : runs.length === 0 ? (
            <Text c="dimmed" ta="center" py="lg">
              No link check runs yet
            </Text>
          ) : (
            <Table.ScrollContainer minWidth={700}>
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Trigger</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Checked</Table.Th>
                    <Table.Th>OK</Table.Th>
                    <Table.Th>Broken</Table.Th>
                    <Table.Th>Started At</Table.Th>
                    <Table.Th>Completed At</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {runs.map((run) => (
                    <Table.Tr key={run.id}>
                      <Table.Td>
                        <Badge
                          color={TRIGGER_COLORS[run.triggerSource]}
                          variant="outline"
                        >
                          {run.triggerSource}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Tooltip
                          label={run.errorMessage ?? ""}
                          disabled={run.status !== "FAILED" || !run.errorMessage}
                        >
                          <Badge color={STATUS_COLORS[run.status]} variant="light">
                            {run.status}
                          </Badge>
                        </Tooltip>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{run.checked}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="green">
                          {run.okCount}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c={run.brokenCount > 0 ? "orange" : "dimmed"}>
                          {run.brokenCount}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{formatDateTime(run.startedAt)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{formatDateTime(run.completedAt)}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}

          {totalPages > 1 && (
            <Pagination total={totalPages} value={page} onChange={setPage} />
          )}
        </Stack>
      </Card>
    </Stack>
  );
}
