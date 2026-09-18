/**
 * store_web Promotion Adapter — 매장 신규 상품 요청(P2) 후보 → ProductPromotionPlan
 *
 * WO-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-CORE-FOUNDATION-V1 §2.2
 *
 * Adapter 책임:
 *   - candidateCategory / rawPayload.classification → (regulatoryType, drugCategory)  (P2 에서 이동 · 동작 불변)
 *   - 이름·제조사는 합성하지 않는다 → 비면 Core 가 hold 하고 여기서 CANDIDATE_FIELD_MISSING 으로 매핑
 *   - identityKey: 바코드류(GTIN/EAN13 등)만 true. `UNKNOWN`(비 GTIN 문자열)은 전역 제품 identity 가 아니므로 false
 *     — 이 판단은 store_web 데이터셋에 대한 Adapter 결정이지 Core 가 type 으로 추론한 것이 아니다.
 *   - effects.ensureDrugExtension: DRUG 로 확정했을 때 선언
 *   - Core 결과 → P2 기존 에러코드 매핑. link 는 자동 확정하지 않고 DUPLICATE_MASTER_EXISTS 로 되돌린다
 *     (운영자가 "기존 연결" 을 명시적으로 고르는 현행 UX 보존 · TX 롤백으로 candidate 불변)
 */

import type { ProductCandidate } from '../../entities/ProductCandidate.entity.js';
import type { ProductClassification } from '../../utils/product-type.util.js';
import {
  inferIdentifierTypeFromBarcode,
  isGtinLike,
  sanitizeIdentifierValue,
} from '../../utils/product-identifier.util.js';
import type {
  ProductPromotionPlan,
  PromotionDrugCategory,
  PromotionOutcome,
  PromotionRegulatoryType,
} from '../product-promotion.types.js';

export const STORE_REQUEST_SOURCE_LABEL = 'kpa-store-product-request';
export const STORE_REQUEST_LANDING_SOURCE = 'store-request-new-master';

/** 표준 분류 코드 → (regulatory_type, drug_category). classificationToFilter 의 역방향. (P2 에서 이동) */
export function classificationToRegulatory(code: string | null): { regulatoryType: PromotionRegulatoryType; drugCategory: PromotionDrugCategory | null } {
  switch (code) {
    case 'otc': return { regulatoryType: 'DRUG', drugCategory: 'otc' };
    case 'rx': return { regulatoryType: 'DRUG', drugCategory: 'rx' };
    // 'drug'(분류 미상 의약품): P2 는 drug_category NULL 로 만들었으나 Core 는 DRUG 에 drugCategory 를 요구한다.
    // DB 가 이미 쓰는 어휘 'drug_unspecified'(refine 가드 허용값) 로 명시한다.
    case 'drug': return { regulatoryType: 'DRUG', drugCategory: 'drug_unspecified' };
    case 'quasi': return { regulatoryType: 'QUASI_DRUG', drugCategory: null };
    case 'health_functional': return { regulatoryType: 'HEALTH_FUNCTIONAL', drugCategory: null };
    case 'medical_device': return { regulatoryType: 'MEDICAL_DEVICE', drugCategory: null };
    case 'cosmetic': return { regulatoryType: 'COSMETIC', drugCategory: null };
    case 'general': return { regulatoryType: 'GENERAL', drugCategory: null };
    default: return { regulatoryType: 'GENERAL', drugCategory: null };
  }
}

