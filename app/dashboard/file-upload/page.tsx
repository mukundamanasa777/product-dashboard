"use client";

import { Suspense } from "react";
import { Card, Center, Group, Loader, Stack, Text, Title } from "@mantine/core";
import { FileUploadButton } from "../components/FileUploadButton";
import { FileUploadsTable } from "../components/FileUploadsTable";

export default function FileUploadPage() {
  return (
    <Stack gap="lg">
      <Card withBorder padding="lg">
        <Group justify="space-between" align="center">
          <div>
            <Title order={5}>File Upload</Title>
            <Text size="sm" c="dimmed">
              Bulk-create products from an Excel file. Every row is
              validated up front — if anything&apos;s wrong, nothing is
              imported and you can download a report of just the failing
              rows.
            </Text>
          </div>
          <FileUploadButton />
        </Group>
      </Card>

      <Suspense
        fallback={
          <Center py="xl">
            <Loader size="sm" />
          </Center>
        }
      >
        <FileUploadsTable />
      </Suspense>
    </Stack>
  );
}
