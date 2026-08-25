"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Button,
  Card,
  Group,
  Stack,
  TextInput,
} from "@mantine/core";
import { SemiSupplierFilter } from "../components/SemiSupplierFilter";
import { BoardManufacturerFilter } from "../components/BoardManufacturerFilter";
import { StatusFilter } from "../components/StatusFilter";
import { ChangeTypeFilter } from "../components/ChangeTypeFilter";
import { FilterBreadcrumbs } from "../components/FilterBreadcrumbs";
import { ProductsSummary } from "../components/ProductsSummary";
import { ProductsList } from "../components/ProductsList";
import { useGetProductsQuery } from "@/lib/redux/api";
import type {
  BoardManufacturerOption,
  ChangeType,
  ProductStatus,
  SemiSupplierOption,
} from "../types";

const PRODUCTS_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_STATUSES: ProductStatus[] = ["PENDING"];

// Filters live in the URL (not just React state) so a refresh — or a
// shared link — restores the exact same view. Semi-supplier/board-
// manufacturer picks carry their name along ("id:name") so their pills
// can redisplay immediately, with no lookup needed to resolve a bare id.
function encodeOptions(options: { id: number; name: string }[]): string {
  return options
    .map((o) => `${o.id}:${encodeURIComponent(o.name)}`)
    .join(",");
}

function decodeOptions(value: string | null): { id: number; name: string }[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => {
      const [idPart, ...nameParts] = entry.split(":");
      const id = Number(idPart);
      const name = decodeURIComponent(nameParts.join(":"));
      return Number.isInteger(id) && name ? { id, name } : null;
    })
    .filter((option): option is { id: number; name: string } => option !== null);
}

