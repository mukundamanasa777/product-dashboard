import axios from "axios";
import { getAxiosProxyConfig } from "./proxyConfig";

// A bare "Mozilla/5.0" (the old value here) is not what any real browser
// actually sends — it's a well-known bot fingerprint on its own, before
// anti-bot systems even look at the IP. A full, current desktop Chrome
// string plus the Accept/Accept-Language headers a real browser sends
// alongside it (Playwright's real Chromium already sends equivalents of
// these by default in browserRequest.ts — this just brings the plain
// axios path in line with it) makes this fetch look like an actual
// browser request instead of a bare HTTP client. This does NOT fix
// blocking caused by the source IP's own reputation (e.g. a shared/
// blacklisted hosting-provider IP) — that's a network-level block that
// happens before any of these headers are even read.
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

export async function request(url: string) {
  const response = await axios.get(url, {
    headers: BROWSER_HEADERS,
    // Matches the Playwright goto timeout in browserRequest.ts. Without
    // this, a hung server just hangs the worker indefinitely instead of
    // ever surfacing as a countable "timeout" page result.
    timeout: 30_000,
    // No-op unless SCRAPE_PROXY_URL is set — see proxyConfig.ts.
    proxy: getAxiosProxyConfig(),
  });

  return response.data;
}