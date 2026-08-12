import { NextRequest, NextResponse } from "next/server";
import { findManyPaginated } from "@/features/products/repositories/boardManufacturer.repository";
import { parseSort } from "@/features/shared/utils/sort";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const search = searchParams.get("search") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "10");
  const sort = parseSort(searchParams.get("sort"), "name", "asc");

  const { items, total } = await findManyPaginated({
    search,
    page,
    pageSize,
    sort,
  });

  return NextResponse.json({ items, total, page, pageSize });
}
