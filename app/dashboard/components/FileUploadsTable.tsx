"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ActionIcon,
  Anchor,
  Badge,
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
import { useGetFileUploadsQuery } from "@/lib/redux/api";
import { formatDateTime } from "../utils/humanize";
import type { FileUploadStatus } from "../types";

const STATUS_COLORS: Record<FileUploadStatus, string> = {
  PENDING: "gray",
  PROCESSING: "blue",
  SUCCESS: "green",
  FAILED: "red",
};

const PAGE_SIZE = 10;

/**
 * A successful upload invalidates this table's cache tag, so it refreshes
 * on its own — no refreshKey prop needed from the parent. The manual
 * refresh button still works, via RTK Query's `refetch()`.
 */
export function FileUploadsTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Page lives in the URL (not just React state) — same reasoning as the
  // products page's filters — so a refresh or a shared link comes back to
  // the same page of results instead of always resetting to page 1.
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

  const { data, isLoading, refetch } = useGetFileUploadsQuery({
    page,
    pageSize: PAGE_SIZE,
  });

  const uploads = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text size="sm" fw={600} c="dimmed">
          {total} upload{total === 1 ? "" : "s"}
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
      ) : uploads.length === 0 ? (
        <Card withBorder padding="lg">
          <Text c="dimmed" ta="center">
            No file uploads yet
          </Text>
        </Card>
      ) : (
        <Table.ScrollContainer minWidth={700}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>File</Table.Th>
                <Table.Th>Uploaded At</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Total Rows</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th>Errors</Table.Th>
                <Table.Th>Error File</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {uploads.map((item) => (
                <Table.Tr key={item.id}>
                  <Table.Td>
                    <Tooltip label="Download the uploaded file">
                      <Anchor
                        size="sm"
                        href={`/api/file-uploads/${item.id}/source-file`}
                      >
                        {item.fileName}
                      </Anchor>
                    </Tooltip>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{formatDateTime(item.createdAt)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Tooltip
                      label={item.errorMessage ?? ""}
                      disabled={item.status !== "FAILED" || !item.errorMessage}
                    >
                      <Badge color={STATUS_COLORS[item.status]} variant="light">
                        {item.status}
                      </Badge>
                    </Tooltip>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{item.totalRows ?? "—"}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{item.createdCount ?? "—"}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c={item.errorCount ? "red" : undefined}>
                      {item.errorCount ?? "—"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {item.status === "FAILED" && !!item.errorCount && (
                      <Anchor
                        size="sm"
                        href={`/api/file-uploads/${item.id}/error-file`}
                      >
                        Download errors
                      </Anchor>
                    )}
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
