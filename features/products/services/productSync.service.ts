import { prisma } from "@/lib/prisma";
import {
  ChangeType,
  Prisma,
  ProductSource,
  ProductStatus,
} from "@/app/generated/prisma";
import { saveProducts } from "./saveProducts";
import type { ScrapedProduct } from "../types/product";

export interface SyncProductsOptions {
  /**
   * When true, the expiry step below is skipped entirely for this run.
   * "Not found in scrapedProducts" is only meaningful evidence that a
   * product is actually gone if the scrape itself succeeded — a run that
   * scraped nothing, or hit page failures/timeouts, can't be trusted to
   * prove absence. Set by the caller (scanWorker.ts) based on this run's
   * page-fetch results.
   */
  skipExpiry?: boolean;
  /** Human-readable reason, logged and returned in the summary when skipExpiry is true. */
  skipExpiryReason?: string;
}

export async function syncProducts(
  bmId: number,
  scrapedProducts: ScrapedProduct[],
  scanRunId?: number,
  options?: SyncProductsOptions,
) {

    const links = await prisma.boardManufacturerSemiSupplier.findMany({
  where: {
    boardManufacturerId: bmId,
    status: true,
  },
  include: {
    semiSupplier: true,
  },
});

const bmssMap = new Map(
  links.map(link => [
    link.semiSupplier.name.toLowerCase(),
    link.id,
  ])
);

const bmssIds = links.map(l => l.id);

const dbProducts = await prisma.product.findMany({
  where: {
    boardManufacturerSemiSupplierId: {
      in: bmssIds,
    },
  },
});

const dbMap = new Map(
  dbProducts.map(product => [
    `${product.boardManufacturerSemiSupplierId}-${product.name.toLowerCase()}`,
    product,
  ])
);

// Fallback index for when a scraped product's name doesn't match anything
// above: same URL, same link, different name means a rename, not a new
// product replacing an expired one.
const dbByUrlMap = new Map(
  dbProducts.map(product => [
    `${product.boardManufacturerSemiSupplierId}-${product.productUrl}`,
    product,
  ])
);

const newProducts = [];
const updatedProducts = [];
const expiredProducts = [];
let unchangedCount = 0;

const visited = new Set<string>();

for (const product of scrapedProducts) {
  const bmssId = bmssMap.get(product.semiSupplier.toLowerCase());

  if (!bmssId) continue;

  const key = `${bmssId}-${product.name.toLowerCase()}`;
  visited.add(key);

  let existing = dbMap.get(key);

  // Name didn't match anything — before assuming this is a brand-new
  // product, check whether it's actually an existing one that just got
  // renamed (same URL, same link). Skip candidates already claimed by
  // an earlier scraped product this run.
  let renamedFromKey: string | null = null;
  if (!existing) {
    const urlKey = `${bmssId}-${product.productUrl}`;
    const urlMatch = dbByUrlMap.get(urlKey);
    if (urlMatch) {
      const oldKey = `${bmssId}-${urlMatch.name.toLowerCase()}`;
      if (!visited.has(oldKey)) {
        existing = urlMatch;
        renamedFromKey = oldKey;
        visited.add(oldKey);
      }
    }
  }

  // New Product
  if (!existing) {
    newProducts.push({
      boardManufacturerSemiSupplierId: bmssId,
      name: product.name,
      productUrl: product.productUrl,
      description: product.description,
      status: ProductStatus.PENDING,
      changeType: ChangeType.NEW,
      source: ProductSource.SCRAPED,
      remark: Prisma.JsonNull
    });

    continue;
  }

  // Resolved via the URL fallback above => name differs by construction
  // (that's the only way we get here without a name-key match).
  const nameChanged = renamedFromKey !== null;

  const urlChanged =
    existing.productUrl !== product.productUrl;

  const descriptionChanged =
    existing.description !== product.description;

  const wasExpired =
    existing.changeType === ChangeType.EXPIRED;

  // Updated Product — only record the field(s) that actually changed, plus
  // a snapshot of what to revert to if this change gets rejected. A
  // BLOCKED product reappearing with identical data is NOT treated as a
  // change — it's still live on the site, same as it's been every scan
  // since it was blocked, so there's nothing new to review. Re-flagging it
  // every run just re-asks the same question forever. Only an *actual*
  // content difference (or a truly EXPIRED product coming back, which is
  // real new information — it was gone, now it's not) reopens review.
  if (nameChanged || urlChanged || descriptionChanged || wasExpired) {
    const remark: {
      name?: { old: string; new: string };
      url?: { old: string; new: string };
      description?: { old: string | null; new: string };
      previousStatus: ProductStatus;
      previousChangeType: ChangeType;
      previousScanRunId: number | null;
    } = {
      previousStatus: existing.status,
      previousChangeType: existing.changeType,
      previousScanRunId: existing.scanRunId,
    };

    if (nameChanged) {
      remark.name = { old: existing.name, new: product.name };
    }
    if (urlChanged) {
      remark.url = { old: existing.productUrl, new: product.productUrl };
    }
    if (descriptionChanged) {
      remark.description = {
        old: existing.description,
        new: product.description,
      };
    }

    updatedProducts.push({
      id: existing.id,
      boardManufacturerSemiSupplierId: bmssId,
      name: product.name,
      remark,
      changeType: nameChanged
        ? ChangeType.NAME_CHANGED
        : urlChanged
          ? ChangeType.URL_CHANGED
          : wasExpired
            ? ChangeType.RESTORED
            : ChangeType.DESCRIPTION_CHANGED,
      status: ProductStatus.PENDING,
    });

    continue;
  }

  // No changes — leave the row completely untouched.
  unchangedCount++;
}

// Expired Products
//
// Skipped when this run's results can't be trusted to prove a product is
// actually gone (see SyncProductsOptions.skipExpiry) — a failed or
// incomplete scan finding "nothing" says nothing about what's really on
// the site. Marking real, still-live products EXPIRED just because a
// page timed out would dump false positives into the review queue every
// time a scan hiccups, and an EXPIRED product that gets mistakenly
// Approved is actively BLOCKED — a worse outcome than just skipping.
if (options?.skipExpiry) {
  console.warn(
    `Skipping expiry check for boardManufacturerId=${bmId}` +
      (options.skipExpiryReason ? ` (${options.skipExpiryReason})` : "") +
      " — this run's results can't be trusted to prove products are actually gone.",
  );
} else {
  for (const [key, product] of dbMap) {
    if (visited.has(key)) continue;

    // A BLOCKED product going missing isn't a decision worth asking about
    // either — it's already excluded from the active catalog whether the
    // site still lists it or not, so "approving" its absence would just
    // send it right back to BLOCKED (the state it's already in). Leave it
    // untouched, same as an unchanged BLOCKED product that's still there.
    if (product.status === ProductStatus.BLOCKED) continue;

    expiredProducts.push({
      id: product.id,
      name: product.name,
      productUrl: product.productUrl,
      description: product.description,
      changeType: ChangeType.EXPIRED,
      status: ProductStatus.PENDING,
      previousStatus: product.status,
      previousChangeType: product.changeType,
      previousScanRunId: product.scanRunId,
    });
  }
}

await saveProducts(newProducts, updatedProducts, expiredProducts, scanRunId);

return {
  summary: {
    scrapedRecords: scrapedProducts.length,
    databaseRecords: dbProducts.length,

    newRecords: newProducts.length,
    updatedRecords: updatedProducts.length,
    expiredRecords: expiredProducts.length,
    unchangedRecords: unchangedCount,

    expirySkipped: options?.skipExpiry ?? false,
    expirySkippedReason: options?.skipExpiry ? options.skipExpiryReason : undefined,
  },

  newProducts,
  updatedProducts,
  expiredProducts,
};
}