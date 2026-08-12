import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma";
import type { ParsedSort } from "@/features/shared/utils/sort";

export interface FindManyPaginatedParams {
  search?: string;
  page: number;
  pageSize: number;
  sort?: ParsedSort<"name">;
}

export async function findManyPaginated({
  search,
  page,
  pageSize,
  sort,
}: FindManyPaginatedParams) {
  const where: Prisma.BoardManufacturerWhereInput = {
    status: true,
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.boardManufacturer.findMany({
      where,
      orderBy: { name: sort?.direction ?? "asc" },
      select: { id: true, name: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.boardManufacturer.count({ where }),
  ]);

  return { items, total };
}

export async function findAllActive() {
  return prisma.boardManufacturer.findMany({
    where: { status: true },
    select: { id: true, name: true },
  });
}

export async function findById(id: number) {
  return prisma.boardManufacturer.findUnique({
    where: {
      id,
    },
    include: {
      boardManufacturerSemiSuppliers: {
        where: {
          status: true,
        },
        include: {
          semiSupplier: true,
        },
      },
    },
  });
}