import {
  buildWorkbookBuffer,
  readWorkbookRows,
} from "@/features/import-export/utils/xlsx";

const REQUEST_TIMEOUT_MS = 15_000;
// How many URLs to check at once — plain Promise.all over every row would
// fire every request simultaneously, which is both a good way to get
// rate-limited and a bad way to be a considerate client of whatever site
// is on the other end.
const CONCURRENCY = 8;
// 1 initial attempt + this many retries, only for failures that look
// transient (see TRANSIENT_RESULTS) — a lot of "fetch failed"/timeout
// results are a slow server or one dropped packet, not a genuinely dead
// link, and disappear on a second try.
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 700;

// Two opposite bot-detection failure modes exist in the wild, and a single
// static header set can't win both:
//   - naive filters block anything that doesn't look like a browser at all
//   - smarter bot-management (e.g. Cloudflare) does the opposite: it
//     penalizes a request that *claims* to be a browser (a Chrome UA) but
//     doesn't back that up with a matching TLS/JS fingerprint, while
//     treating an honestly-declared non-browser client more leniently
// Confirmed against a real Cloudflare-protected site during testing: a
// spoofed Chrome UA got 403, while an honest non-browser UA (or none at
// all) got 200 on the exact same request. So this tries the honest UA
// first, and only falls back to a browser impersonation if that specific
// site turns out to be the other, naive-filter kind.
const HONEST_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; URLChecker/1.0)",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const TRANSIENT_RESULTS = new Set(["Timed Out", "Could Not Connect", "Connection Reset"]);
// Results ambiguous enough to be a bot-filter reaction to *this specific
// request's* fingerprint, rather than a genuinely dead/unreachable site —
// worth one retry under the other header set before accepting them.
const UA_SENSITIVE_RESULTS = new Set([
  "Forbidden / Blocked",
  "Could Not Connect",
  "Connection Reset",
]);

/**
 * Network-level failures aren't the only transient case — some sites'
 * bot-management scoring is genuinely probabilistic (confirmed on a real
 * site: three identical requests a second apart got challenge/200/200), so
 * a 5xx or 429 can just as easily be "try again" rather than "actually
 * down". Checked by status code rather than the string label, since
 * describeStatus() only returns "Server Error" for the whole 500+ range.
 */
function isRetryable(outcome: CheckOutcome): boolean {
  if (TRANSIENT_RESULTS.has(outcome.result)) return true;
  return outcome.statusCode !== null && (outcome.statusCode >= 500 || outcome.statusCode === 429);
}

/**
 * File-level problems (no header row, no matching column, no data rows)
 * that mean the file can't be processed at all — as opposed to a single
 * URL failing its check, which is a normal result, not an error. Callers
 * turn this into a plain 400.
 */
export class UrlValidatorStructureError extends Error {}

export interface UrlValidatorResult {
  fileBuffer: Buffer;
  totalRows: number;
  okCount: number;
  failedCount: number;
}

export interface CheckOutcome {
  statusCode: number | null;
  result: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Excel columns full of "example.com/page" (no scheme) are the actual, far
 * more common cause of "Invalid URL" than a missing "www." — the WHATWG
 * URL parser flat-out refuses anything without http(s):// on the front.
 * This adds https:// when it's missing before anything is validated or
 * fetched at all.
 */
function normalizeUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(withScheme);
  } catch {
    return null;
  }
}

function hasWwwHost(url: URL): boolean {
  return url.hostname.toLowerCase().startsWith("www.");
}

function withWww(url: URL): URL {
  const wwwUrl = new URL(url.toString());
  wwwUrl.hostname = `www.${wwwUrl.hostname}`;
  return wwwUrl;
}

