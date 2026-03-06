/**
 * Firstmall Excel Parser Extension
 *
 * Firstmall 관리자 Excel Export → NormalizedProduct[] parser
 * Korean header mapping: 상품명, 바코드, 브랜드, 제조사, 판매가, 상품코드, 이미지
 *
 * WO-O4O-CATALOG-IMPORT-APP-IMPLEMENTATION-V1
 */

import * as XLSX from 'xlsx';
import type { CatalogParserExtension, NormalizedProduct } from '../../types/catalog-import.types.js';

const HEADER_MAP: Record<string, string> = {
  '상품명': 'productName',
  '바코드': 'barcode',
  '브랜드': 'brandName',
  '제조사': 'manufacturerName',
  '판매가': 'price',
  '상품코드': 'supplierSku',
  '분류': 'category',
  '카테고리': 'category',
};

const IMAGE_HEADER_PREFIXES = ['이미지', '대표이미지', '상세이미지', '추가이미지'];

export const firstmallParserExtension: CatalogParserExtension = {
  extensionKey: 'firstmall',

  parse(buffer: Buffer, _originalname: string): NormalizedProduct[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('FIRSTMALL_EMPTY_WORKBOOK: No sheets found');
    }

    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    });

    if (rawRows.length === 0) {
      return [];
    }

    // Detect headers from first row keys
    const headers = Object.keys(rawRows[0]);

    return rawRows.map((raw, index) => {
      const mapped: Record<string, string> = {};
      const imageUrls: string[] = [];

      for (const header of headers) {
        const trimmedHeader = header.trim();
        const mappedKey = HEADER_MAP[trimmedHeader];

        if (mappedKey) {
          mapped[mappedKey] = String(raw[header] ?? '').trim();
        }

        // Extract image URLs from columns starting with image-related prefixes
        if (IMAGE_HEADER_PREFIXES.some(p => trimmedHeader.startsWith(p))) {
          const url = String(raw[header] ?? '').trim();
          if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            imageUrls.push(url);
          }
        }
      }

      const priceStr = mapped.price || '';
      const price = priceStr ? parseInt(priceStr.replace(/[,\s]/g, ''), 10) || null : null;

      return {
        rowNumber: index + 1,
        rawData: raw as Record<string, unknown>,
        barcode: mapped.barcode || null,
        productName: mapped.productName || null,
        brandName: mapped.brandName || null,
        manufacturerName: mapped.manufacturerName || null,
        regulatoryName: mapped.productName || null,
        regulatoryType: null,
        price,
        distributionType: 'PRIVATE',
        supplierSku: mapped.supplierSku || null,
        imageUrls,
        metadata: mapped.category ? { firstmallCategory: mapped.category } : {},
      };
    });
  },
};
