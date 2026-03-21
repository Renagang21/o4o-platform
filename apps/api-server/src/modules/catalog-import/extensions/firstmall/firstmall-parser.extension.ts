/**
 * Firstmall Excel Parser Extension
 *
 * Firstmall 관리자 Excel Export → NormalizedProduct[] parser
 * Korean header mapping: 상품명, 바코드, 브랜드, 제조사, 판매가, 상품코드, 이미지
 *
 * WO-O4O-CATALOG-IMPORT-APP-IMPLEMENTATION-V1
 * WO-NETURE-FIRSTMALL-BASIC-BULK-IMPORT-ENABLEMENT-V1
 *   - 소비자가/재고수량/상품설명 헤더 매핑 추가
 *   - 옵션 상품 감지 (hasOptions)
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
  // WO-NETURE-FIRSTMALL-BASIC-BULK-IMPORT-ENABLEMENT-V1
  '소비자가': 'msrp',
  '정가': 'msrp',
  '시중가': 'msrp',
  '재고수량': 'stockQty',
  '재고': 'stockQty',
  '상품설명': 'description',
  '설명': 'description',
  '간략설명': 'description',
};

const IMAGE_HEADER_PREFIXES = ['이미지', '대표이미지', '상세이미지', '추가이미지'];

/** 옵션 관련 헤더 프리픽스 — 이 컬럼에 데이터가 있으면 옵션 상품 */
const OPTION_HEADER_PREFIXES = ['필수옵션', '추가옵션', '옵션명', '옵션값', '옵션'];

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

    // Pre-identify option-related headers
    const optionHeaders = headers.filter(h =>
      OPTION_HEADER_PREFIXES.some(p => h.trim().startsWith(p)),
    );

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

      // WO-NETURE-FIRSTMALL-BASIC-BULK-IMPORT-ENABLEMENT-V1 — 신규 필드 파싱
      const msrpStr = mapped.msrp || '';
      const msrp = msrpStr ? parseInt(msrpStr.replace(/[,\s]/g, ''), 10) || null : null;

      const stockQtyStr = mapped.stockQty || '';
      const stockQty = stockQtyStr ? parseInt(stockQtyStr.replace(/[,\s]/g, ''), 10) || null : null;

      const description = mapped.description || null;

      // 옵션 상품 감지: 옵션 헤더에 데이터가 있으면 hasOptions = true
      const hasOptions = optionHeaders.some(h => {
        const val = String(raw[h] ?? '').trim();
        return val.length > 0;
      });

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
        msrp,
        stockQty,
        description,
        hasOptions,
      };
    });
  },
};
