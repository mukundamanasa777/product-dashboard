import { NextResponse } from "next/server";
import { approve } from "@/features/products/repositories/product.repository";

export async function PATCH(
  _request: Request,
  ctx: RouteContext<"/api/products/[id]/approve">,
) {
  const { id } = await ctx.params;
  const productId = Number(id);

  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  try {
    const product = await approve(productId);
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to approve" },
      { status: 400 },
    );
  }
}
