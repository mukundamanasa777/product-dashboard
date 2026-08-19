import {
  ProductStatus,
  ChangeType,
  Prisma,
} from "@/app/generated/prisma";
import { prisma } from "@/lib/prisma";

interface ProductWithChanges {
  id: number;

  changeType: ChangeType;

  status: ProductStatus;

  remark: {
    name?: {
      old: string;
      new: string;
    };
    url?: {
      old: string;
      new: string;
    };
    description?: {
      old: string | null;
      new: string;
    };
    previousStatus: ProductStatus;
    previousChangeType: ChangeType;
    previousScanRunId: number | null;
  };
}

interface ExpiredProduct {
  id: number;
  status: ProductStatus;
  changeType: ChangeType;
  previousStatus: ProductStatus;
  previousChangeType: ChangeType;
  previousScanRunId: number | null;
}

export async function saveProducts(
  newProducts: Prisma.ProductCreateManyInput[] = [],
  updatedProducts: ProductWithChanges[] = [],
  expiredProducts: ExpiredProduct[] = [],
  scanRunId?: number,
) {
  const seenKeys = new Set<string>();
  const dedupedNewProducts = newProducts.filter((p) => {
    const key = `${p.boardManufacturerSemiSupplierId}-${p.name.toLowerCase()}`;

    if (seenKeys.has(key)) {
      return false;
    }

    seenKeys.add(key);
    return true;
  });

  if (dedupedNewProducts.length !== newProducts.length) {
    console.warn(
      `Duplicate products found in newProducts: skipped ${
        newProducts.length - dedupedNewProducts.length
      } duplicate(s) to avoid a unique constraint failure`
    );
  }

  try {
    await prisma.$transaction(async (tx) => {

      // --------------------------------------------------
      // Create New Products
      // --------------------------------------------------
      if (dedupedNewProducts.length > 0) {
        await tx.product.createMany({
          data: dedupedNewProducts.map((product) => ({
            ...product,
            remark: product.remark ?? Prisma.JsonNull,
            scanRunId,
          })),
        });

        console.log(`Created ${dedupedNewProducts.length} new products`);
      }

      // --------------------------------------------------
      // Update Existing Products
      // --------------------------------------------------
      for (const product of updatedProducts) {

        await tx.product.update({
          where: {
            id: product.id,
          },
          data: {
            ...(product.remark.name ? { name: product.remark.name.new } : {}),
            ...(product.remark.url ? { productUrl: product.remark.url.new } : {}),
            ...(product.remark.description
              ? { description: product.remark.description.new }
              : {}),
            status: ProductStatus.PENDING,
            changeType: product.changeType,
            remark: product.remark,
            scanRunId,
          },
        });
      }

      if (updatedProducts.length > 0) {
        console.log(`Updated ${updatedProducts.length} products`);
      }

      // --------------------------------------------------
      // Mark Expired Products
      // --------------------------------------------------
      for (const product of expiredProducts) {
        await tx.product.update({
          where: {
            id: product.id,
          },
          data: {
            status: ProductStatus.PENDING,
            changeType: ChangeType.EXPIRED,
            remark: {
              previousStatus: product.previousStatus,
              previousChangeType: product.previousChangeType,
              previousScanRunId: product.previousScanRunId,
            },
            scanRunId,
          },
        });
      }

      if (expiredProducts.length > 0) {
        console.log(`Marked ${expiredProducts.length} products as expired`);
      }

      // Unchanged products are intentionally left untouched — no scanRunId
      // stamp, no write at all.
    });

    console.log("Database Sync Completed");
  } catch (error) {
    console.error("Error while saving products:");
    console.dir(error, { depth: null });
    throw error;
  }
}
