/**
 * CSV cell encoding for the waitlist exports.
 *
 * Every waitlist cell is written by an anonymous member of the public (names,
 * emails, free-text survey answers), and the export is opened in Excel or
 * Google Sheets. Two things make a naive `"${value}"` unsafe:
 *
 *  1. A spreadsheet EVALUATES a cell that begins with `=`, `+`, `-` or `@`
 *     (and treats a leading tab or carriage return the same way) even when the
 *     CSV field is quoted — so a signup named `=HYPERLINK(...)` becomes a live
 *     formula on the founder's machine (CWE-1236). Such a cell is prefixed with
 *     a single quote, which spreadsheets display as literal text.
 *  2. An embedded `"` ends a quoted field early. Quotes are doubled, per
 *     RFC 4180.
 *
 * Client-safe and pure; used by both waitlist screens.
 */

const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

export function csvCell(value: string | number | boolean | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value);
  const neutralized = FORMULA_TRIGGER.test(text) ? `'${text}` : text;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

export function csvRow(cells: ReadonlyArray<string | number | boolean | null | undefined>): string {
  return cells.map(csvCell).join(',');
}

export function toCsv(
  rows: ReadonlyArray<ReadonlyArray<string | number | boolean | null | undefined>>,
): string {
  return rows.map(csvRow).join('\r\n');
}
