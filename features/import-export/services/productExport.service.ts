import {
  findAllFiltered,
  type ProductFilters,
} from "@/features/products/repositories/product.repository";
import { buildWorkbookBuffer } from "../utils/xlsx";

const EXPORT_HEADERS = [
  "Name",
  "Description",
  "Product URL",
  "Board Manufacturer",
  "Semi Supplier",
  "Status",
  "Change Type",
  "Source",
  "Created At",
];

export async function buildProductsExport(
  filters: ProductFilters,
): Promise<Buffer> {
  const products = await findAllFiltered(filters);

  const rows = products.map((product) => [
    product.name,
    product.description,
    product.productUrl,
    product.boardManufacturerSemiSupplier.boardManufacturer.name,
    product.boardManufacturerSemiSupplier.semiSupplier.name,
    product.status,
    product.changeType,
    product.source,
    product.createdAt.toISOString(),
  ]);

  return buildWorkbookBuffer("Products", EXPORT_HEADERS, rows);
}
