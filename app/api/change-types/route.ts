import { NextResponse } from "next/server";
import { findDistinctChangeTypes } from "@/features/products/repositories/product.repository";

export async function GET() {
  const items = await findDistinctChangeTypes();

  return NextResponse.json({ items });
}
