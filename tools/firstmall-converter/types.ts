/**
 * WO-NETURE-FIRSTMALL-CONVERTER-V1
 * Type definitions for FirstMall → O4O CSV conversion
 */

/** Raw row from FirstMall Excel export */
export interface FirstMallRow {
  상품번호?: number | string;
  카테고리?: string;
  브랜드?: string;
  상태?: string;
  노출?: string;
  상품기본코드?: string;
  상품명?: string;
  간략설명?: string;
  검색어?: string;
  추가정보?: string;
  매입가?: number | string;
  정가?: number | string;
  '할인가(판매가)'?: number | string;
  필수옵션재고?: number | string;
  상품상세이미지?: string;
  리스트이미지1?: string;
  [key: string]: unknown;
}

/** O4O CSV Import row (matches CSV template) */
export interface O4ORow {
  barcode: string;
  marketing_name: string;
  supply_price: number;
  distribution_type: string;
  manufacturer_name: string;
  consumer_short_description: string;
  msrp: string;
  stock_qty: string;
  brand: string;
  image_url: string;
}

/** Conversion statistics */
export interface ConversionStats {
  totalInput: number;
  converted: number;
  skipped: number;
  zeroPriceCount: number;
  noNameCount: number;
}
