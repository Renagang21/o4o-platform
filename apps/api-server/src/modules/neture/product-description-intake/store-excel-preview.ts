import * as XLSX from 'xlsx';
import type { DataSource } from 'typeorm';
import { DescriptionIntakeError, normalizeProductBarcode } from './contracts.js';
import { findDescriptionTargets } from './lookup.service.js';

export const MAX_EXCEL_PRODUCTS = 2000;
/** First sheet, explicit columns. Never persist a workbook or expose prices/other POS columns. */
export function readProductWorkbook(buffer: Buffer) {
  if (!buffer.length || buffer.length > 10 * 1024 * 1024) throw new DescriptionIntakeError('FILE_SIZE_LIMIT');
  const workbook = XLSX.read(buffer, { type: 'buffer', sheetRows: MAX_EXCEL_PRODUCTS + 2, cellDates: false, cellFormula: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new DescriptionIntakeError('NO_SHEET');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false, blankrows: true });
  if (rows.length > MAX_EXCEL_PRODUCTS + 1) throw new DescriptionIntakeError('TOO_MANY_PRODUCTS');
  const header = rows.shift();
  if (!header?.length || header.length > 100) throw new DescriptionIntakeError('INVALID_COLUMNS');
  return { columns: header.map((value, index) => ({ index, label: String(value).slice(0, 100) || `${index + 1}열` })), rows };
}
export async function previewStoreExcel(db: DataSource, organizationId: string, buffer: Buffer,
  mapping?: { barcodeColumn?: number; nameColumn?: number; language: 'ko' | 'en' | 'ja' | 'zh' }) {
  const workbook = readProductWorkbook(buffer);
  if (!mapping) return { columns: workbook.columns, rows: [] };
  const indices = [mapping.barcodeColumn, mapping.nameColumn].filter(v => v !== undefined);
  if (!indices.length || indices.some(i => i! >= workbook.columns.length) || new Set(indices).size !== indices.length)
    throw new DescriptionIntakeError('INVALID_COLUMNS');
  const inputs = workbook.rows.map((row, index) => {
    const barcode = mapping.barcodeColumn === undefined ? '' : String(row[mapping.barcodeColumn] ?? '').trim();
    const name = mapping.nameColumn === undefined ? '' : String(row[mapping.nameColumn] ?? '').trim();
    return { row: index + 2, barcode: barcode.slice(0, 128), name: name.slice(0, 1000),
      valid: !barcode || !!normalizeProductBarcode(barcode),
      oversized: barcode.length > 128 || name.length > 1000 };
  }).filter(row => row.barcode || row.name);
  const result = [];
  for (let offset = 0; offset < inputs.length; offset += 25) {
    const page = inputs.slice(offset, offset + 25);
    const matches = await findDescriptionTargets(db, page.map(row => ({
      barcodes: row.valid && !row.oversized && row.barcode ? [normalizeProductBarcode(row.barcode)!] : [],
      name: row.valid && !row.oversized ? row.name : '', identifiers: {}, descriptionType: 'B2B', language: mapping.language,
    })));
    const ids = [...new Set(matches.flatMap(items => items.map(item => item.id)))];
    const listed: Array<{ master_id: string }> = ids.length ? await db.query(
      `SELECT DISTINCT master_id FROM organization_product_listings WHERE organization_id=$1 AND is_active=true AND master_id=ANY($2::uuid[])`, [organizationId, ids]) : [];
    for (const [index, row] of page.entries()) result.push({ ...row, candidates: matches[index].map(item => ({
      id: item.id, name: item.name, barcode: item.barcode, manufacturer: item.manufacturer, matchedBy: item.matchedBy,
      hasAiDescription: !!item.canonical, registered: listed.some(l => l.master_id === item.id),
    })), state: !row.valid || row.oversized ? 'invalid' : !matches[index].length ? 'not_found' : 'review' });
  }
  return { columns: workbook.columns, rows: result };
}
