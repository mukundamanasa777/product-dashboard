import { NextResponse } from "next/server";
import { getSourceFile } from "@/features/import-export/repositories/fileUpload.repository";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/file-uploads/[id]/source-file">,
) {
  const { id } = await ctx.params;
  const fileUploadId = Number(id);

  if (!Number.isInteger(fileUploadId)) {
    return NextResponse.json(
      { error: "Invalid file upload id" },
      { status: 400 },
    );
  }

  const record = await getSourceFile(fileUploadId);

  if (!record) {
    return NextResponse.json(
      { error: "File upload not found" },
      { status: 404 },
    );
  }

  return new NextResponse(new Uint8Array(record.sourceFile), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${record.fileName}"`,
    },
  });
}
