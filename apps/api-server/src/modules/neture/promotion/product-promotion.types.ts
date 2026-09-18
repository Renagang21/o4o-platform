/**
 * Product Promotion Core — 계약 (소스 중립)
 *
 * WO-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-CORE-FOUNDATION-V1 §2.1
 * Baseline: docs/baseline/O4O-PRODUCT-CORE-BASELINE-V1.md §2 · §5 · §6 · §12
 *
 * ProductCandidate → ProductMaster / ProductIdentifier 승격의 공통 계층이 아는 것은
 * 제품군별 Adapter 가 만든 `ProductPromotionPlan` 뿐이다.
 *
 * Core 가 하지 않는 것:
 *   - 제품군 적격성 판단(의약품인가 · 허가 유효한가 · 자료를 믿을 수 있는가) → Adapter
 *   - regulatoryType 기반 분기 → 생성 후 불변식은 Adapter 가 `effects` 로 선언한다
 *   - identityKey 추론 → Adapter 가 데이터셋 의미에 따라 명시한다 (type 으로 하드코딩하지 않는다)
 *   - Offer 생성 · 매장 listing · 알림 · 권한 검사 · 유사도 매칭 · raw_payload 해석
 */

import type { ProductIdentifierType } from '../entities/ProductIdentifier.entity.js';

export const PROMOTION_REGULATORY_TYPES = [
  'GENERAL',
  'COSMETIC',
  'HEALTH_FUNCTIONAL',
  'QUASI_DRUG',
  'MEDICAL_DEVICE',
  'DRUG',
] as const;
export type PromotionRegulatoryType = (typeof PROMOTION_REGULATORY_TYPES)[number];

export const PROMOTION_DRUG_CATEGORIES = ['otc', 'rx', 'drug_unspecified', 'quasi_drug'] as const;
export type PromotionDrugCategory = (typeof PROMOTION_DRUG_CATEGORIES)[number];

export interface PromotionMasterFields {
  /** 영문 코드만. 한글 별칭('일반'·'의약품')은 Adapter 가 입력 단계에서 정규화한다 */
  regulatoryType: PromotionRegulatoryType;
  drugCategory: PromotionDrugCategory | null;
  /** 필수 · trim 후 비어 있으면 hold(name_missing). '(이름 미상)' 합성 금지 */
  name: string;
  /** 필수 · trim 후 비어 있으면 hold(manufacturer_missing). '미상' 합성 금지 */
  manufacturerName: string;
  specification: string | null;
  /** product_masters.barcode — GTIN-like 일 때만. 아니면 null(합성 금지) */
  barcode: string | null;
}

export interface PromotionIdentifierInput {
  type: ProductIdentifierType;
  value: string;
  isPrimary: boolean;
  /**
   * true  = Master dedup / link / conflict 판정에 사용한다.
   * false = 대상 Master 에 멱등 추가만 한다. 다른 Master 에 같은 값이 있어도 conflict 가 아니다
   *         (MFDS 코드 · 보험코드 · ATC · 공급자 자체 코드 · UNKNOWN 등 — 여러 포장단위 Master 가 공유 가능).
   * Adapter 가 데이터셋 의미에 따라 명시한다. Core 는 type 으로 추론하지 않는다.
   */
  identityKey: boolean;
  sourceType: string;
  sourceLabel: string | null;
  verificationStatus: string;
}

export interface PromotionEffects {
  /** create 시 ProductDrugExtension 보장. Adapter 가 선언 — Core 는 regulatoryType 을 보지 않는다 */
  ensureDrugExtension: boolean;
}

export interface ProductPromotionPlan {
  candidateId: string;
  master: PromotionMasterFields;
  identifiers: PromotionIdentifierInput[];
  dedupHints: {
    /** 이름+제조사 정확일치 dedup 사용 여부 */
    nameManufacturerExact: boolean;
  };
  effects: PromotionEffects;
  reviewedBy: string | null;
  note: string | null;
  /** candidate.raw_payload.approval 에 병합될 Adapter 고유 정보 */
  approvalMeta: Record<string, unknown>;
  /** 커밋 후 Landing 발급 source 라벨 (Adapter 가 자기 경로명을 넣는다) */
  landingSource?: string;
}

// ── 결과 ──

export type PromotionMatchType = 'barcode' | 'identifier' | 'name_manufacturer';

export interface PromotionMasterRef {
  id: string;
  name: string | null;
  barcode: string | null;
  manufacturerName: string | null;
  specification: string | null;
  regulatoryType: string | null;
  drugCategory: string | null;
}

export interface PromotionMatchedMaster extends PromotionMasterRef {
  matchType: PromotionMatchType;
}

export interface ExistingMasterDiff {
  nameDiffers: boolean;
  manufacturerDiffers: boolean;
  specificationDiffers: boolean;
  existing: { name: string | null; manufacturerName: string | null; specification: string | null };
  plan: { name: string; manufacturerName: string; specification: string | null };
}

export type PromotionConflictReason =
  | 'identifier_belongs_to_other_master'
  | 'barcode_belongs_to_other_master'
  | 'multiple_masters_match';

export type PromotionHoldReason =
  | 'name_missing'
  | 'manufacturer_missing'
  | 'rx_not_promotable'
  | 'regulatory_type_invalid'
  | 'drug_category_required'
  | 'identifier_invalid'
  | 'candidate_not_found'
  | 'candidate_not_reviewable'
  | 'candidate_already_linked';

export type PromotionOutcome =
  | { kind: 'create'; masterId: string; identifiersCreated: number }
  | { kind: 'link'; masterId: string; identifiersCreated: number; matchType: PromotionMatchType; existingMasterDiff: ExistingMasterDiff | null }
  | { kind: 'conflict'; reason: PromotionConflictReason; masters: PromotionMatchedMaster[] }
  | { kind: 'hold'; reason: PromotionHoldReason };

/** 순수 결정 계층이 쓰는, 정규화가 끝난 식별자 */
export interface NormalizedIdentifier extends PromotionIdentifierInput {
  normalized: string;
}

// ── port ──

export interface PromotionCandidateState {
  candidateStatus: string;
  matchedProductMasterId: string | null;
}

export interface PromotionReadStore {
  loadCandidateState(candidateId: string): Promise<PromotionCandidateState | null>;
  findMastersByBarcode(barcode: string): Promise<PromotionMasterRef[]>;
  /** 해당 (type, normalized) 식별자를 가진 Master 들 (여러 개일 수 있다 — 전역 UNIQUE 없음) */
  findMastersByIdentifier(type: ProductIdentifierType, normalized: string): Promise<PromotionMasterRef[]>;
  findMastersByNameManufacturer(name: string, manufacturerName: string): Promise<PromotionMasterRef[]>;
  /** 대상 Master 가 이미 가진 식별자 키 집합 (`${type}|${normalized}`) */
  findIdentifierKeysOfMaster(masterId: string): Promise<Set<string>>;
}

export interface PromotionWriteStore {
  createMaster(fields: PromotionMasterFields): Promise<string>;
  createIdentifier(masterId: string, identifier: NormalizedIdentifier): Promise<void>;
  updateCandidate(
    candidateId: string,
    patch: {
      matchedProductMasterId: string;
      candidateStatus: 'approved_new_master' | 'matched';
      reviewedBy: string | null;
      approval: Record<string, unknown>;
    },
  ): Promise<void>;
}

export type PromotionStore = PromotionReadStore & PromotionWriteStore;

export function identifierKey(type: string, normalized: string): string {
  return `${type}|${normalized}`;
}
