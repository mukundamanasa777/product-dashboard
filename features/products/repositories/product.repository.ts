import { prisma } from "@/lib/prisma";
import { ChangeType, Prisma, ProductStatus } from "@/app/generated/prisma";
import type { ParsedSort } from "@/features/shared/utils/sort";

interface ProductRemark {
  name?: { old: string; new: string };
  url?: { old: string; new: string };
  description?: { old: string | null; new: string };
  previousStatus?: ProductStatus;
  previousChangeType?: ChangeType;
  previousScanRunId?: number | null;
}

/**
 * Live counts of products currently pointing at each of the given scan
 * runs — i.e. exactly what /dashboard/products?scan_id=<id> would show
 * right now. Deliberately NOT derived from ScanRun.newProducts/
 * updatedProducts/removedProducts: those are a snapshot from when that
 * run finished, and go stale the moment a *later* run touches the same
 * product rows and moves their scanRunId forward — this counts the
 * Product table directly, so it's always accurate no matter how much
 * time (or how many later runs) have passed since.
 */
export async function countByScanRunIds(
  scanRunIds: number[],
): Promise<Map<number, number>> {
  if (scanRunIds.length === 0) return new Map();

  const grouped = await prisma.product.groupBy({
    by: ["scanRunId"],
    where: { scanRunId: { in: scanRunIds } },
    _count: { _all: true },
  });

  return new Map(
    grouped
      .filter((g) => g.scanRunId !== null)
      .map((g) => [g.scanRunId as number, g._count._all]),
  );
}

export interface ProductFilters {
  search?: string;
  semiSupplierIds?: number[];
  boardManufacturerIds?: number[];
  statuses?: ProductStatus[];
  changeTypes?: ChangeType[];
  /**
   * Not exposed through any filter control — only reachable by loading the
   * page with a `?scan_id=` query param already in the URL (see
   * ProductsPageClient). Scopes the list to products from one scan run.
   */
  scanRunId?: number;
}

function buildWhere(filters: ProductFilters): Prisma.ProductWhereInput {
  const boardManufacturerSemiSupplier: Prisma.BoardManufacturerSemiSupplierWhereInput =
    {};

  if (filters.semiSupplierIds?.length) {
    boardManufacturerSemiSupplier.semiSupplierId = {
      in: filters.semiSupplierIds,
    };
  }

  if (filters.boardManufacturerIds?.length) {
    boardManufacturerSemiSupplier.boardManufacturerId = {
      in: filters.boardManufacturerIds,
    };
  }

  const where: Prisma.ProductWhereInput = {};

  if (filters.search) {
    where.name = { contains: filters.search, mode: "insensitive" };
  }

  if (Object.keys(boardManufacturerSemiSupplier).length) {
    where.boardManufacturerSemiSupplier = boardManufacturerSemiSupplier;
  }

  if (filters.statuses?.length) {
    where.status = { in: filters.statuses };
  }

  if (filters.changeTypes?.length) {
    where.changeType = { in: filters.changeTypes };
  }

  if (filters.scanRunId) {
    where.scanRunId = filters.scanRunId;
  }

  return where;
}

// Postgres sorts a native enum by its declared order, not alphabetically —
// ProductStatus is declared PENDING/APPROVED/BLOCKED in schema.prisma, so a
// plain ascending sort already groups rows in exactly that order. `sort`
// only ever overrides the createdAt tiebreaker, never the status grouping.
function buildOrderBy(
  sort?: ParsedSort<"createdAt">,
): Prisma.ProductOrderByWithRelationInput[] {
  return [{ status: "asc" }, { createdAt: sort?.direction ?? "desc" }];
}

export async function findFiltered(
  filters: ProductFilters,
  page: number,
  pageSize: number,
  sort?: ParsedSort<"createdAt">,
) {
  const where = buildWhere(filters);

  const [items, filteredCount] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        boardManufacturerSemiSupplier: {
          include: {
            semiSupplier: true,
            boardManufacturer: true,
          },
        },
      },
      orderBy: buildOrderBy(sort),
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return { items, total: filteredCount };
}

export async function countAll() {
  return prisma.product.count();
}

/**
 * Change-type filter options — the distinct values actually present on
 * products right now, not the full static enum, so the dropdown never
 * offers a choice that would return zero results. Ordered ascending, which
 * (like buildOrderBy above) sorts by the enum's declared order in Postgres
 * rather than alphabetically.
 */
export async function findDistinctChangeTypes(): Promise<ChangeType[]> {
  const rows = await prisma.product.findMany({
    distinct: ["changeType"],
    select: { changeType: true },
    orderBy: { changeType: "asc" },
  });

  return rows.map((row) => row.changeType);
}

/**
 * Same filtering as findFiltered, but unpaginated — used by the Excel
 * export, which hands back everything matching the current view rather
 * than one page of it.
 */
