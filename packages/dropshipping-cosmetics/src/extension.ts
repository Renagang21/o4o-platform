/**
 * Dropshipping Cosmetics Extension
 *
 * Dropshipping Core Extension으로 등록되어 화장품 관련 검증을 수행합니다.
 *
 * 핵심 역할:
 * - productType = 'cosmetics' 상품에 대한 특화 검증
 * - 화장품 메타데이터 검증 (성분, 피부타입, 인증 등)
 * - 화장품 특화 Offer/Listing 정책 적용
 *
 * @package @o4o/dropshipping-cosmetics
 */

import type {
  DropshippingCoreExtension,
  OfferCreationContext,
  ListingCreationContext,
  OrderCreationContext,
  ValidationResult,
} from '@o4o/dropshipping-core';

/**
 * 화장품 메타데이터 타입
 */
interface CosmeticsMetadata {
  skinType?: string[];
  concerns?: string[];
  certifications?: string[];
  productCategory?: string;
  ingredients?: Array<{ name: string; description?: string; percentage?: number }>;
  routineInfo?: {
    timeOfUse?: string[];
    step?: string;
    orderInRoutine?: number;
  };
  contraindications?: string;
  texture?: string;
  volume?: string;
  expiryPeriod?: string;
}

/**
 * Cosmetics Extension Implementation
 *
 * productType = 'cosmetics' 상품에 대한 특화 검증을 수행합니다.
 * 화장품 관련 규정 및 안전 기준을 검증합니다.
 */
export const cosmeticsExtension: DropshippingCoreExtension = {
  appId: 'dropshipping-cosmetics',
  displayName: '화장품 Dropshipping',
  version: '1.0.0',

  // Cosmetics Extension은 'cosmetics' productType만 처리
  supportedProductTypes: ['cosmetics'],

  /**
   * Offer 생성 검증 (화장품 특화)
   *
   * 화장품 Offer 생성 시 필수 메타데이터 검증:
   * - 피부 타입 정보
   * - 제품 카테고리
   * - 성분 정보 (선택적이지만 권장)
   */
  async validateOfferCreation(context: OfferCreationContext): Promise<ValidationResult> {
    const errors: Array<{ code: string; message: string; field?: string }> = [];
    const warnings: Array<{ code: string; message: string; field?: string }> = [];

    // cosmetics productType이 아니면 패스
    if (context.productType !== 'cosmetics') {
      return { valid: true, errors: [] };
    }

    const metadata = context.metadata as CosmeticsMetadata | undefined;

    // 1. 제품 카테고리 필수 확인
    if (!metadata?.productCategory) {
      errors.push({
        code: 'COSMETICS_CATEGORY_REQUIRED',
        message: '화장품 제품 카테고리를 선택해주세요.',
        field: 'metadata.productCategory',
      });
    }

    // 2. 피부 타입 권장 (경고)
    if (!metadata?.skinType || metadata.skinType.length === 0) {
      warnings.push({
        code: 'COSMETICS_SKIN_TYPE_RECOMMENDED',
        message: '피부 타입을 지정하면 고객 추천에 더 잘 노출됩니다.',
        field: 'metadata.skinType',
      });
    }

    // 3. 성분 정보 권장 (경고)
    if (!metadata?.ingredients || metadata.ingredients.length === 0) {
      warnings.push({
        code: 'COSMETICS_INGREDIENTS_RECOMMENDED',
        message: '성분 정보를 입력하면 성분 검색에 노출됩니다.',
        field: 'metadata.ingredients',
      });
    }

    // 4. 유통기한 정보 권장 (경고)
    if (!metadata?.expiryPeriod) {
      warnings.push({
        code: 'COSMETICS_EXPIRY_RECOMMENDED',
        message: '개봉 후 사용 기한 정보를 입력해주세요.',
        field: 'metadata.expiryPeriod',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  },

  /**
   * Listing 생성 검증 (화장품 특화)
   *
   * 화장품 Listing 생성 시 추가 검증:
   * - 화장품 판매 라이센스 확인 (있는 경우)
   * - 성분 정보 완성도 확인
   */
  async validateListingCreation(context: ListingCreationContext): Promise<ValidationResult> {
    const errors: Array<{ code: string; message: string; field?: string }> = [];
    const warnings: Array<{ code: string; message: string; field?: string }> = [];

    // cosmetics productType이 아니면 패스
    if (context.productType !== 'cosmetics') {
      return { valid: true, errors: [] };
    }

    const metadata = context.metadata as CosmeticsMetadata | undefined;

    // 1. Listing 전 필수 메타데이터 재확인
    if (!metadata?.productCategory) {
      errors.push({
        code: 'COSMETICS_LISTING_CATEGORY_REQUIRED',
        message: '화장품 Listing에는 제품 카테고리가 필수입니다.',
        field: 'metadata.productCategory',
      });
    }

    // 2. 피부 고민(concerns) 정보 확인
    if (!metadata?.concerns || metadata.concerns.length === 0) {
      warnings.push({
        code: 'COSMETICS_CONCERNS_RECOMMENDED',
        message: '피부 고민 정보를 입력하면 맞춤 추천에 활용됩니다.',
        field: 'metadata.concerns',
      });
    }

    // 3. 인증 정보 확인 (권장)
    if (!metadata?.certifications || metadata.certifications.length === 0) {
      warnings.push({
        code: 'COSMETICS_CERTIFICATIONS_RECOMMENDED',
        message: '제품 인증 정보(비건, EWG 등)를 입력하면 신뢰도가 높아집니다.',
        field: 'metadata.certifications',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  },

  /**
   * Order 생성 검증 (화장품 특화)
   *
   * 화장품 주문 시 특별한 제한은 없으나,
   * 향후 성분 알레르기 경고 등을 추가할 수 있음
   */
  async validateOrderCreation(context: OrderCreationContext): Promise<ValidationResult> {
    const warnings: Array<{ code: string; message: string; field?: string }> = [];

    // cosmetics productType이 아니면 패스
    if (context.productType !== 'cosmetics') {
      return { valid: true, errors: [] };
    }

    // 화장품은 기본적으로 모든 주문 허용
    // 향후 성분 알레르기 경고, 나이 제한 등 추가 가능

    return {
      valid: true,
      errors: [],
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  },

  /**
   * Extension 활성화 시 호출
   */
  async onActivate(): Promise<void> {
    console.log('[dropshipping-cosmetics] Extension activated');
    console.log('[dropshipping-cosmetics] Cosmetics-specific validation hooks enabled');
  },

  /**
   * Extension 비활성화 시 호출
   */
  async onDeactivate(): Promise<void> {
    console.log('[dropshipping-cosmetics] Extension deactivated');
  },
};

export default cosmeticsExtension;
