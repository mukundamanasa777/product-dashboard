"use client";

import { useState } from "react";
import { Anchor, Button, FileButton, Group, Stack, Text } from "@mantine/core";
import { useUploadFileMutation } from "@/lib/redux/api";

/**
 * Uploads an Excel file to /api/file-uploads. The request only enqueues a
 * background job and returns immediately (202) — the actual parsing/
 * validation/commit happens asynchronously in the worker. The mutation
 * invalidates the FileUpload list tag, so FileUploadsTable below picks up
 * the new row on its own — no callback prop needed here.
 */
export function FileUploadButton() {
  const [uploadFile, { isLoading: uploading }] = useUploadFileMutation();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleFile(file: File | null) {
    if (!file) return;

    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await uploadFile(formData).unwrap();
      setMessage({
        type: "success",
        text: `Upload #${data.fileUploadId} queued — check the table below for progress.`,
      });
    } catch (err) {
      const message =
        err && typeof err === "object" && "data" in err
          ? (err.data as { error?: string } | undefined)?.error
          : undefined;
      setMessage({
        type: "error",
        text: message ?? "Upload failed. Please try again.",
      });
    }
  }

  return (
    <Stack gap={4}>
      <Group gap="xs">
        <FileButton onChange={handleFile} accept=".xlsx">
          {(props) => (
            <Button {...props} loading={uploading}>
              Upload Excel File
            </Button>
          )}
        </FileButton>
        <Anchor href="/api/file-uploads/template" size="sm">
          Download template
        </Anchor>
      </Group>
      {message && (
        <Text size="xs" c={message.type === "error" ? "red" : "green"}>
          {message.text}
        </Text>
      )}
    </Stack>
  );
}
