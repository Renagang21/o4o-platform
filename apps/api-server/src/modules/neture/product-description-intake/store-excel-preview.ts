import * as XLSX from 'xlsx';
import type { DataSource } from 'typeorm';
import { DescriptionIntakeError, normalizeProductBarcode } from './contracts.js';
import { findDescriptionTargets } from './lookup.service.js';

export const MAX_EXCEL_PRODUCTS = 5000;
export const MAX_PRODUCT_FILE_BYTES = 10 * 1024 * 1024;
type Mapping = { barcodeColumn?: number; nameColumn?: number; language: 'ko' | 'en' | 'ja' | 'zh' };
type InputRow = { row: number; barcode: string; name: string; valid: boolean; oversized: boolean };
function cellText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}
/** First sheet, explicit columns. Never persist a workbook or expose prices/other POS columns. */
export function readProductWorkbook(buffer: Buffer, requestedHeaderRow?: number) {
  if (!buffer.length || buffer.length > MAX_PRODUCT_FILE_BYTES) throw new DescriptionIntakeError('FILE_SIZE_LIMIT');
  const workbook = XLSX.read(buffer, { type: 'buffer', sheets: 0, sheetRows: MAX_EXCEL_PRODUCTS + 22, cellDates: false, cellFormula: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new DescriptionIntakeError('NO_SHEET');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false, blankrows: true });
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: true, blankrows: true });
  const normalize = (value: unknown) => cellText(value).replace(/\s/g, '').toLowerCase();
  const detected = rows.slice(0, 20).findIndex(row => row.some(value => /^(상품명|제품명|품명|품목명|name|product_name)$/.test(normalize(value))) &&
    row.some(value => /^(바코드|관리번호\(바코드\)|표준코드|barcode|gtin|ean13)$/.test(normalize(value))));
  const headerRow = requestedHeaderRow ?? Math.max(0, detected);
  if (!Number.isInteger(headerRow) || headerRow < 0 || headerRow >= 20) throw new DescriptionIntakeError('INVALID_HEADER_ROW');
  const header = rows[headerRow];
  const data = rows.slice(headerRow + 1);
  if (data.length > MAX_EXCEL_PRODUCTS) throw new DescriptionIntakeError('TOO_MANY_PRODUCTS');
  if (!header?.length || header.length > 100) throw new DescriptionIntakeError('INVALID_COLUMNS');
  return { headerRow, columns: header.map((value, index) => ({ index, label: cellText(value).slice(0, 100) || `${index + 1}열` })), rows: data, rawRows: rawRows.slice(headerRow + 1) };
}
async function previewPage(db: DataSource, organizationId: string, page: InputRow[], language: Mapping['language']) {
  const matches = await findDescriptionTargets(db, page.map(row => ({
    barcodes: row.valid && !row.oversized && row.barcode ? [normalizeProductBarcode(row.barcode)!] : [],
    name: row.valid && !row.oversized ? row.name : '', identifiers: {}, descriptionType: 'B2B', language,
  })));
  const ids = [...new Set(matches.flatMap(items => items.map(item => item.id)))];
  const listed: Array<{ master_id: string }> = ids.length ? await db.query(
    `SELECT DISTINCT master_id FROM organization_product_listings WHERE organization_id=$1 AND is_active=true AND master_id=ANY($2::uuid[])`, [organizationId, ids]) : [];
  return page.map((row, index) => {
    let state = 'review';
    if (!row.valid || row.oversized) state = 'invalid';
    else if (!matches[index].length) state = 'not_found';
    return { ...row, state, candidates: matches[index].map(item => ({
      id: item.id, name: item.name, barcode: item.barcode, manufacturer: item.manufacturer, matchedBy: item.matchedBy,
      hasAiDescription: !!item.canonical, registered: listed.some(l => l.master_id === item.id),
    })) };
  });
}
export async function previewStoreExcel(db: DataSource, organizationId: string, buffer: Buffer, mapping?: Mapping, headerRow?: number) {
  const workbook = readProductWorkbook(buffer, headerRow);
  if (!mapping) return { headerRow: workbook.headerRow, columns: workbook.columns, rows: [] };
  const indices = [mapping.barcodeColumn, mapping.nameColumn].filter(v => v !== undefined);
  if (!indices.length || indices.some(i => i! >= workbook.columns.length) || new Set(indices).size !== indices.length)
    throw new DescriptionIntakeError('INVALID_COLUMNS');
  const inputs = workbook.rows.map((row, index) => {
    const displayedBarcode = mapping.barcodeColumn === undefined ? '' : cellText(row[mapping.barcodeColumn]).trim();
    const rawBarcode = mapping.barcodeColumn === undefined ? undefined : workbook.rawRows[index]?.[mapping.barcodeColumn];
    // General-format numeric GTINs may display as exponents; keep explicit zero padding when present.
    const barcode = typeof rawBarcode === 'number' && Number.isSafeInteger(rawBarcode) && !/^\d+$/.test(displayedBarcode) ? String(rawBarcode) : displayedBarcode;
    const name = mapping.nameColumn === undefined ? '' : cellText(row[mapping.nameColumn]).trim();
    return { row: index + workbook.headerRow + 2, barcode: barcode.slice(0, 128), name: name.slice(0, 1000),
      valid: !barcode || !!normalizeProductBarcode(barcode),
      oversized: barcode.length > 128 || name.length > 1000 };
  }).filter(row => row.barcode || row.name);
  const result: Awaited<ReturnType<typeof previewPage>> = [];
  // Deliberately serialize bounded pages rather than opening hundreds of concurrent DB reads.
  await Array.from({ length: Math.ceil(inputs.length / 25) }, (_, page) => page * 25).reduce(async (previous, offset) => {
    await previous;
    result.push(...await previewPage(db, organizationId, inputs.slice(offset, offset + 25), mapping.language));
  }, Promise.resolve());
  return { headerRow: workbook.headerRow, columns: workbook.columns, rows: result };
}
