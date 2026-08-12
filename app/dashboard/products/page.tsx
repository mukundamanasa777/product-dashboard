import { Suspense } from "react";
import { Center, Loader } from "@mantine/core";
import ProductsPageClient from "./ProductsPageClient";

// ProductsPageClient reads filters from the URL via useSearchParams, which
// Next.js requires to sit behind a Suspense boundary in a Server Component
// page — otherwise `next build`'s static prerender fails outright. This
// wrapper is the entire reason this file is a separate Server Component
// instead of just exporting the client component directly.
export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <Center py="xl">
          <Loader size="sm" />
        </Center>
      }
    >
      <ProductsPageClient />
    </Suspense>
  );
}
