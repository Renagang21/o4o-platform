/**
 * Product Type Filter Utility
 *
 * 파트너 프로그램에서 허용/제외되는 제품 타입을 중앙에서 관리합니다.
 *
 * PHARMACEUTICAL 제품은 파트너 프로그램에서 제외됩니다.
 * COSMETICS, HEALTH, GENERAL 제품만 파트너 프로그램에 참여할 수 있습니다.
 *
 * @package @o4o/partner-core
 */

/**
 * 파트너 프로그램 허용 제품 타입
 */
export const PARTNER_ALLOWED_PRODUCT_TYPES = [
  'cosmetics',
  'health',
  'general',
] as const;

/**
 * 파트너 프로그램 제외 제품 타입
 */
export const PARTNER_EXCLUDED_PRODUCT_TYPES = [
  'pharmaceutical',
] as const;

export type PartnerAllowedProductType = (typeof PARTNER_ALLOWED_PRODUCT_TYPES)[number];
export type PartnerExcludedProductType = (typeof PARTNER_EXCLUDED_PRODUCT_TYPES)[number];
export type ProductType = PartnerAllowedProductType | PartnerExcludedProductType | string;

/**
 * 제품 타입이 파트너 프로그램에 참여 가능한지 검증
 *
 * @param productType 검증할 제품 타입
 * @returns 참여 가능 여부
 */
export function isPartnerEligibleProductType(
  productType: string | undefined | null
): boolean {
  if (!productType) return false;

  const normalized = productType.toLowerCase().trim();

  // 제외 타입 확인
  if (PARTNER_EXCLUDED_PRODUCT_TYPES.includes(normalized as PartnerExcludedProductType)) {
    return false;
  }

  // 허용 타입 확인
  return PARTNER_ALLOWED_PRODUCT_TYPES.includes(normalized as PartnerAllowedProductType);
}

/**
 * 제품 타입이 파트너 프로그램에서 제외되는지 검증
 *
 * @param productType 검증할 제품 타입
 * @returns 제외 여부
 */
export function isPartnerExcludedProductType(
  productType: string | undefined | null
): boolean {
  if (!productType) return false;

  const normalized = productType.toLowerCase().trim();
  return PARTNER_EXCLUDED_PRODUCT_TYPES.includes(normalized as PartnerExcludedProductType);
}

/**
 * 제품 타입이 약국 관련 타입인지 검증
 *
 * @param productType 검증할 제품 타입
 * @returns 약국 관련 여부
 */
export function isPharmaceuticalProductType(
  productType: string | undefined | null
): boolean {
  if (!productType) return false;

  const normalized = productType.toLowerCase().trim();
  return normalized === 'pharmaceutical';
}

/**
 * 파트너 프로그램용 제품 타입 검증 결과
 */
export interface ProductTypeValidationResult {
  isValid: boolean;
  productType: string;
  isAllowed: boolean;
  isExcluded: boolean;
  reason?: string;
}

/**
 * 제품 타입에 대한 상세 검증 결과 반환
 *
 * @param productType 검증할 제품 타입
 * @returns 상세 검증 결과
 */
export function validateProductTypeForPartner(
  productType: string | undefined | null
): ProductTypeValidationResult {
  if (!productType) {
    return {
      isValid: false,
      productType: '',
      isAllowed: false,
      isExcluded: false,
      reason: 'Product type is required',
    };
  }

  const normalized = productType.toLowerCase().trim();

  // 제외 타입 확인
  if (PARTNER_EXCLUDED_PRODUCT_TYPES.includes(normalized as PartnerExcludedProductType)) {
    return {
      isValid: false,
      productType: normalized,
      isAllowed: false,
      isExcluded: true,
      reason: `Product type '${normalized}' is excluded from partner program`,
    };
  }

  // 허용 타입 확인
  if (PARTNER_ALLOWED_PRODUCT_TYPES.includes(normalized as PartnerAllowedProductType)) {
    return {
      isValid: true,
      productType: normalized,
      isAllowed: true,
      isExcluded: false,
    };
  }

  // 알 수 없는 타입
  return {
    isValid: false,
    productType: normalized,
    isAllowed: false,
    isExcluded: false,
    reason: `Product type '${normalized}' is not recognized for partner program`,
  };
}

/**
 * 제품 목록에서 파트너 프로그램 허용 제품만 필터링
 *
 * @param items 제품 목록
 * @param getProductType 제품에서 타입을 추출하는 함수
 * @returns 필터링된 제품 목록
 */
export function filterPartnerEligibleProducts<T>(
  items: T[],
  getProductType: (item: T) => string | undefined | null
): T[] {
  return items.filter((item) => isPartnerEligibleProductType(getProductType(item)));
}

/**
 * 제품 목록에서 제외 제품만 필터링
 *
 * @param items 제품 목록
 * @param getProductType 제품에서 타입을 추출하는 함수
 * @returns 제외된 제품 목록
 */
export function filterPartnerExcludedProducts<T>(
  items: T[],
  getProductType: (item: T) => string | undefined | null
): T[] {
  return items.filter((item) => isPartnerExcludedProductType(getProductType(item)));
}

/**
 * 제품 타입별 통계
 */
export interface ProductTypeStats {
  total: number;
  byType: Record<string, number>;
  allowed: number;
  excluded: number;
}

/**
 * 제품 목록의 타입별 통계 계산
 *
 * @param items 제품 목록
 * @param getProductType 제품에서 타입을 추출하는 함수
 * @returns 타입별 통계
 */
export function getProductTypeStats<T>(
  items: T[],
  getProductType: (item: T) => string | undefined | null
): ProductTypeStats {
  const byType: Record<string, number> = {};
  let allowed = 0;
  let excluded = 0;

  for (const item of items) {
    const productType = getProductType(item);
    if (!productType) continue;

    const normalized = productType.toLowerCase().trim();
    byType[normalized] = (byType[normalized] || 0) + 1;

    if (isPartnerEligibleProductType(normalized)) {
      allowed++;
    } else if (isPartnerExcludedProductType(normalized)) {
      excluded++;
    }
  }

  return {
    total: items.length,
    byType,
    allowed,
    excluded,
  };
}

/**
 * 허용 타입 목록 반환
 */
export function getAllowedProductTypes(): string[] {
  return [...PARTNER_ALLOWED_PRODUCT_TYPES];
}

/**
 * 제외 타입 목록 반환
 */
export function getExcludedProductTypes(): string[] {
  return [...PARTNER_EXCLUDED_PRODUCT_TYPES];
}
