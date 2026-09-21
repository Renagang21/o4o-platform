/**
 * Supplier Promotion Adapter — regulatory_type canonicalization
 *
 * WO-O4O-SUPPLIER-PRODUCT-CANDIDATE-PROMOTION-ADAPTER-V1 §2.2 (assertSupplierPolicy 입력 정규화)
 *
 * product_masters.regulatory_type 에는 영문 코드 외에 한글 별칭이 남아 있다
 * (운영 실측: '건강기능식품' 40,948 · '일반' 15). 정책 판정은 표시용 분류(classifyProductType 등)가 아니라
 * canonical regulatoryType 으로만 한다. 여기 없는 값은 null = mismatch 로 취급한다 (임의 변환 금지).
 */

import type { PromotionRegulatoryType } from '../../product-promotion.types.js';

const ALIASES: Record<string, PromotionRegulatoryType> = {
  general: 'GENERAL', '일반': 'GENERAL',
  cosmetic: 'COSMETIC', '화장품': 'COSMETIC',
  health_functional: 'HEALTH_FUNCTIONAL', '건강기능식품': 'HEALTH_FUNCTIONAL',
  quasi_drug: 'QUASI_DRUG', quasi: 'QUASI_DRUG', '의약외품': 'QUASI_DRUG',
  medical_device: 'MEDICAL_DEVICE', '의료기기': 'MEDICAL_DEVICE',
  drug: 'DRUG', '의약품': 'DRUG',
};

/** 영문 코드(대소문자 무관) · 한글 별칭 → canonical. 그 외 · 빈 값 → null */
export function canonicalizeRegulatoryType(raw: string | null | undefined): PromotionRegulatoryType | null {
  if (raw == null) return null;
  const key = String(raw).trim().toLowerCase();
  if (!key) return null;
  return ALIASES[key] ?? null;
}
