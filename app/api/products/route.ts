import { NextRequest, NextResponse } from "next/server";
import { ChangeType, ProductStatus } from "@/app/generated/prisma";
import {
  countAll,
  findFiltered,
} from "@/features/products/repositories/product.repository";
import { parseSort } from "@/features/shared/utils/sort";

const VALID_STATUSES = new Set(Object.values(ProductStatus));
const VALID_CHANGE_TYPES = new Set(Object.values(ChangeType));

function parseIds(value: string | null): number[] {
  if (!value) return [];

  return value
    .split(",")
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id));
}

function parseStatuses(value: string | null): ProductStatus[] {
  if (!value) return [];

  return value
    .split(",")
    .filter((status): status is ProductStatus =>
      VALID_STATUSES.has(status as ProductStatus),
    );
}

function parseChangeTypes(value: string | null): ChangeType[] {
  if (!value) return [];

  return value
    .split(",")
    .filter((changeType): changeType is ChangeType =>
      VALID_CHANGE_TYPES.has(changeType as ChangeType),
    );
}

// Not surfaced by any filter control — only reachable by loading the page
// with a `?scan_id=` query param already in the URL. Anything not a
// positive integer is treated as absent rather than an error.
function parseScanRunId(value: string | null): number | undefined {
  if (!value) return undefined;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const search = searchParams.get("search")?.trim() || undefined;
  const semiSupplierIds = parseIds(searchParams.get("semiSupplierIds"));
  const boardManufacturerIds = parseIds(
    searchParams.get("boardManufacturerIds"),
  );
  const statuses = parseStatuses(searchParams.get("statuses"));
  const changeTypes = parseChangeTypes(searchParams.get("changeTypes"));
  const scanRunId = parseScanRunId(searchParams.get("scanRunId"));
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "10");
  const sort = parseSort(searchParams.get("sort"), "createdAt", "desc");

  const [{ items, total }, allCount] = await Promise.all([
    findFiltered(
      {
        search,
        semiSupplierIds,
        boardManufacturerIds,
        statuses,
        changeTypes,
        scanRunId,
      },
      page,
      pageSize,
      sort,
    ),
    countAll(),
  ]);

  const products = items.map((product) => ({
    id: product.id,
    name: product.name,
    productUrl: product.productUrl,
    description: product.description,
    status: product.status,
    changeType: product.changeType,
    source: product.source,
    createdAt: product.createdAt,
    semiSupplierName: product.boardManufacturerSemiSupplier.semiSupplier.name,
    boardManufacturerName:
      product.boardManufacturerSemiSupplier.boardManufacturer.name,
    remark: product.remark,
  }));

  return NextResponse.json({
    items: products,
    total,
    allCount,
    page,
    pageSize,
  });
}
