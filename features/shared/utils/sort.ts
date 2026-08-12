export type SortDirection = "asc" | "desc";

export interface ParsedSort<Field extends string> {
  field: Field;
  direction: SortDirection;
}

/**
 * Parses a "field:direction" sort param (e.g. "createdAt:asc") against a
 * single allowed field, falling back to the given default whenever the
 * param is absent or doesn't name that field. Callers only ever expose one
 * sortable field per list route today (the field their default order
 * already tiebreaks on), so this stays intentionally narrow rather than
 * building out a general multi-field sort grammar nothing asks for yet.
 */
export function parseSort<Field extends string>(
  value: string | null,
  field: Field,
  defaultDirection: SortDirection,
): ParsedSort<Field> {
  if (!value) {
    return { field, direction: defaultDirection };
  }

  const [rawField, rawDirection] = value.split(":");
  if (rawField !== field) {
    return { field, direction: defaultDirection };
  }

  const direction = rawDirection === "asc" || rawDirection === "desc"
    ? rawDirection
    : defaultDirection;

  return { field, direction };
}
