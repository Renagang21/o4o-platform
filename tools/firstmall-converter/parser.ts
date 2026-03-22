/**
 * Excel parser — reads FirstMall .xlsx export
 */

import { createRequire } from 'module';
import type { FirstMallRow } from './types.js';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

export function parseExcel(filePath: string): FirstMallRow[] {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: FirstMallRow[] = XLSX.utils.sheet_to_json(sheet);

  console.log(`[parser] Sheet: "${sheetName}", rows: ${rows.length}`);
  return rows;
}
