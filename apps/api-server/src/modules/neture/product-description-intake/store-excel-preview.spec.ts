import * as XLSX from 'xlsx';
import { readProductWorkbook, previewStoreExcel } from './store-excel-preview.js';
import { prepareDescriptionEntries } from './contracts.js';
function workbook(rows: unknown[][]) {
  const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows));
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
}
describe('store product input boundaries', () => {
  it('returns headers only until columns are explicitly selected and never writes a preview', async () => {
    const db = { query: jest.fn() };
    const result = await previewStoreExcel(db as never, 'store', workbook([['상품명', '가격'], ['비공개 POS 이름', 'PRIVATE']]));
    expect(result).toEqual({ columns: [{ index: 0, label: '상품명' }, { index: 1, label: '가격' }], rows: [] });
    expect(db.query).not.toHaveBeenCalled();
    await expect(previewStoreExcel(db as never, 'store', workbook([['name'], ['A']]), { nameColumn: 8, language: 'ko' })).rejects.toMatchObject({ code: 'INVALID_COLUMNS' });
  });
  it('rejects oversized sheets rather than silently truncating them', () => {
    expect(() => readProductWorkbook(workbook([['상품명'], ...Array.from({ length: 2001 }, () => ['A'])]))).toThrow('TOO_MANY_PRODUCTS');
    expect(() => readProductWorkbook(Buffer.alloc(0))).toThrow('FILE_SIZE_LIMIT');
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
