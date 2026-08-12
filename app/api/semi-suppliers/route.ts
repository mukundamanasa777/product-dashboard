import { NextResponse } from "next/server";
import { findAllActive } from "@/features/products/repositories/semiSupplier.repository";

export async function GET() {
  const items = await findAllActive();

  return NextResponse.json({ items });
}
