import { prisma } from "@/lib/prisma";
import {
  ChangeType,
  Prisma,
  ProductSource,
  ProductStatus,
} from "@/app/generated/prisma";
import { saveProducts } from "./saveProducts";
import type { ScrapedProduct } from "../types/product";

export async function syncProducts(
  bmId: number,
  scrapedProducts: ScrapedProduct[],
  scanRunId?: number,
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

  const existing = dbMap.get(key);

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
  if (urlChanged || descriptionChanged || wasExpired) {
    const remark: {
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
      changeType: urlChanged
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

await saveProducts(newProducts, updatedProducts, expiredProducts, scanRunId);

return {
  summary: {
    scrapedRecords: scrapedProducts.length,
    databaseRecords: dbProducts.length,

    newRecords: newProducts.length,
    updatedRecords: updatedProducts.length,
    expiredRecords: expiredProducts.length,
    unchangedRecords: unchangedCount,
  },

  newProducts,
  updatedProducts,
  expiredProducts,
};
}