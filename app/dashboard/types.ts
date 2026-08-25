export interface SemiSupplierOption {
  id: number;
  name: string;
}

export interface BoardManufacturerOption {
  id: number;
  name: string;
}

export type ProductStatus = "PENDING" | "APPROVED" | "BLOCKED";

export const PRODUCT_STATUSES: ProductStatus[] = [
  "PENDING",
  "APPROVED",
  "BLOCKED",
];

export type ChangeType =
  | "NONE"
  | "NEW"
  | "URL_CHANGED"
  | "DESCRIPTION_CHANGED"
  | "EXPIRED"
  | "UPDATED"
  | "RESTORED"
  | "NOT_FOUND"
  | "NAME_CHANGED";

export interface ProductRemark {
  name?: { old: string; new: string };
  url?: { old: string; new: string };
  description?: { old: string | null; new: string };
  previousStatus?: ProductStatus;
  previousChangeType?: ChangeType;
  previousScanRunId?: number | null;
}

export type ProductSource = "SCRAPED" | "UPLOADED";

export interface ProductDTO {
  id: number;
  name: string;
  productUrl: string;
  description: string | null;
  status: ProductStatus;
  changeType: ChangeType;
  source: ProductSource;
  createdAt: string;
  semiSupplierName: string;
  boardManufacturerName: string;
  remark: ProductRemark | null;
}

export interface ProductsResponse {
  items: ProductDTO[];
  total: number;
  allCount: number;
  page: number;
  pageSize: number;
}

export interface LinkCheckSummary {
  checked: number;
  okCount: number;
  brokenCount: number;
}

export type LinkCheckStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";

export interface LinkCheckRunDTO {
  id: number;
  status: LinkCheckStatus;
  triggerSource: TriggerSource;
  startedAt: string;
  processingStartedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  checked: number;
  okCount: number;
  brokenCount: number;
}

export interface LinkCheckRunsResponse {
  items: LinkCheckRunDTO[];
  total: number;
  page: number;
  pageSize: number;
}

export type ScanStatus =
  | "PENDING"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED"
  | "RUNNING";

export type TriggerSource = "MANUAL" | "SCHEDULED";

export interface ScanRunDTO {
  id: number;
  boardManufacturerName: string;
  status: ScanStatus;
  triggerSource: TriggerSource;
  startedAt: string;
  processingStartedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  /** Everything the scrape found this run (new + updated + unchanged) — not what scan_id filtering shows. See reflectedProducts. */
  totalProducts: number;
  newProducts: number;
  updatedProducts: number;
  removedProducts: number;
  /** Live count of Product rows currently pointing at this run's id — exactly what /dashboard/products?scan_id=<id> shows right now. Not derived from newProducts/updatedProducts/removedProducts, which go stale once a later run reassigns the same rows. */
  reflectedProducts: number;
  pagesSucceeded: number;
  /** Site never responded in time (goto/waitForSelector timeout, or the axios request timeout) — distinct from failedUrls below. */
  pagesTimedOut: number;
  /** Failed for any other reason (DNS failure, HTTP error status, TLS error, network change, ...). */
  pagesFailed: number;
  failedUrls: { url: string; error: string | null }[];
  timedOutUrls: { url: string; error: string | null }[];
}

export interface ScanRunsResponse {
  items: ScanRunDTO[];
  total: number;
  page: number;
  pageSize: number;
}

export type FileUploadStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";

export interface FileUploadDTO {
  id: number;
  fileName: string;
  status: FileUploadStatus;
  totalRows: number | null;
  createdCount: number | null;
  errorCount: number | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface FileUploadsResponse {
  items: FileUploadDTO[];
  total: number;
  page: number;
  pageSize: number;
}

export type ScheduleFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

export interface ScanScheduleDTO {
  id: number;
  frequency: ScheduleFrequency;
  dayOfWeek: number;
  dayOfMonth: number;
  hour: number;
  minute: number;
  timezone: string;
  isActive: boolean;
  cronPattern: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

/** Same shape as ScanScheduleDTO — the link-check schedule is a separate row. */
export type LinkCheckScheduleDTO = ScanScheduleDTO;
