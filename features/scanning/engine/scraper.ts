import { loadHtml } from "../utils/html";
import { extractProducts } from "./extractor";
import { ScraperConfig, StructureConfig } from "../types/scraper";
import type { ScrapedProduct } from "@/features/products/types/product";
import { classifyPageError, type PageResult } from "../utils/pageResult";

export type FetchHtml = (url: string) => Promise<string>;

export interface ScrapeResult {
  products: ScrapedProduct[];
  pageResults: PageResult[];
}

async function scrapeStructure(
  pageUrl: string,
  structure: StructureConfig,
  semiSuppliers: string[],
  fetchHtml: FetchHtml,
  pageResults: PageResult[],
): Promise<ScrapedProduct[]> {
  console.log("Scanning:", pageUrl);

  let html: string;
  try {
    html = await fetchHtml(pageUrl);
    pageResults.push({ url: pageUrl, status: "success" });
  } catch (error) {
    // A single bad page (timed out, 404, DNS failure, ...) no longer takes
    // the whole scan down with it — record why it failed and move on to
    // this manufacturer's remaining pageUrls.
    pageResults.push({
      url: pageUrl,
      status: classifyPageError(error),
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }

  const $ = loadHtml(html);

  // console.log("HTML Code:", $.html().slice(0, 500)); // Log the first 500 characters of the HTML code

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
      const childProducts = await scrapeStructure(
        product.productUrl,
        structure.children,
        semiSuppliers,
        fetchHtml,
        pageResults,
      );

      results.push(...childProducts);
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

    for (const structure of scraperConfig.structures) {

      const products = await scrapeStructure(
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
