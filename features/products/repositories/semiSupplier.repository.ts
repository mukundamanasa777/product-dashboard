import { prisma } from "@/lib/prisma";

export async function findAllActive() {
  return prisma.semiSupplier.findMany({
    where: { status: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}
