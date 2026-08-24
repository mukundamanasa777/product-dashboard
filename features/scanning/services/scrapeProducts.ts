import { findById } from "@/features/products/repositories/boardManufacturer.repository";
import { scrape } from "../engine/scraper";
import { getScraperConfig } from "../utils/config";
import { request } from "../utils/request";
import { createBrowserFetcher } from "../utils/browserRequest";
import { prisma } from "@/lib/prisma";

export async function scrapeProducts(boardManufacturerId: number) {
  const bm = await findById(boardManufacturerId);

    const semiSuppliers = await prisma.boardManufacturerSemiSupplier.findMany({
      where: {
        boardManufacturerId: boardManufacturerId,
        status: true,
      },
      select: {
        semiSupplier: {
          select: {
            name: true,
          },
        },
      },
    }).then(links => links.map(link => link.semiSupplier.name));

  const pageUrls = Array.isArray(bm?.pageUrls)
  ? (bm.pageUrls as string[])
  : [];

  const scraperConfig = getScraperConfig(bm?.scraperConfig);

  // Most manufacturers' listing pages are plain server-rendered HTML, so
  // `request` (axios) is the default. Only manufacturers explicitly
  // flagged as client-rendered (a Vue/React SPA whose product markup
  // never appears in the raw HTTP response) pay for a headless browser.
  if (!bm?.requiresBrowserRendering) {
    return scrape(pageUrls, scraperConfig, semiSuppliers, request);
  }

  const browserFetcher = await createBrowserFetcher(
    scraperConfig.structures.map((structure) => structure.productSelector),
    bm?.requiresThrottledFetch ?? false,
  );
  try {
    return await scrape(
      pageUrls,
      scraperConfig,
      semiSuppliers,
      browserFetcher.fetchHtml,
    );
  } finally {
    await browserFetcher.close();
  }
}
