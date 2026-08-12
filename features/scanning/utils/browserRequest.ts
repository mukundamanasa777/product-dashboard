import { chromium, type Browser } from "playwright";

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
 */
export async function createBrowserFetcher(waitForSelectors: string[]) {
  const browser: Browser = await chromium.launch();
  const waitSelector = waitForSelectors.filter(Boolean).join(", ");

  async function fetchHtml(url: string): Promise<string> {
    const page = await browser.newPage();
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

      if (waitSelector) {
        // Swallow the timeout rather than throw: if the selector never
        // shows up, we still return whatever rendered so far — same
        // "0 products found" outcome as the axios path gets for a page
        // that genuinely has none, rather than failing the whole scan.
        await page.waitForSelector(waitSelector, { timeout: 15_000 }).catch(() => {});
      }

      return await page.content();
    } finally {
      await page.close();
    }
  }

  async function close() {
    await browser.close();
  }

  return { fetchHtml, close };
}
