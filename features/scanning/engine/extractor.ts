import { CheerioAPI } from "cheerio";
import { StructureConfig } from "../types/scraper";
import { parseProducts } from "./parser";

export function extractProducts(
  $: CheerioAPI,
  structures: StructureConfig[],
  pageUrl: string,
  semiSuppliers: string[],
) {
  for (const structure of structures) {
    const rawMatchCount = $(structure?.productSelector).length;

    // TEMP DEBUG — see [scrape-debug] in scraper.ts. Confirms whether a
    // structure's productSelector actually found elements in the fetched
    // HTML at all, before parsing tries to turn them into products — the
    // fastest way to tell "selector matched nothing" (config/timing issue,
    // e.g. a page snapshot taken before a client-side carousel rendered)
    // apart from "selector matched elements but they didn't parse into
    // valid products" (e.g. missing href).
    console.log(
      `[scrape-debug] structure="${structure?.name}" url=${pageUrl} rawMatches=${rawMatchCount}`,
    );

    if (rawMatchCount === 0) {
      continue;
    }

    const products = parseProducts(
      $,
      structure,
      semiSuppliers,
      pageUrl,
    );

    console.log(
      `[scrape-debug] structure="${structure?.name}" url=${pageUrl} parsedProducts=${products.length}`,
    );

    if (products.length > 0) {
      return products;
    }
  }

  return [];
}