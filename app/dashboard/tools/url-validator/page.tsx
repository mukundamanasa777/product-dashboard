"use client";

import { useState } from "react";
import { Alert, Button, FileButton, Stack, TextInput } from "@mantine/core";
import { IconLink } from "@tabler/icons-react";
import { ToolPageShell } from "../../components/ToolPageShell";

interface Summary {
  total: number;
  ok: number;
  failed: number;
}

function extractFileName(contentDisposition: string | null): string {
  const match = contentDisposition?.match(/filename="([^"]+)"/);
  return match?.[1] ?? "url-check-results.xlsx";
}

/**
 * Standalone tool: upload an .xlsx file, name the column that holds URLs,
 * and get the same file back with a URL Check Result column appended.
 * Hits /api/tools/url-validator directly rather than going through RTK
 * Query — this is a one-shot file-in/file-out request, not app state.
 */
export default function UrlValidatorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [urlColumn, setUrlColumn] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  async function handleSubmit() {
    if (!file || !urlColumn.trim()) return;

    setSubmitting(true);
    setError(null);
    setSummary(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("urlColumn", urlColumn.trim());

      const response = await fetch("/api/tools/url-validator", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          (data as { error?: string } | null)?.error ??
            "URL check failed. Please try again.",
        );
      }

      const total = Number(response.headers.get("X-Total-Rows") ?? "0");
      const ok = Number(response.headers.get("X-Ok-Count") ?? "0");
      const failed = Number(response.headers.get("X-Failed-Count") ?? "0");
      const fileName = extractFileName(
        response.headers.get("Content-Disposition"),
      );

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);

      setSummary({ total, ok, failed });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "URL check failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ToolPageShell
      icon={<IconLink size={22} />}
      title="URL Validator"
      description="Check every URL in a column and get the file back with a result column added."
    >
      <Stack gap="sm">
        <FileButton onChange={setFile} accept=".xlsx">
          {(props) => (
            <Button {...props} variant="default" fullWidth>
              {file ? file.name : "Choose Excel file"}
            </Button>
          )}
        </FileButton>

        <TextInput
          label="URL column name"
          description="Exact header of the column with the URLs to check"
          placeholder="e.g. Product URL"
          value={urlColumn}
          onChange={(event) => setUrlColumn(event.currentTarget.value)}
        />

        <Button
          onClick={handleSubmit}
          loading={submitting}
          disabled={!file || !urlColumn.trim()}
          fullWidth
        >
          Check URLs
        </Button>

        {error && (
          <Alert color="red" title="Couldn't check URLs">
            {error}
          </Alert>
        )}

        {summary && (
          <Alert color="green" title="Done — file downloaded">
            Checked {summary.total} URL{summary.total === 1 ? "" : "s"}:{" "}
            {summary.ok} OK, {summary.failed} failed.
          </Alert>
        )}
      </Stack>
    </ToolPageShell>
  );
}
