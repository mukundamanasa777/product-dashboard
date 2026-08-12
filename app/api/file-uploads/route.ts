import { NextRequest, NextResponse } from "next/server";
import { fileUploadQueue } from "@/lib/queue/fileUploadQueue";
import {
  createPending,
  findManyPaginated,
} from "@/features/import-export/repositories/fileUpload.repository";
import { parseSort } from "@/features/shared/utils/sort";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = [".xlsx"];

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json(
      { error: "A .xlsx file is required (field name \"file\")" },
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
      { error: `File exceeds the ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB upload limit` },
      { status: 413 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const record = await createPending(fileName, buffer);
  await fileUploadQueue.add("process-file-upload", {
    fileUploadId: record.id,
  });

  return NextResponse.json(
    { fileUploadId: record.id, status: record.status },
    { status: 202 },
  );
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "10");
  const sort = parseSort(searchParams.get("sort"), "createdAt", "desc");

  const { items, total } = await findManyPaginated({ page, pageSize, sort });

  return NextResponse.json({ items, total, page, pageSize });
}
