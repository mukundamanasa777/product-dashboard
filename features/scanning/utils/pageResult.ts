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

// Same phrase list browserRequest.ts's looksBlocked check uses for
// Playwright fetches. Kept here too so the plain axios path (request.ts,
// via scraper.ts's fetchPage) and any other future fetcher can flag a
// bot-challenge page by content, not just by HTTP status — some challenge
// modes return a normal 200.
const BOT_CHALLENGE_PATTERN =
  /just a moment|checking your browser|attention required|cf-browser-verification|verify you are human|are you a robot|enable javascript and cookies|access denied|ddos protection by|one more step/i;

/**
 * Heuristic only — a false "no" just means none of these known phrases
 * happened to be in this particular challenge page, not that the HTML is
 * definitely real product markup. Useful for a quick log-line verdict;
 * for a real answer, read the actual [scrape-debug] HTML snippet.
 */
export function looksLikeBotChallenge(html: string): boolean {
  return BOT_CHALLENGE_PATTERN.test(html);
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
