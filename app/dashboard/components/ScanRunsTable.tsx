"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ActionIcon,
  Badge,
  Button,
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
import { useGetScanRunsQuery } from "@/lib/redux/api";
import { formatDateTime } from "../utils/humanize";
import type { ScanStatus, TriggerSource } from "../types";

const STATUS_COLORS: Record<ScanStatus, string> = {
  PENDING: "gray",
  PROCESSING: "blue",
  SUCCESS: "green",
  FAILED: "red",
  RUNNING: "gray",
};

const PAGE_SIZE = 10;

interface ScanRunsTableProps {
  triggerSource: TriggerSource;
}

/**
 * A trigger (manual or scheduled) invalidates this table's cache tag, so
 * it refreshes on its own — no refreshKey prop needed from the parent.
 * The manual refresh button still works, via RTK Query's `refetch()`.
 */
export function ScanRunsTable({ triggerSource }: ScanRunsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Page lives in the URL (not just React state) — same reasoning as the
  // products page's filters — so a refresh or a shared link comes back to
  // the same page of results instead of always resetting to page 1.
  // Instant and Scheduled Triggering are separate routes, each rendering
  // exactly one of these tables, so a plain "page" param never collides.
  const [page, setPage] = useState(() =>
    Number(searchParams.get("page") ?? "1"),
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [page, pathname, router]);

  const { data, isLoading, refetch } = useGetScanRunsQuery({
    triggerSource,
    page,
    pageSize: PAGE_SIZE,
  });

  // scan_id is a hidden, URL-only filter on the products page (no dropdown
  // for it — see ProductsPageClient) — this is the one place that actually
  // links to it. statuses is passed explicitly empty so the products
  // page's default PENDING-only view doesn't hide part of this run.
  function viewProducts(scanRunId: number) {
    router.push(`/dashboard/products?statuses=&scan_id=${scanRunId}`);
  }

  const runs = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          {total} triggering record{total === 1 ? "" : "s"}
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
        <Card withBorder padding="lg">
          <Text c="dimmed" ta="center">
            No triggering records yet
          </Text>
        </Card>
      ) : (
        <Table.ScrollContainer minWidth={700}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Board Manufacturer</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Pages</Table.Th>
                {/* <Table.Th>Started At</Table.Th> */}
                <Table.Th>Processing Started At</Table.Th>
                <Table.Th>Completed At</Table.Th>
                <Table.Th>Action</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {runs.map((run) => (
                <Table.Tr key={run.id}>
                  <Table.Td>
                    <Text size="sm">{run.boardManufacturerName}</Text>
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
                    {run.pagesFailed === 0 && run.pagesTimedOut === 0 ? (
                      <Text size="sm" c="dimmed">
                        {run.pagesSucceeded > 0 ? `${run.pagesSucceeded} ok` : "—"}
                      </Text>
                    ) : (
                      <Tooltip
                        multiline
                        w={420}
                        label={
                          <Stack gap={6}>
                            {run.pagesFailed > 0 && (
                              <div>
                                <Text size="xs" fw={700}>
                                  Failed ({run.pagesFailed})
                                </Text>
                                {run.failedUrls.map((p) => (
                                  <Text size="xs" key={p.url}>
                                    {p.url}
                                    {p.error ? ` — ${p.error}` : ""}
                                  </Text>
                                ))}
                              </div>
                            )}
                            {run.pagesTimedOut > 0 && (
                              <div>
                                <Text size="xs" fw={700}>
                                  Timed out ({run.pagesTimedOut})
                                </Text>
                                {run.timedOutUrls.map((p) => (
                                  <Text size="xs" key={p.url}>
                                    {p.url}
                                    {p.error ? ` — ${p.error}` : ""}
                                  </Text>
                                ))}
                              </div>
                            )}
                          </Stack>
                        }
                      >
                        <Badge color="orange" variant="light" style={{ cursor: "help" }}>
                          {[
                            run.pagesFailed > 0 ? `${run.pagesFailed} failed` : null,
                            run.pagesTimedOut > 0 ? `${run.pagesTimedOut} timed out` : null,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </Badge>
                      </Tooltip>
                    )}
                  </Table.Td>
                  {/* <Table.Td>
                    <Text size="sm">{formatDateTime(run.startedAt)}</Text>
                  </Table.Td> */}
                  <Table.Td>
                    <Text size="sm">{formatDateTime(run.processingStartedAt)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{formatDateTime(run.completedAt)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Tooltip
                      label="This run has no products to show — nothing was created, updated, or expired"
                      disabled={run.reflectedProducts > 0}
                    >
                      {/* Wrapper span, not the Button itself, is what the
                          Tooltip listens on — a disabled button suppresses
                          its own pointer events in most browsers, which
                          would otherwise keep this tooltip from ever
                          showing. */}
                      <span>
                        <Button
                          size="xs"
                          variant="light"
                          // reflectedProducts (new + updated + removed), not
                          // totalProducts — saveProducts.ts never stamps
                          // scanRunId on unchanged products, so the "View
                          // Products" link (which filters by scan_id) would
                          // show nothing for those even though totalProducts
                          // is nonzero. This is the actual count that link
                          // will display, for both manual and scheduled runs.
                          disabled={run.reflectedProducts === 0}
                          onClick={() => viewProducts(run.id)}
                        >
                          View Products
                        </Button>
                      </span>
                    </Tooltip>
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
  );
}
