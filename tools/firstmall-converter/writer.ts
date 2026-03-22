/**
 * CSV writer — generates O4O-compatible CSV with BOM
 */

import fs from 'fs';
import path from 'path';
import type { O4ORow } from './types.js';

const CSV_HEADERS: (keyof O4ORow)[] = [
  'barcode',
  'marketing_name',
  'supply_price',
  'distribution_type',
  'manufacturer_name',
  'consumer_short_description',
  'msrp',
  'stock_qty',
  'brand',
  'image_url',
];

function escapeField(value: unknown): string {
  const str = value == null ? '' : String(value);
  // Always quote, escape internal quotes
  return `"${str.replace(/"/g, '""')}"`;
}

export function writeCsv(rows: O4ORow[], outputPath: string): void {
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const headerLine = CSV_HEADERS.join(',');
  const dataLines = rows.map(row =>
    CSV_HEADERS.map(h => escapeField(row[h])).join(',')
  );

  const csv = [headerLine, ...dataLines].join('\n');

  // UTF-8 BOM for Excel compatibility
  fs.writeFileSync(outputPath, '\uFEFF' + csv, 'utf-8');

  console.log(`[writer] ${outputPath} — ${rows.length} rows written`);
}
