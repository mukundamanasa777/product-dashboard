import { NextRequest, NextResponse } from "next/server";
import { ScanStatus, TriggerSource } from "@/app/generated/prisma";
import { findManyPaginated } from "@/features/scanning/repositories/scanRun.repository";
import { countByScanRunIds } from "@/features/products/repositories/product.repository";
import { parseSort } from "@/features/shared/utils/sort";

const VALID_TRIGGER_SOURCES = new Set(Object.values(TriggerSource));
const VALID_STATUSES = new Set(Object.values(ScanStatus));

function parseIds(value: string | null): number[] {
  if (!value) return [];

  return value
    .split(",")
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id));
}

function parseTriggerSources(value: string | null): TriggerSource[] {
  if (!value) return [];

  return value
    .split(",")
    .filter((source): source is TriggerSource =>
      VALID_TRIGGER_SOURCES.has(source as TriggerSource),
    );
}

function parseStatuses(value: string | null): ScanStatus[] {
  if (!value) return [];

  return value
    .split(",")
    .filter((status): status is ScanStatus =>
      VALID_STATUSES.has(status as ScanStatus),
    );
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const triggerSources = parseTriggerSources(searchParams.get("triggerSources"));
  const boardManufacturerIds = parseIds(
    searchParams.get("boardManufacturerIds"),
  );
  const statuses = parseStatuses(searchParams.get("statuses"));
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "10");
  const sort = parseSort(searchParams.get("sort"), "startedAt", "desc");

  const { items, total } = await findManyPaginated({
    triggerSources,
    boardManufacturerIds,
    statuses,
    page,
    pageSize,
    sort,
  });

  // Live count, not a snapshot: ScanRun.newProducts/updatedProducts/
  // removedProducts are stamped once when that run finishes and never
  // revisited, so they drift from reality the moment a *later* run
  // touches the same product rows (moving their scanRunId forward).
  // Counting the Product table directly — one grouped query for every
  // run on this page — is what actually answers "does clicking View
  // Products right now show anything for this run."
  const reflectedCounts = await countByScanRunIds(items.map((run) => run.id));

  const scanRuns = items.map((run) => {
    const pageResults = Array.isArray(run.pageResults)
      ? (run.pageResults as unknown as {
          url: string;
          status: "success" | "timeout" | "failed";
          error?: string;
        }[])
      : [];

    return {
      id: run.id,
      boardManufacturerName: run.boardManufacturer.name,
      status: run.status,
      triggerSource: run.triggerSource,
      startedAt: run.startedAt,
      processingStartedAt: run.processingStartedAt,
      completedAt: run.completedAt,
      errorMessage: run.errorMessage,
      // Everything the scrape found this run (new + updated + unchanged) —
      // NOT what /dashboard/products?scan_id=<id> will show. See
      // reflectedProducts below for that.
      totalProducts: run.totalProducts,
      newProducts: run.newProducts,
      updatedProducts: run.updatedProducts,
      removedProducts: run.removedProducts,
      reflectedProducts: reflectedCounts.get(run.id) ?? 0,
      pagesSucceeded: run.pagesSucceeded,
      pagesTimedOut: run.pagesTimedOut,
      pagesFailed: run.pagesFailed,
      // Split out from pageResults so the UI doesn't have to — each entry
      // is the exact url plus the error Playwright/axios threw for it.
      failedUrls: pageResults
        .filter((p) => p.status === "failed")
        .map((p) => ({ url: p.url, error: p.error ?? null })),
      timedOutUrls: pageResults
        .filter((p) => p.status === "timeout")
        .map((p) => ({ url: p.url, error: p.error ?? null })),
    };
  });

  return NextResponse.json({ items: scanRuns, total, page, pageSize });
}