export function buildStoreWebPromotionPlan(
  candidate: Pick<ProductCandidate,
    'id' | 'candidateCategory' | 'rawPayload' | 'identifierValue' | 'candidateName' | 'candidateManufacturer' | 'candidateSpec' | 'candidateUnit'>,
  input: { reviewedBy?: string | null; note?: string | null },
): ProductPromotionPlan {
  const classificationCode = (candidate.candidateCategory
    || (candidate.rawPayload?.classification as string | undefined)
    || 'general') as ProductClassification;
  const { regulatoryType, drugCategory } = classificationToRegulatory(classificationCode);

  const rawBarcode = candidate.identifierValue ? sanitizeIdentifierValue(candidate.identifierValue) : '';
  const idType = rawBarcode ? inferIdentifierTypeFromBarcode(rawBarcode) : null;
  // product_masters.barcode 는 GTIN(8~14자리)만. 그 외는 NULL (합성 금지) — 식별자로만 보관.
  const masterBarcode = rawBarcode && isGtinLike(rawBarcode) ? rawBarcode : null;

  const specParts = [candidate.candidateSpec, candidate.candidateUnit].map((s) => (s ?? '').trim()).filter(Boolean);

  return {
    candidateId: candidate.id,
    master: {
      regulatoryType,
      drugCategory,
      name: (candidate.candidateName ?? '').trim(),
      manufacturerName: (candidate.candidateManufacturer ?? '').trim(),
      specification: specParts.length > 0 ? specParts.join(' ') : null,
      barcode: masterBarcode,
    },
    identifiers: rawBarcode && idType
      ? [{
          type: idType,
          value: candidate.identifierValue as string,
          isPrimary: masterBarcode !== null,
          identityKey: idType !== 'UNKNOWN',
          sourceType: 'store_web_request',
          sourceLabel: STORE_REQUEST_SOURCE_LABEL,
          verificationStatus: 'pharmacy_provided',
        }]
      : [],
    dedupHints: { nameManufacturerExact: true },
    effects: { ensureDrugExtension: regulatoryType === 'DRUG' },
    reviewedBy: input.reviewedBy ?? null,
    note: input.note ?? null,
    approvalMeta: { kind: 'new_master' },
    landingSource: STORE_REQUEST_LANDING_SOURCE,
  };
}

/** P2 응답의 duplicates 항목 (admin-dashboard 계약 — matchType 2값 유지) */
export interface StoreRequestDuplicate {
  id: string;
  name: string | null;
  barcode: string | null;
  manufacturerName: string | null;
  matchType: 'barcode' | 'name_manufacturer';
}

export class StoreRequestPromotionError extends Error {
  duplicates?: StoreRequestDuplicate[];
  constructor(code: string, duplicates?: StoreRequestDuplicate[]) {
    super(code);
    this.duplicates = duplicates;
  }
}

/**
 * Core 결과 → P2 에러. create 이외는 전부 throw 한다 (호출자 TX 롤백).
 *   link / conflict → DUPLICATE_MASTER_EXISTS (+duplicates)
 *   hold            → 기존 코드로 역매핑 · 이름/제조사 부족은 CANDIDATE_FIELD_MISSING(신설)
 */
export function assertStoreWebCreate(outcome: PromotionOutcome): asserts outcome is Extract<PromotionOutcome, { kind: 'create' }> {
  switch (outcome.kind) {
    case 'create':
      return;
    case 'link':
      throw new StoreRequestPromotionError('DUPLICATE_MASTER_EXISTS', [{
        id: outcome.masterId, name: null, barcode: null, manufacturerName: null,
        matchType: outcome.matchType === 'name_manufacturer' ? 'name_manufacturer' : 'barcode',
      }]);
    case 'conflict':
      throw new StoreRequestPromotionError('DUPLICATE_MASTER_EXISTS', outcome.masters.map((m) => ({
        id: m.id, name: m.name, barcode: m.barcode, manufacturerName: m.manufacturerName,
        // 'identifier' 축 일치는 dashboard 라벨 계약상 바코드 일치로 표기한다
        matchType: m.matchType === 'name_manufacturer' ? 'name_manufacturer' : 'barcode',
      })));
    case 'hold':
      throw new StoreRequestPromotionError(holdToStoreRequestCode(outcome.reason));
  }
}

export function holdToStoreRequestCode(reason: Extract<PromotionOutcome, { kind: 'hold' }>['reason']): string {
  switch (reason) {
    case 'rx_not_promotable': return 'RX_NEW_MASTER_BLOCKED';
    case 'candidate_not_reviewable': return 'STATUS_NOT_REVIEWABLE';
    case 'candidate_already_linked': return 'ALREADY_LINKED';
    case 'candidate_not_found': return 'STORE_REQUEST_NOT_FOUND';
    case 'name_missing':
    case 'manufacturer_missing':
      return 'CANDIDATE_FIELD_MISSING';
    default:
      return 'PROMOTION_PLAN_INVALID';
  }
}