export async function findAllFiltered(
  filters: ProductFilters,
  sort?: ParsedSort<"createdAt">,
) {
  const where = buildWhere(filters);

  return prisma.product.findMany({
    where,
    include: {
      boardManufacturerSemiSupplier: {
        include: {
          semiSupplier: true,
          boardManufacturer: true,
        },
      },
    },
    orderBy: buildOrderBy(sort),
  });
}

/**
 * Inserts every row in one statement inside one transaction — used by the
 * Excel import, which validates the whole file up front and only ever
 * writes once all rows are known-good (never row by row).
 */
export async function bulkCreate(data: Prisma.ProductCreateManyInput[]) {
  const [result] = await prisma.$transaction([
    prisma.product.createMany({ data }),
  ]);
  return result;
}

/**
 * Resolves a pending change as accepted. changeType is deliberately left
 * untouched — approving what changed doesn't erase the record of what
 * that change was, it just resolves it — with one exception: approving an
 * EXPIRED or NOT_FOUND product means confirming it's really gone (missing
 * from a scan, or a direct link check came back dead), so it gets BLOCKED
 * (excluded from the active catalog) instead of APPROVED.
 */
export async function approve(id: number) {
  const existing = await prisma.product.findUniqueOrThrow({ where: { id } });
  const isConfirmedGone =
    existing.changeType === ChangeType.EXPIRED ||
    existing.changeType === ChangeType.NOT_FOUND;

  return prisma.product.update({
    where: { id },
    data: {
      status: isConfirmedGone ? ProductStatus.BLOCKED : ProductStatus.APPROVED,
      remark: Prisma.JsonNull,
    },
  });
}

export interface LinkCheckCandidate {
  id: number;
  productUrl: string;
  status: ProductStatus;
  changeType: ChangeType;
  scanRunId: number | null;
}

/**
 * Products worth actively checking for a dead link. BLOCKED products are
 * already excluded from the active catalog — a broken link isn't new
 * information there — and one already sitting in the queue as NOT_FOUND
 * doesn't need re-flagging again until that's resolved one way or another.
 */
export async function findLinkCheckCandidates(): Promise<LinkCheckCandidate[]> {
  return prisma.product.findMany({
    where: {
      NOT: {
        OR: [
          { status: ProductStatus.BLOCKED },
          { status: ProductStatus.PENDING, changeType: ChangeType.NOT_FOUND },
        ],
      },
    },
    select: {
      id: true,
      productUrl: true,
      status: true,
      changeType: true,
      scanRunId: true,
    },
  });
}

/**
 * Flags products whose link just failed an active check — same shape as
 * the scan pipeline's "mark expired" step (PENDING + a remark
 * snapshotting whatever it was right before), so a broken link shows up
 * in the same review queue as any other flagged change, and Reject can
 * restore it if the check turns out to have been a false positive.
 */
export async function markLinksNotFound(
  candidates: LinkCheckCandidate[],
): Promise<void> {
  if (candidates.length === 0) return;

  await prisma.$transaction(
    candidates.map((product) =>
      prisma.product.update({
        where: { id: product.id },
        data: {
          status: ProductStatus.PENDING,
          changeType: ChangeType.NOT_FOUND,
          remark: {
            previousStatus: product.status,
            previousChangeType: product.changeType,
            previousScanRunId: product.scanRunId,
          },
        },
      }),
    ),
  );
}

/**
 * Reverts a pending change: restores productUrl/description/status/
 * changeType/scanRunId to whatever they were right before this change,
 * then clears the remark. A brand-new product has no prior version to
 * revert to — rejecting one instead blocks it, so it stays out of the
 * approval queue and won't get re-flagged as NEW on the next scan.
 * For everything else, this throws rather than guesses if the remark is
 * missing previousStatus/previousChangeType (e.g. an old-shaped remark
 * written before this field existed) — silently defaulting those to some
 * assumed value would mean writing a status we don't actually know is
 * correct, so it fails loudly instead.
 */
export async function reject(id: number) {
  const existing = await prisma.product.findUniqueOrThrow({ where: { id } });

  if (existing.changeType === ChangeType.NEW) {
    return prisma.product.update({
      where: { id },
      data: { status: ProductStatus.BLOCKED },
    });
  }

  const remark = existing.remark as unknown as ProductRemark | null;
  if (
    !remark ||
    remark.previousStatus === undefined ||
    remark.previousChangeType === undefined
  ) {
    throw new Error("This product has no previous version to revert to");
  }

  return prisma.product.update({
    where: { id },
    data: {
      name: remark.name?.old ?? existing.name,
      productUrl: remark.url?.old ?? existing.productUrl,
      description: remark.description?.old ?? existing.description,
      status: remark.previousStatus,
      changeType: remark.previousChangeType,
      scanRunId: remark.previousScanRunId ?? existing.scanRunId,
      remark: Prisma.JsonNull,
    },
  });
}
