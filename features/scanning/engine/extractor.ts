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
    if ($(structure?.productSelector).length === 0) {
      continue;
    }

    const products = parseProducts(
      $,
      structure,
      semiSuppliers,
      pageUrl,
    );

    if (products.length > 0) {
      return products;
    }
  }

  return [];
}