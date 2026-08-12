import { NextResponse } from "next/server";
import { getErrorFile } from "@/features/import-export/repositories/fileUpload.repository";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/file-uploads/[id]/error-file">,
) {
  const { id } = await ctx.params;
  const fileUploadId = Number(id);

  if (!Number.isInteger(fileUploadId)) {
    return NextResponse.json(
      { error: "Invalid file upload id" },
      { status: 400 },
    );
  }

  const record = await getErrorFile(fileUploadId);

  if (!record?.errorFile) {
    return NextResponse.json(
      { error: "No error file for this upload" },
      { status: 404 },
    );
  }

  return new NextResponse(new Uint8Array(record.errorFile), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="upload-${fileUploadId}-errors.xlsx"`,
    },
  });
}
