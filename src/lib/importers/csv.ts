/**
 * A small CSV reader for third-party exports.
 *
 * These files come from apps we do not control, so the parser is deliberately
 * forgiving: it sniffs the delimiter (Strong ships both comma- and
 * semicolon-separated files depending on locale), tolerates CRLF, and handles
 * quoted fields containing delimiters and line breaks, which workout notes do.
 */

/** Delimiters worth guessing between, in the order they are tried. */
const CANDIDATES = [',', ';', '\t'];

/** Picks whichever candidate appears most often outside quotes on line one. */
export function sniffDelimiter(text: string): string {
  let best = ',';
  let bestCount = 0;

  for (const candidate of CANDIDATES) {
    let count = 0;
    let inQuotes = false;
    for (const char of text) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === '\n' && !inQuotes) break;
      else if (char === candidate && !inQuotes) count += 1;
    }
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }

  return best;
}

/** Splits CSV text into rows of raw string cells. Empty rows are dropped. */
export function parseCsv(text: string, delimiter = sniffDelimiter(text)): string[][] {
  // A BOM at the head of the file would otherwise become part of the first
  // column name and break every lookup against it.
  const input = text.replace(/^﻿/, '');

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const endField = () => {
    row.push(field.trim());
    field = '';
  };
  const endRow = () => {
    endField();
    if (row.some((cell) => cell !== '')) rows.push(row);
    row = [];
  };

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (inQuotes) {
      if (char !== '"') {
        field += char;
      } else if (input[i + 1] === '"') {
        // An escaped quote inside a quoted field.
        field += '"';
        i += 1;
      } else {
        inQuotes = false;
      }
      continue;
    }

    if (char === '"') inQuotes = true;
    else if (char === delimiter) endField();
    else if (char === '\n') endRow();
    else if (char !== '\r') field += char;
  }

  if (field !== '' || row.length > 0) endRow();

  return rows;
}

/** Row keyed by header name, lowercased and stripped of spaces and underscores. */
export type CsvRow = Record<string, string>;

function normaliseHeader(header: string): string {
  return header.toLowerCase().replace(/[\s_-]+/g, '');
}

/**
 * Parses into objects keyed by normalised header, so `Exercise Name`,
 * `exercise_name` and `exercisename` all read as `exercisename`.
 */
export function parseCsvRows(text: string): CsvRow[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];

  const headers = rows[0].map(normaliseHeader);
  return rows.slice(1).map((cells) => {
    const row: CsvRow = {};
    headers.forEach((header, index) => {
      if (header) row[header] = cells[index] ?? '';
    });
    return row;
  });
}

/** First present, non-empty value among the given header aliases. */
export function pick(row: CsvRow, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== '') return value;
  }
  return '';
}

/** Tolerant number reader: handles decimal commas and stray unit suffixes. */
export function toNumber(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(',', '.').replace(/[^0-9.\-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}