// scan_id is deliberately not one of the filter controls above — it only
// ever comes from a URL the caller overwrote by hand (e.g. a link from a
// scan-run notification: /dashboard/products?scan_id=26), never from a
// dropdown. Captured once on mount, the same way the other filters seed
// their initial useState from the URL, so a page interaction later on
// doesn't have to keep re-deriving it.
function parseScanId(value: string | null): number | null {
  if (!value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export default function ProductsPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(
    () => searchParams.get("search") ?? "",
  );
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [selectedSemiSuppliers, setSelectedSemiSuppliers] = useState<
    SemiSupplierOption[]
  >(() => decodeOptions(searchParams.get("semiSuppliers")));
  const [selectedBoardManufacturers, setSelectedBoardManufacturers] =
    useState<BoardManufacturerOption[]>(() =>
      decodeOptions(searchParams.get("boardManufacturers")),
    );
  const [selectedStatuses, setSelectedStatuses] = useState<ProductStatus[]>(
    () => {
      const raw = searchParams.get("statuses");
      // Absent entirely = fresh visit, default to Pending. Present-but-
      // empty = the user explicitly cleared it to mean "show all statuses"
      // and that choice should survive a refresh too.
      if (raw === null) return DEFAULT_STATUSES;
      return raw === "" ? [] : (raw.split(",") as ProductStatus[]);
    },
  );
  const [selectedChangeTypes, setSelectedChangeTypes] = useState<
    ChangeType[]
  >(() => {
    const raw = searchParams.get("changeTypes");
    return raw ? (raw.split(",") as ChangeType[]) : [];
  });
  const [page, setPage] = useState(() => Number(searchParams.get("page") ?? "1"));

  // Not a filter control — see parseScanId above. Read once; never
  // written by any onChange, only ever re-derived by a full page load.
  const [scanId] =
 useState(() => parseScanId(searchParams.get("scan_id")));

  useEffect(() => {
    const timeout = setTimeout(
      () => setDebouncedSearch(searchTerm.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const filtersKey = JSON.stringify([
    debouncedSearch,
    selectedSemiSuppliers.map((s) => s.id).sort(),
    selectedBoardManufacturers.map((b) => b.id).sort(),
    [...selectedStatuses].sort(),
    [...selectedChangeTypes].sort(),
  ]);
  const [appliedFiltersKey, setAppliedFiltersKey] = useState(filtersKey);
  if (filtersKey !== appliedFiltersKey) {
    setAppliedFiltersKey(filtersKey);
    setPage(1);
  }

  // Keep the URL in sync with every filter change (replace, not push —
  // this shouldn't spam browser history) so a refresh comes back to
  // exactly this view.
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (selectedSemiSuppliers.length) {
      params.set("semiSuppliers", encodeOptions(selectedSemiSuppliers));
    }
    if (selectedBoardManufacturers.length) {
      params.set(
        "boardManufacturers",
        encodeOptions(selectedBoardManufacturers),
      );
    }
    // Always written (even empty) so "explicitly cleared" survives a
    // refresh distinctly from "never set" (see the decode above).
    params.set("statuses", selectedStatuses.join(","));
    if (selectedChangeTypes.length) {
      params.set("changeTypes", selectedChangeTypes.join(","));
    }
    if (page > 1) params.set("page", String(page));
    // Not a filter control (see parseScanId) — carried over untouched so
    // it isn't dropped from the URL the next time some other filter
    // changes and this effect rewrites the query string.
    if (scanId !== null) params.set("scan_id", String(scanId));

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [
    debouncedSearch,
    selectedSemiSuppliers,
    selectedBoardManufacturers,
    selectedStatuses,
    selectedChangeTypes,
    page,
    scanId,
    pathname,
    router,
  ]);

  // The filter selections *are* the query args — passing a new object in
  // here re-serializes RTK Query's cache key and fires a re-fetch with
  // these values as query params. No manual useEffect/fetch/useState
  // triplet, and Approve/Reject elsewhere auto-refresh this via cache
  // tag invalidation instead of a refreshKey prop.
  const { data, isLoading } = useGetProductsQuery({
    search: debouncedSearch || undefined,
    semiSupplierIds: selectedSemiSuppliers.map((s) => s.id),
    boardManufacturerIds: selectedBoardManufacturers.map((b) => b.id),
    statuses: selectedStatuses,
    changeTypes: selectedChangeTypes,
    scanRunId: scanId ?? undefined,
    page,
    pageSize: PRODUCTS_PAGE_SIZE,
  });

  const products = data?.items ?? [];
  const allCount = data?.allCount ?? 0;
  const filteredCount = data?.total ?? 0;

  function buildFilterParams() {
    const params = new URLSearchParams();
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    }
    if (selectedSemiSuppliers.length) {
      params.set(
        "semiSupplierIds",
        selectedSemiSuppliers.map((s) => s.id).join(","),
      );
    }
    if (selectedBoardManufacturers.length) {
      params.set(
        "boardManufacturerIds",
        selectedBoardManufacturers.map((b) => b.id).join(","),
      );
    }
    if (selectedStatuses.length) {
      params.set("statuses", selectedStatuses.join(","));
    }
    if (selectedChangeTypes.length) {
      params.set("changeTypes", selectedChangeTypes.join(","));
    }
    // Not a filter control (see parseScanId) — carried into the export
    // too, so "Export to Excel" matches whatever the scan_id-scoped view
    // is currently showing rather than silently exporting everything.
    if (scanId !== null) {
      params.set("scanRunId", String(scanId));
    }
    return params;
  }

  const exportHref = `/api/products/export?${buildFilterParams().toString()}`;

  const hasFilters =
    debouncedSearch.length > 0 ||
    selectedSemiSuppliers.length > 0 ||
    selectedBoardManufacturers.length > 0 ||
    selectedStatuses.length > 0 ||
    selectedChangeTypes.length > 0;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredCount / PRODUCTS_PAGE_SIZE),
  );

  return (
    <Stack gap="lg">
      <Card withBorder padding="md">
        <Stack gap="md">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <TextInput
              placeholder="Search products by name..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
              style={{ flex: 1, minWidth: 240 }}
            />
            <Group gap="xs" wrap="wrap">
              <Button component="a" href={exportHref} variant="default">
                Export to Excel
              </Button>
            </Group>
          </Group>

          <Group align="flex-start" gap="xl" wrap="wrap">
            <Box miw={220}>
              <SemiSupplierFilter
                selected={selectedSemiSuppliers}
                onChange={setSelectedSemiSuppliers}
              />
            </Box>
            <Box miw={260}>
              <BoardManufacturerFilter
                selected={selectedBoardManufacturers}
                onChange={setSelectedBoardManufacturers}
              />
            </Box>
            <Box miw={220}>
              <ChangeTypeFilter
                selected={selectedChangeTypes}
                onChange={setSelectedChangeTypes}
              />
            </Box>
            <Box miw={220}>
              <StatusFilter
                selected={selectedStatuses}
                onChange={setSelectedStatuses}
              />
            </Box>

          </Group>
        </Stack>
      </Card>

      <FilterBreadcrumbs
        searchTerm={debouncedSearch}
        onRemoveSearch={() => setSearchTerm("")}
        selectedSemiSuppliers={selectedSemiSuppliers}
        selectedBoardManufacturers={selectedBoardManufacturers}
        selectedStatuses={selectedStatuses}
        selectedChangeTypes={selectedChangeTypes}
        onRemoveSemiSupplier={(id) =>
          setSelectedSemiSuppliers((prev) => prev.filter((s) => s.id !== id))
        }
        onRemoveBoardManufacturer={(id) =>
          setSelectedBoardManufacturers((prev) =>
            prev.filter((b) => b.id !== id),
          )
        }
        onRemoveStatus={(status) =>
          setSelectedStatuses((prev) => prev.filter((s) => s !== status))
        }
        onRemoveChangeType={(changeType) =>
          setSelectedChangeTypes((prev) =>
            prev.filter((c) => c !== changeType),
          )
        }
        onClearAll={() => {
          setSearchTerm("");
          setSelectedSemiSuppliers([]);
          setSelectedBoardManufacturers([]);
          setSelectedStatuses([]);
          setSelectedChangeTypes([]);
        }}
      />

      <ProductsSummary
        allCount={allCount}
        filteredCount={filteredCount}
        hasFilters={hasFilters}
      />

      <ProductsList
        products={products}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        loading={isLoading}
      />
    </Stack>
  );
}
