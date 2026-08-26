import type { CheerioAPI } from "cheerio";
import { loadHtml } from "../utils/html";
import { extractProducts } from "./extractor";
import { ScraperConfig, StructureConfig } from "../types/scraper";
import type { ScrapedProduct } from "@/features/products/types/product";
import {
  classifyPageError,
  looksLikeBotChallenge,
  type PageResult,
} from "../utils/pageResult";

export type FetchHtml = (url: string) => Promise<string>;

export interface ScrapeResult {
  products: ScrapedProduct[];
  pageResults: PageResult[];
}

/**
 * Fetches one URL and records the outcome in pageResults. Returns null (and
 * records why) on failure instead of throwing, so one bad page doesn't take
 * the whole scan down with it.
 */
async function fetchPage(
  pageUrl: string,
  fetchHtml: FetchHtml,
  pageResults: PageResult[],
): Promise<CheerioAPI | null> {
  console.log("Scanning:", pageUrl);

  let html: string;
  try {
    html = await fetchHtml(pageUrl);
    pageResults.push({ url: pageUrl, status: "success" });
  } catch (error) {
    pageResults.push({
      url: pageUrl,
      status: classifyPageError(error),
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  const $ = loadHtml(html);

  // TEMP DEBUG — remove once the Railway-vs-local product mismatch for
  // Tria Technologies is root-caused. htmlLength + looksLikeBotChallenge
  // give an at-a-glance verdict (a genuine page is normally tens/hundreds
  // of KB; a challenge page is usually tiny); the snippet is there so you
  // can eyeball the actual markup when the verdict alone isn't enough.
  console.log(
    `[scrape-debug] url=${pageUrl} htmlLength=${html.length} looksLikeBotChallenge=${looksLikeBotChallenge(html)}`,
  );
  console.log("[scrape-debug] HTML snippet:", $.html().slice(0, 800));

  return $;
}

/**
 * Parses one already-fetched page against one structure. If a matched
 * product needs drilling into its own page (a child structure declared,
 * no semiSupplier match on this page), that's a genuinely different URL —
 * it gets its own fetch, no redundancy to remove there.
 */
async function parseStructure(
  $: CheerioAPI,
  pageUrl: string,
  structure: StructureConfig,
  semiSuppliers: string[],
  fetchHtml: FetchHtml,
  pageResults: PageResult[],
): Promise<ScrapedProduct[]> {
  const products = extractProducts(
    $,
    [structure], // extractor expects an array
    pageUrl,
    semiSuppliers,
  );

  const results: ScrapedProduct[] = [];
  for (const product of products) {
    // A matched semiSupplier means this is a finished result. No match
    // means this page only linked to the product — if this structure
    // declares a child structure, drill into the product's own URL to
    // look for the identifying info there instead of dropping it.
    if (product.semiSupplier) {
      results.push({ ...product, semiSupplier: product.semiSupplier });
      continue;
    }

    if (structure.children) {
      const child$ = await fetchPage(product.productUrl, fetchHtml, pageResults);
      if (child$) {
        const childProducts = await parseStructure(
          child$,
          product.productUrl,
          structure.children,
          semiSuppliers,
          fetchHtml,
          pageResults,
        );

        results.push(...childProducts);
      }
    }
  }

  return results;
}

export async function scrape(
  pageUrls: string[],
  scraperConfig: ScraperConfig,
  semiSuppliers: string[],
  fetchHtml: FetchHtml,
): Promise<ScrapeResult> {
  const allProducts: ScrapedProduct[] = [];
  const pageResults: PageResult[] = [];

  for (const pageUrl of pageUrls) {
    // Fetched once and reused for every configured structure. Structures
    // are alternative selector sets for the SAME page (e.g. two different
    // product-card markups on one listing), not separate pages — refetching
    // per structure doubled outbound requests to the same URL and could let
    // one structure's fetch land in a 429 window while the other's fetch,
    // moments later, cleared it. That produced inconsistent success/failure
    // for what's really one page (confirmed on Tria Technologies: structure
    // #1 intermittently 429'd while structure #2's separate fetch of the
    // same URL came back success).
    const $ = await fetchPage(pageUrl, fetchHtml, pageResults);
    if (!$) continue;

    for (const structure of scraperConfig.structures) {
      const products = await parseStructure(
        $,
        pageUrl,
        structure,
        semiSuppliers,
        fetchHtml,
        pageResults,
      );

      allProducts.push(...products);
    }
  }

  return { products: allProducts, pageResults };
}
