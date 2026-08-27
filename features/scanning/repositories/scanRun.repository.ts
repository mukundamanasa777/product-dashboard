import { prisma } from "@/lib/prisma";
import { Prisma, ScanStatus, TriggerSource } from "@/app/generated/prisma";
import type { ParsedSort } from "@/features/shared/utils/sort";

export async function createPending(
  boardManufacturerId: number,
  triggerSource: TriggerSource,
) {
  return prisma.scanRun.create({
    data: {
      boardManufacturerId,
      triggerSource,
      status: ScanStatus.PENDING,
    },
  });
}

export async function findById(scanRunId: number) {
  return prisma.scanRun.findUnique({ where: { id: scanRunId } });
}

export async function attachJobId(scanRunId: number, jobId: string) {
  return prisma.scanRun.update({
    where: { id: scanRunId },
    data: { jobId },
  });
}

export async function markProcessing(scanRunId: number) {
  return prisma.scanRun.update({
    where: { id: scanRunId },
    data: {
      status: ScanStatus.PROCESSING,
      processingStartedAt: new Date(),
    },
  });
}

export interface PageStats {
  pagesSucceeded: number;
  pagesTimedOut: number;
  pagesFailed: number;
  pageResults: Prisma.InputJsonValue;
}

export interface ScanRunCounts extends PageStats {
  totalProducts: number;
  newProducts: number;
  updatedProducts: number;
  removedProducts: number;
}

export async function markSuccess(scanRunId: number, counts: ScanRunCounts) {
  return prisma.scanRun.update({
    where: { id: scanRunId },
    data: {
      status: ScanStatus.SUCCESS,
      completedAt: new Date(),
      ...counts,
    },
  });
}

export async function markFailed(
  scanRunId: number,
  errorMessage: string,
  pageStats?: PageStats,
) {
  return prisma.scanRun.update({
    where: { id: scanRunId },
    data: {
      status: ScanStatus.FAILED,
      completedAt: new Date(),
      errorMessage,
      ...pageStats,
    },
  });
}

export interface FindManyPaginatedParams {
  triggerSources?: TriggerSource[];
  boardManufacturerIds?: number[];
  statuses?: ScanStatus[];
  page: number;
  pageSize: number;
  sort?: ParsedSort<"startedAt">;
}

export async function findManyPaginated({
  triggerSources,
  boardManufacturerIds,
  statuses,
  page,
  pageSize,
  sort,
}: FindManyPaginatedParams) {
  const where: Prisma.ScanRunWhereInput = {
    ...(triggerSources?.length ? { triggerSource: { in: triggerSources } } : {}),
    ...(boardManufacturerIds?.length
      ? { boardManufacturerId: { in: boardManufacturerIds } }
      : {}),
    ...(statuses?.length ? { status: { in: statuses } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.scanRun.findMany({
      where,
      orderBy: { startedAt: sort?.direction ?? "desc" },
      include: { boardManufacturer: { select: { name: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.scanRun.count({ where }),
  ]);

  return { items, total };
}