// A Cloudflare interactive/JS challenge (Turnstile) answers with its own
// 403 page instead of the real one — no header trick can get past this
// (it requires actually executing JavaScript and passing a browser
// fingerprint check), so it isn't worth retrying under the other header
// set. The `cf-mitigated: challenge` response header is Cloudflare's own
// signal that this is what happened, confirmed against a real site.
function isBotChallenge(response: Response): boolean {
  const mitigated = response.headers.get("cf-mitigated");
  return !!mitigated && mitigated.toLowerCase().includes("challenge");
}

/** Turns an HTTP status into the kind of label a non-technical reader can act on. */
function describeStatus(status: number): string {
  if (status >= 200 && status < 300) return "OK";
  if (status === 401) return "Unauthorized";
  if (status === 403) return "Forbidden / Blocked";
  if (status === 404) return "Not Found";
  if (status === 405) return "Method Not Allowed";
  if (status === 408) return "Request Timeout";
  if (status === 429) return "Too Many Requests";
  if (status >= 500) return "Server Error";
  if (status >= 400) return "Client Error";
  if (status >= 300) return "Redirected";
  return "Unknown";
}

/**
 * Node's fetch throws a generic `TypeError: fetch failed` for every
 * network-level problem, with the actual reason buried in `err.cause.code`
 * (Node's usual ENOTFOUND/ECONNREFUSED/etc.) — this is what turns that back
 * into something a non-technical person can read.
 */
function classifyFailure(err: unknown): CheckOutcome {
  if (err instanceof Error && err.name === "AbortError") {
    return { statusCode: null, result: "Timed Out" };
  }

  const cause =
    err instanceof Error && "cause" in err
      ? (err.cause as { code?: string } | undefined)
      : undefined;

  switch (cause?.code) {
    case "ENOTFOUND":
    case "EAI_AGAIN":
      return { statusCode: null, result: "Site Not Found" };
    case "ECONNREFUSED":
      return { statusCode: null, result: "Connection Refused" };
    case "ECONNRESET":
      return { statusCode: null, result: "Connection Reset" };
    case "CERT_HAS_EXPIRED":
    case "ERR_TLS_CERT_ALTNAME_INVALID":
    case "UNABLE_TO_VERIFY_LEAF_SIGNATURE":
    case "DEPTH_ZERO_SELF_SIGNED_CERT":
    case "SELF_SIGNED_CERT_IN_CHAIN":
      return { statusCode: null, result: "Security Certificate Error" };
    default:
      return { statusCode: null, result: "Could Not Connect" };
  }
}

async function attemptOnce(
  url: URL,
  headers: Record<string, string>,
): Promise<CheckOutcome> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    // fetch never throws on a non-2xx response — a 404/500/etc. *is* the
    // answer being reported here, not a failure of the check itself. It
    // only throws for a network-level failure (DNS, refused connection,
    // the abort below on timeout).
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers,
    });
    // The status is all that's needed — cancel the body so the connection
    // is released instead of downloading the full page.
    const isChallenge = isBotChallenge(response);
    await response.body?.cancel();

    if (isChallenge) {
      return {
        statusCode: response.status,
        result: "Blocked by Bot Challenge",
      };
    }

    return { statusCode: response.status, result: describeStatus(response.status) };
  } catch (err) {
    return classifyFailure(err);
  } finally {
    clearTimeout(timeout);
  }
}

async function attemptWithRetry(
  url: URL,
  headers: Record<string, string>,
): Promise<CheckOutcome> {
  let outcome = await attemptOnce(url, headers);

  for (
    let attempt = 1;
    attempt < MAX_ATTEMPTS && isRetryable(outcome);
    attempt++
  ) {
    await sleep(RETRY_DELAY_MS);
    outcome = await attemptOnce(url, headers);
  }

  return outcome;
}

/**
 * Tries one URL with the honest, non-browser-claiming headers first, and
 * only re-tries under a spoofed-browser header set if that specific
 * result looks like a bot filter reacting to the request rather than the
 * site genuinely being unreachable — see UA_SENSITIVE_RESULTS above.
 */
