import { NextRequest, NextResponse } from "next/server";
import { LinkCheckStatus, TriggerSource } from "@/app/generated/prisma";
import { findManyPaginated } from "@/features/products/repositories/linkCheckRun.repository";
import { parseSort } from "@/features/shared/utils/sort";

const VALID_TRIGGER_SOURCES = new Set(Object.values(TriggerSource));
const VALID_STATUSES = new Set(Object.values(LinkCheckStatus));

function parseTriggerSources(value: string | null): TriggerSource[] {
  if (!value) return [];

  return value
    .split(",")
    .filter((source): source is TriggerSource =>
      VALID_TRIGGER_SOURCES.has(source as TriggerSource),
    );
}

function parseStatuses(value: string | null): LinkCheckStatus[] {
  if (!value) return [];

  return value
    .split(",")
    .filter((status): status is LinkCheckStatus =>
      VALID_STATUSES.has(status as LinkCheckStatus),
    );
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const triggerSources = parseTriggerSources(searchParams.get("triggerSources"));
  const statuses = parseStatuses(searchParams.get("statuses"));
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "10");
  const sort = parseSort(searchParams.get("sort"), "startedAt", "desc");

  const { items, total } = await findManyPaginated({
    triggerSources,
    statuses,
    page,
    pageSize,
    sort,
  });

  return NextResponse.json({ items, total, page, pageSize });
}
