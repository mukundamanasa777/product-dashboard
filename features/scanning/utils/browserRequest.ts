import { chromium, type Browser } from "playwright";

// Cloudflare (and similar bot-protection) rate-limits by cadence, not just
// volume — firing every category page back-to-back reads as a bot and gets
// 429'd (confirmed: Advantech run 17 failed 44/72 pages this way, all "HTTP
// 429"). Spacing requests out roughly the way a human clicking through
// category pages would, instead of as fast as the browser can respond, is
// what actually gets the real listing through instead of a block page.
const MIN_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes between requests
const JITTER_MS = 20 * 1000; // +/- up to 20s so the cadence isn't robotically exact

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function humanizedIntervalMs(): number {
  return MIN_INTERVAL_MS + (Math.random() * 2 - 1) * JITTER_MS;
}

/**
 * For sites whose product listing is rendered client-side (e.g. a Vue/React
 * SPA), a plain HTTP fetch (request.ts) never sees real product markup —
 * only the pre-render template. This launches a real headless browser so
 * the page's own JS actually runs before we read the HTML back out.
 *
 * One browser is launched per scrapeProducts() call and reused across all
 * of that manufacturer's pageUrls (each gets its own page/tab, closed
 * after use) — launching a fresh browser per URL would be far too slow
 * for manufacturers with many category pages.
 *
 * `waitForSelectors` are the manufacturer's own configured productSelector
 * values — we wait for one of them to actually appear rather than for
 * network idle. Marketing sites commonly have persistent background traffic
 * (chat widgets, analytics beacons) that never goes idle, so "networkidle"
 * reliably times out even once the real content has long since rendered.
 *
 * `throttle` mirrors the manufacturer's `requiresThrottledFetch` DB column
 * (default false — most manufacturers scan at full speed). Only turn it on
 * for a manufacturer once a real scan has shown pages failing with 429s or
 * a bot-challenge page; it triples-plus the wall-clock time of a scan with
 * many pageUrls, so it isn't worth paying for sites that aren't blocking.
 */
export async function createBrowserFetcher(
  waitForSelectors: string[],
  throttle: boolean = false,
) {
  const browser: Browser = await chromium.launch();
  const distinctWaitSelectors = [...new Set(waitForSelectors.filter(Boolean))];

  // Tracked per browser instance (i.e. per scrapeProducts() call) so pacing
  // applies across this manufacturer's whole run, not per-call from zero.
  let lastRequestAt: number | null = null;

  async function fetchHtml(url: string): Promise<string> {
    if (throttle && lastRequestAt !== null) {
      const elapsed = Date.now() - lastRequestAt;
      const wait = humanizedIntervalMs() - elapsed;
      if (wait > 0) {
        await sleep(wait);
      }
    }
    if (throttle) {
      lastRequestAt = Date.now();
    }

    const page = await browser.newPage();
    try {
      const response = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });

      if (distinctWaitSelectors.length > 0) {
        // Waited on independently, NOT joined into one "selA, selB" OR
        // selector. A joined selector resolves as soon as ANY one of them
        // appears — so a fast, server-rendered section matching structure
        // A's selector would satisfy the wait immediately and cut the
        // snapshot short before structure B's slower-to-hydrate content
        // (e.g. a client-side carousel widget) ever rendered, even though
        // it does show up given enough time. Confirmed on Tria
        // Technologies: the Elementor hero section (structure TRIA-2's
        // selector) resolved instantly while the `.v1-product` carousel
        // (structure TARA-1's selector) was still empty, so TARA-1 came up
        // with 0 matches on a page that genuinely does have real products
        // once fully rendered. Waiting on each selector in parallel gives
        // every structure its own full timeout window regardless of how
        // fast (or slow) the others resolve.
        await Promise.all(
          distinctWaitSelectors.map((selector) =>
            page.waitForSelector(selector, { timeout: 15_000 }).catch(() => {}),
          ),
        );
      }

      const html = await page.content();

      // A non-2xx response, or a bot-protection "please verify you're
      // human" challenge page (Cloudflare et al. — some challenge modes
      // return 200, not just 429/403), still resolves normally here:
      // Playwright only throws on navigation failures, never on HTTP
      // status or page content. Left unchecked, this is indistinguishable
      // from a genuinely empty listing page — which is exactly what
      // caused real, live Advantech products to get wrongly marked
      // EXPIRED run after run (confirmed: multiple runs recorded this
      // exact page as "success" in pageResults while it was silently
      // returning a Cloudflare challenge instead of the real listing).
      // Throwing here routes it through scraper.ts's existing per-page
      // catch — classified as a "failed" page, which correctly makes
      // syncProducts skip the expiry step for this run instead of trusting
      // a scrape that never actually saw this page's real content.
      const status = response?.status();
      const looksBlocked =
        (status !== undefined && (status < 200 || status >= 300)) ||
        /just a moment|checking your browser|attention required|cf-browser-verification/i.test(
          html,
        );

      if (looksBlocked) {
        throw new Error(
          `Blocked or errored fetching ${url} (HTTP ${status ?? "unknown"})`,
        );
      }

      return html;
    } finally {
      await page.close();
    }
  }

  async function close() {
    await browser.close();
  }

  return { fetchHtml, close };
}
