/**
 * Optional outbound proxy for scraping requests — set SCRAPE_PROXY_URL to
 * route both the axios (request.ts) and Playwright (browserRequest.ts)
 * fetch paths through it. Needed when a manufacturer's site (or its WAF)
 * blocks traffic from datacenter/hosting-provider IP ranges wholesale —
 * confirmed on Railway even after enabling Static Outbound IPs, since
 * those are still datacenter IPs, just stable ones. A residential proxy
 * provider is the fix for that class of block; a datacenter proxy is not
 * — it would likely hit the exact same wall.
 *
 * Format: http://username:password@proxy-host:port (the standard format
 * most residential proxy providers — Bright Data, Smartproxy, Oxylabs,
 * IPRoyal, etc. — issue credentials in).
 *
 * Unset by default: every call below returns undefined/false, so nothing
 * changes for manufacturers that don't need this.
 */

interface ParsedProxy {
  protocol: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
}

function parseProxyUrl(): ParsedProxy | null {
  const raw = process.env.SCRAPE_PROXY_URL;
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    console.warn(
      `SCRAPE_PROXY_URL is set but isn't a valid URL — ignoring it. Expected format: http://username:password@proxy-host:port`,
    );
    return null;
  }

  return {
    protocol: url.protocol.replace(":", "") || "http",
    host: url.hostname,
    port: Number(url.port) || (url.protocol === "https:" ? 443 : 80),
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
  };
}

/** axios's `proxy` request-config shape, or `false` (axios's "no proxy" value) if unset. */
export function getAxiosProxyConfig() {
  const parsed = parseProxyUrl();
  if (!parsed) return false;

  return {
    protocol: parsed.protocol,
    host: parsed.host,
    port: parsed.port,
    ...(parsed.username
      ? { auth: { username: parsed.username, password: parsed.password ?? "" } }
      : {}),
  };
}

/** Playwright's `launch({ proxy })` shape, or `undefined` if unset. */
export function getPlaywrightProxyConfig() {
  const parsed = parseProxyUrl();
  if (!parsed) return undefined;

  return {
    server: `${parsed.protocol}://${parsed.host}:${parsed.port}`,
    ...(parsed.username
      ? { username: parsed.username, password: parsed.password ?? "" }
      : {}),
  };
}
