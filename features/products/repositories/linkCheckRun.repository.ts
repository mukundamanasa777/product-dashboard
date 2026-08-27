import { prisma } from "@/lib/prisma";
import { LinkCheckStatus, TriggerSource } from "@/app/generated/prisma";
import type { ParsedSort } from "@/features/shared/utils/sort";
import type { LinkCheckSummary } from "../services/linkCheck.service";

export async function createPending(triggerSource: TriggerSource) {
  return prisma.linkCheckRun.create({
    data: {
      triggerSource,
      status: LinkCheckStatus.PENDING,
    },
  });
}

export async function findById(id: number) {
  return prisma.linkCheckRun.findUnique({ where: { id } });
}

export async function markProcessing(id: number) {
  return prisma.linkCheckRun.update({
    where: { id },
    data: {
      status: LinkCheckStatus.PROCESSING,
      processingStartedAt: new Date(),
    },
  });
}

export async function markSuccess(id: number, summary: LinkCheckSummary) {
  return prisma.linkCheckRun.update({
    where: { id },
    data: {
      status: LinkCheckStatus.SUCCESS,
      completedAt: new Date(),
      checked: summary.checked,
      okCount: summary.okCount,
      brokenCount: summary.brokenCount,
    },
  });
}

export async function markFailed(id: number, errorMessage: string) {
  return prisma.linkCheckRun.update({
    where: { id },
    data: {
      status: LinkCheckStatus.FAILED,
      completedAt: new Date(),
      errorMessage,
    },
  });
}

export interface FindManyPaginatedParams {
  triggerSources?: TriggerSource[];
  statuses?: LinkCheckStatus[];
  page: number;
  pageSize: number;
  sort?: ParsedSort<"startedAt">;
}

export async function findManyPaginated({
  triggerSources,
  statuses,
  page,
  pageSize,
  sort,
}: FindManyPaginatedParams) {
  const where = {
    ...(triggerSources?.length ? { triggerSource: { in: triggerSources } } : {}),
    ...(statuses?.length ? { status: { in: statuses } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.linkCheckRun.findMany({
      where,
      orderBy: { startedAt: sort?.direction ?? "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.linkCheckRun.count({ where }),
  ]);

  return { items, total };
}
