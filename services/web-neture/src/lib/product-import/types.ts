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
  /** canvas 보정 후 data URL (CORS 허용 이미지에만 생성됨) */
  thumbnailCorrectedDataUrl?: string;
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

/**
 * 상세설명 이미지 후보 (WO-O4O-NETURE-SUPPLIER-PRODUCT-IMPORT-ASSISTANT-DETAIL-IMAGE-IMPORT-V1)
 * 외부 상품 페이지 본문의 상세설명 이미지 후보. 원본 페이지 DOM 표시 순서대로 제공한다.
 */
export interface DetailImageCandidate {
  /** 절대 URL (resolveUrl 적용) */
  url: string;
  /** 추출에 사용한 원본 속성값 (src/data-src/srcset 등 — resolve 이전) */
  originalUrl: string;
  /** img alt (없으면 null) */
  alt: string | null;
  /** width 속성으로 확인 가능한 경우 (없으면 null — DOMParser 는 실제 크기 미로드) */
  width: number | null;
  /** height 속성으로 확인 가능한 경우 (없으면 null) */
  height: number | null;
  /** 원본 페이지 순서 (1-based) */
  order: number;
}

/**
 * Firstmall 관리자 상품 추출 결과
 * WO-O4O-NETURE-SUPPLIER-OWN-ADMIN-PRODUCT-IMPORT-V1
 */
export interface FirstmallSubInfo {
  label: string;
  value: string;
}

export interface FirstmallAdminProduct {
  goodsSeq: string | null;
  name: string | null;
  summary: string | null;
  keyword: string | null;
  manufacturer: string | null;
  originCountry: string | null;
  /** 직접입력 추가정보 (제조사/원산지 포함 전체 pair) */
  subInfo: FirstmallSubInfo[];
  /** 대표·갤러리 이미지 (절대 URL) */
  productImageUrls: string[];
  /** 상세설명 HTML (sanitize 후, img 절대화) */
  detailHtml: string | null;
  /** 상세설명 이미지 (절대 URL) */
  detailImageUrls: string[];
  /** 상대 URL 절대화에 사용한 쇼핑몰 base origin */
  shopDomain: string | null;
  warnings: string[];
}

/** 등록 도우미 내부 상품 표시 모델 (관리자 추출 결과를 매핑) */
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
  /** 상세설명 이미지 후보 (원본 순서) */
  detailImageCandidates: DetailImageCandidate[];
}
