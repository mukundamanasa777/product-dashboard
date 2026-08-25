import { NextRequest, NextResponse } from "next/server";
import { TriggerSource } from "@/app/generated/prisma";
import { findManyPaginated } from "@/features/products/repositories/linkCheckRun.repository";
import { parseSort } from "@/features/shared/utils/sort";

const VALID_TRIGGER_SOURCES = new Set(Object.values(TriggerSource));

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const rawTriggerSource = searchParams.get("triggerSource");
  const triggerSource = VALID_TRIGGER_SOURCES.has(
    rawTriggerSource as TriggerSource,
  )
    ? (rawTriggerSource as TriggerSource)
    : undefined;
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "10");
  const sort = parseSort(searchParams.get("sort"), "startedAt", "desc");

  const { items, total } = await findManyPaginated({
    triggerSource,
    page,
    pageSize,
    sort,
  });

  return NextResponse.json({ items, total, page, pageSize });
}