async function attemptUrl(url: URL): Promise<CheckOutcome> {
  const outcome = await attemptWithRetry(url, HONEST_HEADERS);

  if (UA_SENSITIVE_RESULTS.has(outcome.result)) {
    const altOutcome = await attemptWithRetry(url, BROWSER_HEADERS);
    // Prefer the browser-UA attempt if it actually got further — either a
    // real HTTP response where the honest UA got none, or a result that's
    // no longer in the ambiguous/blocked bucket at all.
    const altIsBetter =
      !UA_SENSITIVE_RESULTS.has(altOutcome.result) ||
      (altOutcome.statusCode !== null && outcome.statusCode === null);
    if (altIsBetter) {
      return {
        ...altOutcome,
        result: altOutcome.result === "OK" ? "OK (browser UA)" : altOutcome.result,
      };
    }
  }

  return outcome;
}

/**
 * Checks one URL and returns an HTTP status (when one came back at all)
 * plus a short, human-readable result — not a raw error code/message, so
 * someone without a technical background can tell what actually happened.
 * Exported so other features (e.g. the products page's "check all links")
 * reuse the exact same OK/timeout/blocked/challenge classification instead
 * of re-implementing it.
 */
export async function checkUrl(raw: string): Promise<CheckOutcome> {
  const url = normalizeUrl(raw);
  if (!url) return { statusCode: null, result: "Invalid URL" };

  const outcome = await attemptUrl(url);

  // The bare domain didn't resolve at all — some sites are only ever
  // configured under their "www." subdomain, so it's worth one more try
  // there before calling the link dead.
  if (outcome.result === "Site Not Found" && !hasWwwHost(url)) {
    const wwwOutcome = await attemptUrl(withWww(url));
    if (wwwOutcome.result !== "Site Not Found") {
      return {
        ...wwwOutcome,
        result: wwwOutcome.result === "OK" ? "OK (needed www.)" : wwwOutcome.result,
      };
    }
  }

  return outcome;
}

/**
 * Runs `worker` over `items` with at most `concurrency` in flight at once.
 * Exported alongside checkUrl for the same reuse reason.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function runNext(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, runNext),
  );

  return results;
}

/**
 * Reads an uploaded workbook, finds `urlColumn` by a case-insensitive
 * header match, checks every URL in that column, and returns the same
 * workbook with two columns appended — every original column is preserved
 * as-is, nothing reordered or dropped. Framework-agnostic on purpose: this
 * is meant to be reused wherever URL checking is needed next (e.g. from
 * the products page), not just from the standalone Tools page.
 */
export async function validateUrls(
  buffer: Buffer,
  urlColumn: string,
): Promise<UrlValidatorResult> {
  const { headers, rows } = await readWorkbookRows(buffer);

  if (headers.length === 0) {
    throw new UrlValidatorStructureError("The file has no header row.");
  }

  const columnIndex = headers.findIndex(
    (header) => header.trim().toLowerCase() === urlColumn.trim().toLowerCase(),
  );
  if (columnIndex === -1) {
    throw new UrlValidatorStructureError(
      `No column named "${urlColumn}" was found. Available columns: ${headers.join(", ")}.`,
    );
  }

  if (rows.length === 0) {
    throw new UrlValidatorStructureError("The file has no data rows to check.");
  }

  const results = await mapWithConcurrency(rows, CONCURRENCY, (row) => {
    const url = (row[columnIndex] ?? "").trim();
    return url
      ? checkUrl(url)
      : Promise.resolve<CheckOutcome>({ statusCode: null, result: "No URL" });
  });

  const okCount = results.filter((result) => result.result.startsWith("OK")).length;

  const fileBuffer = await buildWorkbookBuffer(
    "URL Check Results",
    [...headers, "HTTP Status Code", "Result"],
    rows.map((row, index) => [
      ...row,
      results[index].statusCode !== null ? String(results[index].statusCode) : "",
      results[index].result,
    ]),
  );

  return {
    fileBuffer,
    totalRows: rows.length,
    okCount,
    failedCount: results.length - okCount,
  };
}
