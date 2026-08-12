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

export interface ScanRunCounts {
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

export async function markFailed(scanRunId: number, errorMessage: string) {
  return prisma.scanRun.update({
    where: { id: scanRunId },
    data: {
      status: ScanStatus.FAILED,
      completedAt: new Date(),
      errorMessage,
    },
  });
}

export interface FindManyPaginatedParams {
  triggerSource?: TriggerSource;
  page: number;
  pageSize: number;
  sort?: ParsedSort<"startedAt">;
}

export async function findManyPaginated({
  triggerSource,
  page,
  pageSize,
  sort,
}: FindManyPaginatedParams) {
  const where: Prisma.ScanRunWhereInput = {
    ...(triggerSource ? { triggerSource } : {}),
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
