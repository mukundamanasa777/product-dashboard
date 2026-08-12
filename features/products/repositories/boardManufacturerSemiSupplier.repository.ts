import { prisma } from "@/lib/prisma";

export async function findSemiSuppliers(boardManufacturerId: number) {
  const links =
    await prisma.boardManufacturerSemiSupplier.findMany({
      where: {
        boardManufacturerId,
        status: true,
      },
      include: {
        semiSupplier: true,
      },
    });

  return links.map(link => ({
    id: link.semiSupplier.id,
    name: link.semiSupplier.name,
    boardManufacturerSemiSupplierId: link.id,
  }));
}