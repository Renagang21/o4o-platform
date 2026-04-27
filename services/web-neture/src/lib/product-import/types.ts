/**
 * WO-O4O-PRODUCT-IMPORT-ASSISTANT-V1
 *
 * Import Assistant → 상품 등록 페이지 간 데이터 전달 타입
 */

export interface ImportDraft {
  // Step 1 fields
  marketingName: string;
  brandName: string;
  manufacturerName: string;

  // Step 3 fields
  specification: string;
  originCountry: string;

  // Price (string — 기존 form과 동일)
  consumerReferencePrice: string;

  // Descriptions (HTML)
  consumerShortDesc: string;
  consumerDetailDesc: string;

  // Images (external URLs)
  thumbnailUrl: string | null;
  detailImageUrls: string[];
  contentImageUrls: string[];

  // Metadata
  sourceUrl: string;
  importedAt: string; // ISO timestamp

  // O4O 등록 설정 (WO-O4O-SUPPLIER-IMPORT-O4O-SETTINGS-STEP-V1)
  categoryId?: string;
  priceGeneral?: string;
  isPublic?: boolean;
  serviceKeys?: string[];
  regulatoryType?: string;
}

/** parseProductHtml 반환 타입 */
export interface ParsedProductData {
  name: string | null;
  brand: string | null;
  manufacturer: string | null;
  price: number | null;
  specification: string | null;
  originCountry: string | null;
  thumbnailUrl: string | null;
  imageUrls: string[];
  shortDescription: string | null;
  detailDescription: string | null;
}
