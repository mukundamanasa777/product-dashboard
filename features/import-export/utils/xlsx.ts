import ExcelJS from "exceljs";

export type CellValue = string | number | null;

/**
 * Builds a single-sheet .xlsx workbook: a bold header row followed by the
 * given data rows. Used for exports, error reports, and the import
 * template — anywhere the app needs to hand back a spreadsheet.
 */
export async function buildWorkbookBuffer(
  sheetName: string,
  headers: string[],
  rows: CellValue[][],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.addRow(headers).font = { bold: true };
  for (const row of rows) {
    sheet.addRow(row);
  }

  sheet.columns.forEach((column) => {
    column.width = 28;
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export interface WorkbookRows {
  headers: string[];
  rows: string[][];
}

/**
 * Reads the first worksheet of an uploaded .xlsx buffer into a plain
 * header row + string rows shape. Every cell is coerced to a trimmed
 * string — callers are responsible for parsing/validating from there.
 */
export async function readWorkbookRows(
  buffer: Buffer | ArrayBuffer,
): Promise<WorkbookRows> {
  const workbook = new ExcelJS.Workbook();
  const nodeBuffer = Buffer.isBuffer(buffer)
    ? buffer
    : Buffer.from(new Uint8Array(buffer));
  // exceljs's index.d.ts declares a stray top-level
  // `declare interface Buffer extends ArrayBuffer {}`, which merges into
  // (and pollutes) the *global* Buffer type for the whole project — after
  // that merge, no ordinary Buffer.from() result can structurally satisfy
  // `Buffer` anymore, even through an `unknown` cast. This is an upstream
  // typing defect, not a real runtime issue (a real Buffer works fine at
  // runtime) — only the argument's type is bypassed here, and `load` is
  // still called as a proper method (workbook.xlsx.load(...), not a
  // detached reference) so its internal `this` stays bound correctly.
  await workbook.xlsx.load(nodeBuffer as never);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { headers: [], rows: [] };
  }

  const cellToString = (value: ExcelJS.CellValue): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") {
      // Rich text / hyperlink / formula-result cells
      if ("text" in value && typeof value.text === "string") return value.text;
      if ("result" in value) return cellToString(value.result as ExcelJS.CellValue);
      if ("hyperlink" in value && typeof value.hyperlink === "string") {
        return value.hyperlink;
      }
      return "";
    }
    return String(value).trim();
  };

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell) => {
    headers.push(cellToString(cell.value).trim());
  });

  const rows: string[][] = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    if (row.cellCount === 0) continue;

    const values: string[] = [];
    for (let col = 1; col <= headers.length; col++) {
      values.push(cellToString(row.getCell(col).value).trim());
    }

    if (values.every((value) => value === "")) continue; // skip fully blank rows
    rows.push(values);
  }

  return { headers, rows };
}
