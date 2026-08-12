import { NextRequest, NextResponse } from "next/server";
import { ChangeType, ProductStatus } from "@/app/generated/prisma";
import { buildProductsExport } from "@/features/import-export/services/productExport.service";

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

  const buffer = await buildProductsExport({
    search,
    semiSupplierIds,
    boardManufacturerIds,
    statuses,
    changeTypes,
    scanRunId,
  });

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="products-export-${Date.now()}.xlsx"`,
    },
  });
}
