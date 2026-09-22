/**
 * Supplier Product Authoring — 외부 LLM(ChatGPT/Astra 등) 작업 계약 타입
 *
 * WO-O4O-SUPPLIER-PRODUCT-AI-ASSISTED-CANDIDATE-AUTHORING-V1 §2.1 · §2.2
 *
 * 원칙:
 *   - O4O 는 Prompt · Reference · Output Contract · Apply · Save 만 담당한다.
 *     제품 분석·정리는 사용자의 외부 LLM 이 수행한다(내부 AI endpoint 호출 0).
 *   - 출력 계약은 서버 Candidate 계약(POST /supplier/product-candidates) 과 같은 키만 쓴다.
 *   - AI 결과는 Draft 일 뿐이다. ProductMaster / Offer 를 만들지 않고 masterId · supplierId 를 지정하지 못한다.
 *   - 이 폴더는 API · React · router 의존이 없다(순수 함수 + 타입). 후속 WebMCP 가 그대로 재사용한다.
 */

export const SUPPLIER_CANDIDATE_REGULATORY_TYPES = [
  'GENERAL',
  'COSMETIC',
  'HEALTH_FUNCTIONAL',
  'QUASI_DRUG',
  'MEDICAL_DEVICE',
  'DRUG',
] as const;
export type SupplierCandidateRegulatoryType = (typeof SUPPLIER_CANDIDATE_REGULATORY_TYPES)[number];

/** 자료 출처 종류 — Prompt 의 안내 문구만 바뀐다. O4O 는 자료 자체를 LLM 에 보내지 않는다. */
export type SupplierProductSourceKind = 'manual' | 'image' | 'pdf' | 'url' | 'import';

/**
 * 외부 LLM 출력 계약 — JSON 1개.
 * 서버 Candidate body 와 키가 같다. `categoryId · brandId · drugCategory · imageUrl · contentImageUrls` 는
 * 계약에 남겨 두되 AI 는 항상 null/[] 로 두어야 하며, 파서는 값이 와도 무시한다(§2.3).
 */
export interface SupplierProductCandidateDraft {
  name: string | null;
  barcode: string | null;
  categoryId: null;
  brandId: null;
  brandName: string | null;
  manufacturerName: string | null;
  specification: string | null;
  originCountry: string | null;
  regulatoryType: SupplierCandidateRegulatoryType | null;
  drugCategory: null;
  regulatoryName: string | null;
  mfdsPermitNumber: string | null;
  imageUrl: null;
  contentImageUrls: [];
  offerDraft: {
    priceGeneral: number | null;
    consumerReferencePrice: number | null;
    consumerShortDescription: string | null;
    consumerDetailDescription: string | null;
    isFeatured: boolean;
  };
}

/** Prompt 조립 입력 — 현재 화면에 이미 있는 값만 넘긴다. 빌더 안에서 API 를 부르지 않는다. */
export interface SupplierProductAuthoringContext {
  /** 진입 화면에서 고른 제품 유형 라벨(예: 비의약품 · 비처방 의약품) — 있으면 그대로 표기 */
  productTypeLabel?: string | null;
  /** 규제 구분 힌트 */
  regulatoryType?: SupplierCandidateRegulatoryType | string | null;
  /** 화면에 이미 입력된 값(참고용 · 비어 있으면 생략) */
  currentDraft?: Partial<SupplierProductCandidateDraft> | null;
  sourceKind?: SupplierProductSourceKind | null;
  /** sourceKind='url' 일 때 제품 상세 URL */
  sourceUrl?: string | null;
  /** PDF 파일명 · 자료 설명 정도(원문 첨부 X) */
  sourceLabel?: string | null;
  /** 사용자가 복사 직전에 적은 짧은 추가 요청 */
  additionalInstruction?: string | null;
}

/** 파서 결과 — 실패 시 어떤 값도 화면에 적용하지 않는다(write 0). */
export type ParseSupplierProductCandidateDraftResult =
  | { ok: true; draft: SupplierProductCandidateDraft; warnings: string[] }
  | { ok: false; code: 'EMPTY' | 'INVALID_JSON' | 'NOT_OBJECT'; error: string };
