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
 * 동적 상세설명 소스 (WO-O4O-NETURE-SUPPLIER-IMPORT-ASSISTANT-DYNAMIC-DETAIL-CONTENTS-DETECTION-V1)
 *
 * Firstmall 계열 상품 페이지는 상세설명 이미지를 기본 HTML 에 두지 않고
 * 로딩 후 AJAX(`/goods/view_contents?...`) 로 가져온다. 붙여넣은 HTML 안에서
 * 그 주소를 탐지하면 이 객체를 채워 사용자에게 "원본 가져오기" 를 안내한다.
 */
export interface DynamicDetailSource {
  /** 탐지한 원본 속성값 (resolve 이전 — 상대주소일 수 있음) */
  rawUrl: string;
  /** sourceUrl / og:url / canonical 기준 절대 URL (resolve 불가 시 null) */
  resolvedUrl: string | null;
  /** 탐지 근거 */
  reason: 'ajax' | 'original-link';
  /** 상세설명 컨테이너(goods_view_contents 등)가 비어 있는지 (추가 신호) */
  containerEmpty: boolean;
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
  /**
   * 상세설명 이미지 후보 (additive — 기존 필드 불변).
   * 원본 페이지 DOM 순서, 중복/대표 썸네일/추적 픽셀 제외.
   */
  detailImageCandidates: DetailImageCandidate[];
  /**
   * 동적 상세설명 소스 (WO-...-DYNAMIC-DETAIL-CONTENTS-DETECTION-V1).
   * 상세설명을 별도 주소(AJAX)에서 불러오는 페이지면 채워진다. 아니면 null.
   */
  dynamicDetailSource: DynamicDetailSource | null;
}
