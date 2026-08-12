import { NextResponse } from "next/server";
import {
  UrlValidatorStructureError,
  validateUrls,
} from "@/features/tools/services/urlValidator.service";

// Checking every URL in a large file can take a while even with
// concurrency — give the route more room than the platform default before
// it's cut off.
export const maxDuration = 300;

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = [".xlsx"];

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const urlColumn = formData?.get("urlColumn");

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json(
      { error: 'A .xlsx file is required (field name "file")' },
      { status: 400 },
    );
  }

  if (typeof urlColumn !== "string" || !urlColumn.trim()) {
    return NextResponse.json(
      { error: "The URL column name is required" },
      { status: 400 },
    );
  }

  const fileName = file instanceof File ? file.name : "upload.xlsx";
  const hasAllowedExtension = ALLOWED_EXTENSIONS.some((ext) =>
    fileName.toLowerCase().endsWith(ext),
  );
  const hasAllowedType =
    !file.type ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  if (!hasAllowedExtension || !hasAllowedType) {
    return NextResponse.json(
      { error: "Only .xlsx files are accepted" },
      { status: 400 },
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: `File exceeds the ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB upload limit`,
      },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await validateUrls(buffer, urlColumn.trim());

    return new NextResponse(new Uint8Array(result.fileBuffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="url-check-results-${Date.now()}.xlsx"`,
        // Exposed so the browser can read them off the response — the body
        // is the file itself, so the summary rides along as headers.
        "X-Total-Rows": String(result.totalRows),
        "X-Ok-Count": String(result.okCount),
        "X-Failed-Count": String(result.failedCount),
      },
    });
  } catch (err) {
    if (err instanceof UrlValidatorStructureError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
