import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  BoardManufacturerOption,
  ChangeType,
  FileUploadsResponse,
  LinkCheckSummary,
  ProductDTO,
  ProductsResponse,
  ProductStatus,
  ScanRunsResponse,
  ScanScheduleDTO,
  ScheduleFrequency,
  SemiSupplierOption,
  TriggerSource,
} from "@/app/dashboard/types";

export interface ProductsQueryArgs {
  search?: string;
  semiSupplierIds?: number[];
  boardManufacturerIds?: number[];
  statuses?: ProductStatus[];
  changeTypes?: ChangeType[];
  // Not driven by any filter control — only ever set from a `?scan_id=`
  // query param already present in the page URL. See ProductsPageClient.
  scanRunId?: number;
  page: number;
  pageSize: number;
}

export interface BoardManufacturersQueryArgs {
  search?: string;
  page: number;
  pageSize: number;
}

export interface ScanRunsQueryArgs {
  triggerSource: TriggerSource;
  page: number;
  pageSize: number;
}

export interface FileUploadsQueryArgs {
  page: number;
  pageSize: number;
}

export interface UpdateScheduleArgs {
  frequency: ScheduleFrequency;
  dayOfWeek: number;
  dayOfMonth: number;
  hour: number;
  minute: number;
  isActive: boolean;
  timezone: string;
}

export interface TriggerScanResult {
  scanRunIds: number[];
  count: number;
}

export interface UploadFileResult {
  fileUploadId: number;
  status: string;
}

/**
 * One RTK Query slice for the whole app. Filters are just the query's
 * arg object — passing a new filter object in re-serializes the cache key
 * and fires a re-fetch with those values as query params; that *is* the
 * "API-based filters" pattern this replaces manual useState+useEffect+
 * fetch with everywhere.
 */
export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: [
    "Product",
    "ScanRun",
    "Schedule",
    "FileUpload",
    "BoardManufacturer",
    "ChangeType",
  ],
  endpoints: (builder) => ({
    getProducts: builder.query<ProductsResponse, ProductsQueryArgs>({
      query: ({
        semiSupplierIds,
        boardManufacturerIds,
        statuses,
        changeTypes,
        ...rest
      }) => ({
        url: "products",
        params: {
          ...rest,
          ...(semiSupplierIds?.length
            ? { semiSupplierIds: semiSupplierIds.join(",") }
            : {}),
          ...(boardManufacturerIds?.length
            ? { boardManufacturerIds: boardManufacturerIds.join(",") }
            : {}),
          ...(statuses?.length ? { statuses: statuses.join(",") } : {}),
          ...(changeTypes?.length
            ? { changeTypes: changeTypes.join(",") }
            : {}),
        },
      }),
      providesTags: [{ type: "Product", id: "LIST" }],
    }),

    approveProduct: builder.mutation<ProductDTO, number>({
      query: (id) => ({ url: `products/${id}/approve`, method: "PATCH" }),
      invalidatesTags: [{ type: "Product", id: "LIST" }],
    }),

    rejectProduct: builder.mutation<ProductDTO, number>({
      query: (id) => ({ url: `products/${id}/reject`, method: "PATCH" }),
      invalidatesTags: [{ type: "Product", id: "LIST" }],
    }),

    // Actively fetches every checkable product's own URL and flags dead
    // ones as NOT_FOUND (see linkCheck.service) — invalidates both the
    // product list (statuses/changeTypes just changed) and the change-type
    // filter options (NOT_FOUND may now exist for the first time).
    checkProductLinks: builder.mutation<LinkCheckSummary, void>({
      query: () => ({ url: "products/check-links", method: "POST" }),
      invalidatesTags: [
        { type: "Product", id: "LIST" },
        { type: "ChangeType", id: "LIST" },
      ],
    }),

    getBoardManufacturers: builder.query<
      { items: BoardManufacturerOption[]; total: number },
      BoardManufacturersQueryArgs
    >({
      query: (params) => ({ url: "board-manufacturers", params }),
      providesTags: [{ type: "BoardManufacturer", id: "LIST" }],
    }),

    getSemiSuppliers: builder.query<{ items: SemiSupplierOption[] }, void>({
      query: () => "semi-suppliers",
    }),

    // Options are the change types actually present on products right now
    // (see product.repository.findDistinctChangeTypes), not the full static
    // enum, so the dropdown never offers a choice with zero matches.
    getChangeTypes: builder.query<{ items: ChangeType[] }, void>({
      query: () => "change-types",
      providesTags: [{ type: "ChangeType", id: "LIST" }],
    }),

    getScanRuns: builder.query<ScanRunsResponse, ScanRunsQueryArgs>({
      query: (params) => ({ url: "scan-runs", params }),
      providesTags: (_result, _error, args) => [
        { type: "ScanRun", id: args.triggerSource },
      ],
    }),

    triggerScan: builder.mutation<TriggerScanResult, void>({
      query: () => ({ url: "scrape", method: "POST", body: {} }),
      invalidatesTags: [
        { type: "ScanRun", id: "MANUAL" },
        { type: "ScanRun", id: "SCHEDULED" },
      ],
    }),

    getSchedule: builder.query<ScanScheduleDTO, void>({
      query: () => "schedule",
      providesTags: ["Schedule"],
    }),

    updateSchedule: builder.mutation<ScanScheduleDTO, UpdateScheduleArgs>({
      query: (body) => ({ url: "schedule", method: "PUT", body }),
      invalidatesTags: ["Schedule"],
    }),

    getFileUploads: builder.query<FileUploadsResponse, FileUploadsQueryArgs>({
      query: (params) => ({ url: "file-uploads", params }),
      providesTags: [{ type: "FileUpload", id: "LIST" }],
    }),

    uploadFile: builder.mutation<UploadFileResult, FormData>({
      query: (formData) => ({
        url: "file-uploads",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: [{ type: "FileUpload", id: "LIST" }],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useApproveProductMutation,
  useRejectProductMutation,
  useCheckProductLinksMutation,
  useGetBoardManufacturersQuery,
  useGetSemiSuppliersQuery,
  useGetChangeTypesQuery,
  useGetScanRunsQuery,
  useTriggerScanMutation,
  useGetScheduleQuery,
  useUpdateScheduleMutation,
  useGetFileUploadsQuery,
  useUploadFileMutation,
} = api;
