export type PageStatus = "success" | "timeout" | "failed";

export interface PageResult {
  url: string;
  status: PageStatus;
  error?: string;
}

export interface PageResultSummary {
  pagesSucceeded: number;
  pagesTimedOut: number;
  pagesFailed: number;
}

/**
 * Buckets a page-fetch error into "timeout" (the site never responded in
 * time — a Playwright goto/waitForSelector timeout, or an axios request
 * timeout) vs "failed" (anything else: DNS failure, HTTP error status,
 * TLS error, etc.). Lets a scan run report *why* pages didn't come back,
 * not just that some of them didn't.
 */
export function classifyPageError(error: unknown): PageStatus {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string } | null)?.code;

  if (code === "ECONNABORTED" || code === "ETIMEDOUT" || /timeout/i.test(message)) {
    return "timeout";
  }

  return "failed";
}

export function summarizePageResults(pageResults: PageResult[]): PageResultSummary {
  return pageResults.reduce<PageResultSummary>(
    (summary, page) => {
      if (page.status === "success") summary.pagesSucceeded++;
      else if (page.status === "timeout") summary.pagesTimedOut++;
      else summary.pagesFailed++;
      return summary;
    },
    { pagesSucceeded: 0, pagesTimedOut: 0, pagesFailed: 0 },
  );
}
