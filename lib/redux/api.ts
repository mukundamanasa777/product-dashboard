import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  BoardManufacturerOption,
  ChangeType,
  FileUploadsResponse,
  LinkCheckRunsResponse,
  LinkCheckScheduleDTO,
  LinkCheckStatus,
  ProductDTO,
  ProductsResponse,
  ProductStatus,
  ScanRunsResponse,
  ScanScheduleDTO,
  ScanStatus,
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

// Scan Triggering is one page showing every run together (manual +
// scheduled) with a Trigger column, same as link check below, rather than
// a split Instant/Scheduled view across two pages — these are filters on
// that one combined view, not a route split.
export interface ScanRunsQueryArgs {
  triggerSources?: TriggerSource[];
  boardManufacturerIds?: number[];
  statuses?: ScanStatus[];
  page: number;
  pageSize: number;
}

export interface LinkCheckRunsQueryArgs {
  triggerSources?: TriggerSource[];
  statuses?: LinkCheckStatus[];
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

export interface TriggerLinkCheckResult {
  linkCheckRunId: number;
  status: string;
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
    "LinkCheckRun",
    "LinkCheckSchedule",
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

    // Enqueues a background run that fetches every checkable product's own
    // URL and flags dead ones as NOT_FOUND (see linkCheck.service) — returns
    // immediately with a run id rather than the outcome; see
    // getLinkCheckRuns for progress/results. Only the run-history tags are
    // invalidated here, same as triggerScan below — the Product/ChangeType
    // tags aren't touched until there's actually new data to show, which
    // isn't yet.
    checkProductLinks: builder.mutation<TriggerLinkCheckResult, void>({
      query: () => ({ url: "products/check-links", method: "POST" }),
      invalidatesTags: [{ type: "LinkCheckRun", id: "LIST" }],
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
      query: ({ triggerSources, boardManufacturerIds, statuses, ...rest }) => ({
        url: "scan-runs",
        params: {
          ...rest,
          ...(triggerSources?.length
            ? { triggerSources: triggerSources.join(",") }
            : {}),
          ...(boardManufacturerIds?.length
            ? { boardManufacturerIds: boardManufacturerIds.join(",") }
            : {}),
          ...(statuses?.length ? { statuses: statuses.join(",") } : {}),
        },
      }),
      providesTags: [{ type: "ScanRun", id: "LIST" }],
    }),

    triggerScan: builder.mutation<TriggerScanResult, void>({
      query: () => ({ url: "scrape", method: "POST", body: {} }),
      invalidatesTags: [{ type: "ScanRun", id: "LIST" }],
    }),

    getSchedule: builder.query<ScanScheduleDTO, void>({
      query: () => "schedule",
      providesTags: ["Schedule"],
    }),

    updateSchedule: builder.mutation<ScanScheduleDTO, UpdateScheduleArgs>({
      query: (body) => ({ url: "schedule", method: "PUT", body }),
      invalidatesTags: ["Schedule"],
    }),

    getLinkCheckRuns: builder.query<
      LinkCheckRunsResponse,
      LinkCheckRunsQueryArgs
    >({
      query: ({ triggerSources, statuses, ...rest }) => ({
        url: "link-check-runs",
        params: {
          ...rest,
          ...(triggerSources?.length
            ? { triggerSources: triggerSources.join(",") }
            : {}),
          ...(statuses?.length ? { statuses: statuses.join(",") } : {}),
        },
      }),
      providesTags: [{ type: "LinkCheckRun", id: "LIST" }],
    }),

    getLinkCheckSchedule: builder.query<LinkCheckScheduleDTO, void>({
      query: () => "link-check-schedule",
      providesTags: ["LinkCheckSchedule"],
    }),

    updateLinkCheckSchedule: builder.mutation<
      LinkCheckScheduleDTO,
      UpdateScheduleArgs
    >({
      query: (body) => ({ url: "link-check-schedule", method: "PUT", body }),
      invalidatesTags: ["LinkCheckSchedule"],
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
  useGetLinkCheckRunsQuery,
  useGetLinkCheckScheduleQuery,
  useUpdateLinkCheckScheduleMutation,
  useGetFileUploadsQuery,
  useUploadFileMutation,
} = api;
