import { NextResponse } from "next/server";
import { checkAllProductLinks } from "@/features/products/services/linkCheck.service";

// Checking every product's link can take a while even with concurrency —
// give the route more room than the platform default before it's cut off.
export const maxDuration = 300;

export async function POST() {
  console.log("Checking all product links...4");
  const summary = await checkAllProductLinks();
  return NextResponse.json(summary);
}
