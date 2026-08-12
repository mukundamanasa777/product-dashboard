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

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";

  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
