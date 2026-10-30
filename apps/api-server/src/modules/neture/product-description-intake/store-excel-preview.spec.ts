import * as XLSX from 'xlsx';
import { MAX_EXCEL_PRODUCTS, readProductWorkbook, previewStoreExcel } from './store-excel-preview.js';
import { prepareDescriptionEntries } from './contracts.js';
function workbook(rows: unknown[][]) {
  const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows));
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
}
describe('store product input boundaries', () => {
  it('returns headers only until columns are explicitly selected and never writes a preview', async () => {
    const db = { query: jest.fn() };
    const result = await previewStoreExcel(db as never, 'store', workbook([['상품명', '가격'], ['비공개 POS 이름', 'PRIVATE']]));
    expect(result).toEqual({ headerRow: 0, columns: [{ index: 0, label: '상품명' }, { index: 1, label: '가격' }], rows: [] });
    expect(db.query).not.toHaveBeenCalled();
    await expect(previewStoreExcel(db as never, 'store', workbook([['name'], ['A']]), { nameColumn: 8, language: 'ko' })).rejects.toMatchObject({ code: 'INVALID_COLUMNS' });
  });
  it('rejects oversized sheets rather than silently truncating them', () => {
    expect(() => readProductWorkbook(workbook([['상품명'], ...Array.from({ length: MAX_EXCEL_PRODUCTS + 1 }, () => ['A'])]))).toThrow('TOO_MANY_PRODUCTS');
    expect(() => readProductWorkbook(Buffer.alloc(0))).toThrow('FILE_SIZE_LIMIT');
  });
  it('detects a POS header below title/blank rows and supports explicit header selection', () => {
    const file = workbook([['합성 품목 현황'], [], ['품목코드', '관리번호(바코드)', '품목명'], ['PRIVATE-POS', '08806541001115', '합성 상품']]);
    const parsed = readProductWorkbook(file);
    expect(parsed.headerRow).toBe(2); expect(parsed.columns[1].label).toBe('관리번호(바코드)'); expect(parsed.rows).toHaveLength(1);
    expect(readProductWorkbook(file, 0).headerRow).toBe(0);
    expect(() => readProductWorkbook(file, 20)).toThrow('INVALID_HEADER_ROW');
  });
  it('requires declared sources for typed facts and never treats arbitrary sections as official references', () => {
    const source = { kind: 'manufacturer', currentness: 'retrieved', references: [{ url: 'https://example.com/product' }] };
    const entry = { key: 'test', name: 'A', content: '<p>본문</p>', source };
    const section = { key: 'fact', title: '성분', kind: 'product-fact', text: '합성 사실', referenceUrls: [] };
    expect(() => prepareDescriptionEntries({ entries: [{ ...entry, aiSections: [section] }] })).toThrow();
    expect(() => prepareDescriptionEntries({ entries: [{ ...entry, aiSections: [{ ...section, referenceUrls: ['https://undeclared.example'] }] }] })).toThrow();
    const valid = { ...section, referenceUrls: [source.references[0].url] };
    expect(prepareDescriptionEntries({ entries: [{ ...entry, aiSections: [valid] }] }).entries[0].aiSections).toEqual([valid]);
    expect(() => prepareDescriptionEntries({ entries: [{ ...entry, aiSections: [valid, valid] }] })).toThrow();
  });
});


it.each([undefined, '00000000000000'])('matches numeric XLSX barcodes while preserving explicit padding (%s)', async format => {
  const sheet = XLSX.utils.aoa_to_sheet([['상품명', '바코드'], ['합성 상품', 8806541001115]]);
  if (format) sheet.B2.z = format;
  const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet);
  const file = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
  const db = { query: jest.fn(async (sql: string) => sql.includes('pm.barcode=ANY')
    ? [{ id: '11111111-1111-4111-8111-111111111111', name: '합성 상품', barcode: '8806541001115' }] : []) };
  const result = await previewStoreExcel(db as never, 'store', file, { nameColumn: 0, barcodeColumn: 1, language: 'ko' });
  expect(result.rows[0]).toMatchObject({ barcode: format ? '08806541001115' : '8806541001115', valid: true, state: 'review', candidates: [{ matchedBy: 'barcode' }] });
  expect(db.query.mock.calls.every(([sql]) => sql.startsWith('SELECT'))).toBe(true);
});


it('keeps leading blank sheet rows aligned with explicit header selection and result row numbers', async () => {
  const file = workbook([[], [], ['상품명', '바코드'], ['첫 상품', 8806541001115], ['다음 상품', '08806541001115']]);
  expect(readProductWorkbook(file).headerRow).toBe(2);
  const explicit = readProductWorkbook(file, 2);
  expect(explicit.columns.map(column => column.label)).toEqual(['상품명', '바코드']);
  expect(explicit.rows).toHaveLength(2);
  const db = { query: jest.fn(async () => []) };
  const result = await previewStoreExcel(db as never, 'store', file, { nameColumn: 0, barcodeColumn: 1, language: 'ko' }, 2);
  expect(result.rows.map(row => ({ row: row.row, name: row.name, barcode: row.barcode }))).toEqual([
    { row: 4, name: '첫 상품', barcode: '8806541001115' },
    { row: 5, name: '다음 상품', barcode: '08806541001115' },
  ]);
});
