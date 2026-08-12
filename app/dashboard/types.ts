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
  | "NOT_FOUND";

export interface ProductRemark {
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
  completedAt: string | null;
  errorMessage: string | null;
  totalProducts: number;
  newProducts: number;
  updatedProducts: number;
  removedProducts: number;
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
