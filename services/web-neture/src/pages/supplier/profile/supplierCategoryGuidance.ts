import type { RegulatedCategory } from '../../../lib/api';

/**
 * 공급자 프로필 「공급 예정 품목군」 — 법정 영업 자격 · 품목 허가가 필요한 품목군만 고른다.
 *
 * - O4O 상품 카테고리와 무관하다. 백엔드 품목군 enum(일반 상품 · 식품 · 화장품 · 기타 포함)은 그대로 두고,
 *   공급자 화면에서만 아래 4개를 선택지로 보여 준다(2026-11-12 사용자 결정: 화장품 · 식품 제외, 선택만 받음).
 * - 선택은 서류 제출이 아니다. 서류 · 번호는 상품 등록 또는 운영자 확인 단계에서 안내된다.
 * - 안내 문구는 일반적인 법정 기준의 요약이다(약사법 · 의료기기법 · 건강기능식품에 관한 법률).
 *   세부 요건 판정은 관할 기관 확인이 정본이다.
 */
export const SUPPLIER_SELECTABLE_CATEGORIES = [
  'pharmaceutical',
  'quasi_drug',
  'medical_device',
  'health_functional_food',
] as const satisfies readonly RegulatedCategory[];

export type SupplierSelectableCategory = (typeof SUPPLIER_SELECTABLE_CATEGORIES)[number];

export interface SupplierCategoryGuidance {
  /** 공급하려면 공급자에게 필요한 영업 자격(역할별) */
  qualification: string;
  /** 상품 등록 때 제품마다 필요한 것 */
  productDocuments: string;
}

export const SUPPLIER_CATEGORY_GUIDANCE: Record<SupplierSelectableCategory, SupplierCategoryGuidance> = {
  pharmaceutical: {
    qualification:
      '약국에 공급하려면 의약품 도매상 허가가 필요합니다. 제조사는 의약품 제조업 허가, 수입사는 수입자 신고를 갖춰야 합니다.',
    productDocuments: '제품별 품목허가 · 신고 번호',
  },
  quasi_drug: {
    qualification:
      '유통 · 판매만 하는 경우 별도 영업 자격은 필요하지 않습니다. 직접 제조하면 의약외품 제조업 신고, 수입하면 수입자 신고가 필요합니다.',
    productDocuments: '제품별 품목허가 · 신고 번호',
  },
  medical_device: {
    qualification:
      '유통 공급자는 의료기기 판매업 신고가 필요합니다(의약품 도매상은 신고 면제). 제조사는 제조업 허가, 수입사는 수입업 허가를 갖춰야 합니다.',
    productDocuments: '제품별 품목허가 · 인증 · 신고 번호(등급에 따라 다름)',
  },
  health_functional_food: {
    qualification:
      '유통 공급자는 건강기능식품 판매업 신고가 필요합니다. 제조사는 제조업 허가, 수입사는 수입업 신고를 갖춰야 합니다.',
    productDocuments: '제품별 품목제조신고 또는 수입신고 번호',
  },
};

export function isSupplierSelectableCategory(category: string): category is SupplierSelectableCategory {
  return (SUPPLIER_SELECTABLE_CATEGORIES as readonly string[]).includes(category);
}
