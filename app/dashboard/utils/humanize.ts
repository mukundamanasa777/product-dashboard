const KNOWN_SEMI_SUPPLIER_NAMES: Record<string, string> = {
  nxp: "NXP",
  mediatek: "MediaTek",
  qualcomm: "Qualcomm",
  advantech: "Advantech",
};

export function humanizeSemiSupplierName(name: string): string {
  const known = KNOWN_SEMI_SUPPLIER_NAMES[name.toLowerCase()];
  if (known) return known;

  return name
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// "URL_CHANGED" -> "Url Changed" — same word-splitting as
// humanizeSemiSupplierName, just driven by underscores since ChangeType
// values are SCREAMING_SNAKE_CASE rather than free-form supplier names.
export function humanizeChangeType(changeType: string): string {
  return changeType
    .split("_")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// Shown as a tooltip on the Status filter's own chips, while picking a
// status — not once it's applied (the breadcrumb badge and the products
// table just show the plain status, no tooltip).
export const STATUS_DESCRIPTIONS: Record<string, string> = {
  PENDING: "Awaiting review — not yet approved or blocked",
  APPROVED: "Reviewed and approved for the active catalog",
  BLOCKED: "Reviewed and excluded from the active catalog",
};

// Same "tooltip on the filter chip" role as STATUS_DESCRIPTIONS, for the
// Scan Triggering run-status filter.
export const SCAN_STATUS_DESCRIPTIONS: Record<string, string> = {
  PENDING: "Queued — not yet picked up by the worker",
  PROCESSING: "Currently scraping this manufacturer",
  SUCCESS: "Finished without error",
  FAILED: "Finished with an error — see the run's tooltip for details",
};

// Same role, for the Link Check run-status filter.
export const LINK_CHECK_STATUS_DESCRIPTIONS: Record<string, string> = {
  PENDING: "Queued — not yet picked up by the worker",
  PROCESSING: "Currently checking product URLs",
  SUCCESS: "Finished without error",
  FAILED: "Finished with an error — see the run's tooltip for details",
};

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";

  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
