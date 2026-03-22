/**
 * FirstMall → O4O column mapper
 *
 * Maps FirstMall Excel columns to O4O CSV Import template.
 */

import { generateBarcode } from './barcode.js';
import type { FirstMallRow, O4ORow } from './types.js';

/**
 * Parse a Korean-formatted price string (e.g. "42,000.00", "42000", 42000)
 * Returns integer (원 단위) or 0
 */
function parsePrice(value: unknown): number {
  if (value == null || value === '') return 0;
  const str = String(value).replace(/,/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.round(num);
}

/**
 * Extract manufacturer from 추가정보 field
 * Format: "제조사=ABC^원산지=한국^..." (caret-separated key=value pairs)
 */
function extractManufacturer(text: unknown): string {
  if (!text || typeof text !== 'string') return '';
  const match = text.match(/제조사=([^^]+)/);
  return match ? match[1].trim() : '';
}

/**
 * Determine supply_price with fallback chain:
 * 매입가 > 할인가(판매가) > 정가
 * If all zero, use 정가 (even if 0, the CSV validator will handle it)
 */
function resolveSupplyPrice(row: FirstMallRow): number {
  const cost = parsePrice(row['매입가']);
  if (cost > 0) return cost;

  const selling = parsePrice(row['할인가(판매가)']);
  if (selling > 0) return selling;

  return parsePrice(row['정가']);
}

/**
 * Map a single FirstMall row to O4O CSV format
 */
export function mapRow(row: FirstMallRow): O4ORow | null {
  const name = row['상품명'];
  if (!name || String(name).trim() === '') return null;

  const code = row['상품기본코드'] || row['상품번호'];
  if (!code) return null;

  const supplyPrice = resolveSupplyPrice(row);
  const msrp = parsePrice(row['정가']);

  return {
    barcode: generateBarcode(`${code}::${String(name).trim()}`),
    marketing_name: String(name).trim(),
    supply_price: supplyPrice,
    distribution_type: 'PRIVATE',
    manufacturer_name: extractManufacturer(row['추가정보']),
    consumer_short_description: row['간략설명'] ? String(row['간략설명']).trim() : '',
    msrp: msrp > 0 ? String(msrp) : '',
    stock_qty: row['필수옵션재고'] != null ? String(Math.round(Number(row['필수옵션재고']) || 0)) : '',
    brand: row['브랜드'] ? String(row['브랜드']).trim() : '',
    image_url: '', // FirstMall images are relative paths — skip for now
  };
}
