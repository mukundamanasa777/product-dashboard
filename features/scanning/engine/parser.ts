import { CheerioAPI } from "cheerio";
import { ParsedProduct, StructureConfig } from "../types/scraper";
import { findSemiSupplier } from "./matcher";

export function parseProducts(
  $: CheerioAPI,
  structure: StructureConfig,
  semiSuppliers: string[],
  pageUrl: string,
) {
  const products: ParsedProduct[] = [];

  $(structure.productSelector).each((_, element) => {
    const titleElement = $(element).find(structure.titleSelector).clone();
console.log("Title Element:", titleElement.html());
    if (structure.removeChildren) {
      titleElement.children().remove();
    }

    const name = titleElement.text().trim();

    const descriptionElement = $(element).find(structure.descriptionSelector).clone();

    if (structure.ignoreSelectors) {
      for (const selector of structure.ignoreSelectors) {
        descriptionElement.find(selector).remove();
      }
    }

    const description = descriptionElement
      .text()
      .replace(/\s+/g, " ")
      .trim();

    const semiSupplier = findSemiSupplier(description, semiSuppliers) ?? undefined;

    let productUrl = "";

    if (structure.urlType === "href") {
      const href = $(element).find(structure.urlSelector).attr("href");

      if (!href) return;

      productUrl = new URL(href, pageUrl).href;
    } else {
      const onclick = $(element)
        .find(structure.urlSelector)
        .attr("onclick");

      const match = onclick?.match(/location\.href='([^']+)'/);

      if (!match) return;

      productUrl = new URL(match[1], pageUrl).href;
    }

    products.push({
      name,
      description,
      productUrl,
      semiSupplier,
    });
  });

  return products;
}