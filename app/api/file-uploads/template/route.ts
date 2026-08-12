import { NextResponse } from "next/server";
import { IMPORT_HEADERS } from "@/features/import-export/services/productImport.service";
import { buildWorkbookBuffer } from "@/features/import-export/utils/xlsx";

export async function GET() {
  const buffer = await buildWorkbookBuffer("Products", [...IMPORT_HEADERS], [
    [
      "AOM-2721",
      "Qualcomm QCS6490 OSM 1.1 Computer-on-Module",
      "https://example.com/products/aom-2721",
      "Advantech",
      "Qualcomm",
    ],
  ]);

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="product-import-template.xlsx"',
    },
  });
}
