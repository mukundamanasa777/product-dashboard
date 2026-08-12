import { prisma } from "@/lib/prisma";
import {
  ChangeType,
  Prisma,
  ProductSource,
  ProductStatus,
} from "@/app/generated/prisma";
import { buildWorkbookBuffer, readWorkbookRows } from "../utils/xlsx";
import { bulkCreate } from "@/features/products/repositories/product.repository";

export const IMPORT_HEADERS = [
  "Name",
  "Description",
  "Product URL",
  "Board Manufacturer",
  "Semi Supplier",
] as const;

/**
 * Thrown for file-level problems (wrong column count/names, no data rows)
 * — things that mean we can't confidently map the file at all, as opposed
 * to a normal per-row validation error. Callers turn this into a plain
 * 400 rather than an error workbook.
 */
export class ImportStructureError extends Error {}

export type ImportResult =
  | { ok: true; created: number }
  | {
      ok: false;
      errorFileBuffer: Buffer;
      errorCount: number;
      totalRows: number;
    };

function validateHeaders(headers: string[]) {
  const found = headers.map((h) => h.trim().toLowerCase()).filter(Boolean);
  const expected = IMPORT_HEADERS.map((h) => h.toLowerCase());

  const matches =
    found.length === expected.length &&
    found.every((h, i) => h === expected[i]);

  if (!matches) {
    throw new ImportStructureError(
      `Expected exactly ${expected.length} columns in this order: ${IMPORT_HEADERS.join(", ")}. ` +
        `Found ${found.length} column(s): ${headers.filter((h) => h.trim()).join(", ") || "(none)"}.`,
    );
  }
}

/**
 * Validates and imports a product Excel file. Nothing is written to the
 * database unless every row passes validation — if any row is invalid,
 * the whole import aborts and an error workbook (failing rows + an Error
 * column) is returned instead. Valid rows are written in a single
 * transaction (product.repository.ts's bulkCreate), never one at a time.
 */
export async function importProducts(buffer: Buffer): Promise<ImportResult> {
  const { headers, rows } = await readWorkbookRows(buffer);
  validateHeaders(headers);

  if (rows.length === 0) {
    throw new ImportStructureError("The file has no data rows to import.");
  }

  const [manufacturers, suppliers, links, existingProducts] =
    await Promise.all([
      prisma.boardManufacturer.findMany({
        where: { status: true },
        select: { id: true, name: true },
      }),
      prisma.semiSupplier.findMany({
        where: { status: true },
        select: { id: true, name: true },
      }),
      prisma.boardManufacturerSemiSupplier.findMany({
        where: { status: true },
        select: { id: true, boardManufacturerId: true, semiSupplierId: true },
      }),
      prisma.product.findMany({
        select: { name: true, boardManufacturerSemiSupplierId: true },
      }),
    ]);

  const manufacturerByName = new Map(
    manufacturers.map((m) => [m.name.toLowerCase(), m.id]),
  );
  const supplierByName = new Map(
    suppliers.map((s) => [s.name.toLowerCase(), s.id]),
  );
  const linkByPair = new Map(
    links.map((l) => [`${l.boardManufacturerId}-${l.semiSupplierId}`, l.id]),
  );
  const existingKeys = new Set(
    existingProducts.map(
      (p) => `${p.boardManufacturerSemiSupplierId}-${p.name.toLowerCase()}`,
    ),
  );

  const seenInFile = new Set<string>();
  const validRows: Prisma.ProductCreateManyInput[] = [];
  const errorRows: { original: string[]; errors: string[] }[] = [];

  for (const row of rows) {
    const [rawName, rawDescription, rawUrl, rawManufacturer, rawSupplier] =
      row;
    const errors: string[] = [];

    const name = (rawName ?? "").trim();
    const description = (rawDescription ?? "").trim();
    const productUrl = (rawUrl ?? "").trim();
    const manufacturerName = (rawManufacturer ?? "").trim();
    const supplierName = (rawSupplier ?? "").trim();

    if (!name) errors.push("Name is required");

    if (!productUrl) {
      errors.push("Product URL is required");
    } else {
      try {
        new URL(productUrl);
      } catch {
        errors.push("Product URL is not a valid URL");
      }
    }

    let manufacturerId: number | undefined;
    if (!manufacturerName) {
      errors.push("Board Manufacturer is required");
    } else {
      manufacturerId = manufacturerByName.get(manufacturerName.toLowerCase());
      if (manufacturerId === undefined) {
        errors.push(`Unknown Board Manufacturer "${manufacturerName}"`);
      }
    }

    let supplierId: number | undefined;
    if (!supplierName) {
      errors.push("Semi Supplier is required");
    } else {
      supplierId = supplierByName.get(supplierName.toLowerCase());
      if (supplierId === undefined) {
        errors.push(`Unknown Semi Supplier "${supplierName}"`);
      }
    }

    let bmssId: number | undefined;
    if (manufacturerId !== undefined && supplierId !== undefined) {
      bmssId = linkByPair.get(`${manufacturerId}-${supplierId}`);
      if (bmssId === undefined) {
        errors.push(
          `"${manufacturerName}" has no active link to "${supplierName}"`,
        );
      }
    }

    if (bmssId !== undefined && name) {
      const key = `${bmssId}-${name.toLowerCase()}`;
      if (existingKeys.has(key)) {
        errors.push(
          "A product with this Name already exists for this Board Manufacturer/Semi Supplier",
        );
      } else if (seenInFile.has(key)) {
        errors.push("Duplicate row within this file");
      } else {
        seenInFile.add(key);
      }
    }

    if (errors.length > 0) {
      errorRows.push({ original: row, errors });
      continue;
    }

    validRows.push({
      boardManufacturerSemiSupplierId: bmssId!,
      name,
      productUrl,
      description: description || null,
      status: ProductStatus.APPROVED,
      changeType: ChangeType.NONE,
      source: ProductSource.UPLOADED,
      remark: Prisma.JsonNull,
    });
  }

  if (errorRows.length > 0) {
    const errorFileBuffer = await buildWorkbookBuffer(
      "Errors",
      [...IMPORT_HEADERS, "Error"],
      errorRows.map((r) => [...r.original, r.errors.join("; ")]),
    );
    return {
      ok: false,
      errorFileBuffer,
      errorCount: errorRows.length,
      totalRows: rows.length,
    };
  }

  await bulkCreate(validRows);
  return { ok: true, created: validRows.length };
}
