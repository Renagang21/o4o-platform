/**
 * Dropshipping Cosmetics Extension
 *
 * Phase 9-C: Core v2 정렬 완료
 * - before/after hooks 패턴 사용
 * - ProductType.COSMETICS enum 사용
 * - Core Validation Hook 시스템 통합
 *
 * 핵심 역할:
 * - productType = COSMETICS 상품에 대한 특화 검증
 * - 화장품 메타데이터 검증 (성분, 피부타입, 인증 등)
 * - 화장품 특화 Offer/Listing/Order 정책 적용
 *
 * @package @o4o/dropshipping-cosmetics
 */

import { ProductType } from '@o4o/dropshipping-core';
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
export interface CosmeticsProductMetadata {
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
 * 화장품 제품 카테고리
 */
export const COSMETICS_CATEGORIES = {
  SKINCARE: 'skincare',
  CLEANSING: 'cleansing',
  MAKEUP: 'makeup',
  SUNCARE: 'suncare',
  MASK: 'mask',
  BODYCARE: 'bodycare',
  HAIRCARE: 'haircare',
} as const;

/**
 * 피부 타입
 */
export const SKIN_TYPES = {
  DRY: 'dry',
  OILY: 'oily',
  COMBINATION: 'combination',
  SENSITIVE: 'sensitive',
  NORMAL: 'normal',
} as const;

/**
 * 피부 고민
 */
export const SKIN_CONCERNS = {
  ACNE: 'acne',
  WHITENING: 'whitening',
  WRINKLE: 'wrinkle',
  PORE: 'pore',
  SOOTHING: 'soothing',
  MOISTURIZING: 'moisturizing',
  ELASTICITY: 'elasticity',
  TROUBLE: 'trouble',
} as const;

/**
 * 인증 타입
 */
export const CERTIFICATIONS = {
  VEGAN: 'vegan',
  HYPOALLERGENIC: 'hypoallergenic',
  ORGANIC: 'organic',
  EWG_GREEN: 'ewgGreen',
  CRUELTY_FREE: 'crueltyfree',
  DERMATOLOGICALLY_TESTED: 'dermatologicallyTested',
} as const;

/**
 * Cosmetics Extension Implementation
 *
 * Phase 9-C: Core v2 before/after hooks 패턴 사용
 * productType = COSMETICS 상품에 대한 특화 검증을 수행합니다.
 */
export const cosmeticsExtension: DropshippingCoreExtension = {
  appId: 'dropshipping-cosmetics',
  displayName: '화장품 Dropshipping',
  version: '1.0.0',

  // Cosmetics Extension은 COSMETICS productType만 처리
  supportedProductTypes: [ProductType.COSMETICS],

  // ============================================
  // Offer Hooks (before/after 패턴)
  // ============================================

  /**
   * Offer 생성 전 검증 (before hook)
   *
   * 화장품 Offer 생성 시 필수 메타데이터 검증:
   * - 제품 카테고리 필수
   * - 피부 타입 정보 권장
   * - 성분 정보 권장
   */
  async beforeOfferCreate(context: OfferCreationContext): Promise<ValidationResult> {
    const errors: Array<{ code: string; message: string; field?: string }> = [];
    const warnings: Array<{ code: string; message: string; field?: string }> = [];

    // COSMETICS productType이 아니면 패스
    if (context.product?.productType !== ProductType.COSMETICS) {
      return { valid: true, errors: [] };
    }

    const metadata = context.product?.metadata as CosmeticsProductMetadata | undefined;

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

    // 4. 용량 정보 권장 (경고)
    if (!metadata?.volume) {
      warnings.push({
        code: 'COSMETICS_VOLUME_RECOMMENDED',
        message: '용량 정보를 입력해주세요 (예: 150ml, 50g).',
        field: 'metadata.volume',
      });
    }

    // 5. 유통기한 정보 권장 (경고)
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
   * Offer 생성 후 처리 (after hook)
   *
   * 화장품 Offer 생성 완료 후 로깅 및 통계 업데이트
   */
  async afterOfferCreate(context: OfferCreationContext & { offerId: string }): Promise<void> {
    // COSMETICS productType이 아니면 패스
    if (context.product?.productType !== ProductType.COSMETICS) {
      return;
    }

    const metadata = context.product?.metadata as CosmeticsProductMetadata | undefined;
    console.log(
      `[dropshipping-cosmetics] Cosmetics Offer created - ID: ${context.offerId}, Category: ${metadata?.productCategory}`
    );
    // 추가 로직: 화장품 통계 업데이트, 카테고리별 집계 등
  },

  // ============================================
  // Listing Hooks (before/after 패턴)
  // ============================================

  /**
   * Listing 생성 전 검증 (before hook)
   *
   * 화장품 Listing 생성 시 추가 검증:
   * - 필수 메타데이터 완성도 확인
   * - 성분 정보 완성도 확인
   */
  async beforeListingCreate(context: ListingCreationContext): Promise<ValidationResult> {
    const errors: Array<{ code: string; message: string; field?: string }> = [];
    const warnings: Array<{ code: string; message: string; field?: string }> = [];

    // COSMETICS productType이 아니면 패스
    if (context.productType !== ProductType.COSMETICS) {
      return { valid: true, errors: [] };
    }

    const metadata = context.metadata as CosmeticsProductMetadata | undefined;

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

    // 4. 텍스처 정보 권장
    if (!metadata?.texture) {
      warnings.push({
        code: 'COSMETICS_TEXTURE_RECOMMENDED',
        message: '제품 텍스처 정보를 입력하면 고객 선택에 도움이 됩니다.',
        field: 'metadata.texture',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  },

  /**
   * Listing 생성 후 처리 (after hook)
   */
  async afterListingCreate(context: ListingCreationContext & { listingId: string }): Promise<void> {
    // COSMETICS productType이 아니면 패스
    if (context.productType !== ProductType.COSMETICS) {
      return;
    }

    console.log(
      `[dropshipping-cosmetics] Cosmetics Listing created - ID: ${context.listingId}`
    );
    // 추가 로직: 화장품 Listing 통계 업데이트
  },

  // ============================================
  // Order Hooks (before/after 패턴)
  // ============================================

  /**
   * Order 생성 전 검증 (before hook)
   *
   * 화장품 주문 시 특별한 제한은 없으나,
   * 향후 성분 알레르기 경고 등을 추가할 수 있음
   */
  async beforeOrderCreate(context: OrderCreationContext): Promise<ValidationResult> {
    const warnings: Array<{ code: string; message: string; field?: string }> = [];

    // COSMETICS productType이 아니면 패스
    if (context.productType !== ProductType.COSMETICS) {
      return { valid: true, errors: [] };
    }

    // 화장품은 기본적으로 모든 주문 허용
    // 향후 확장 가능:
    // - 성분 알레르기 경고
    // - 사용 연령 제한
    // - 조합 금지 성분 체크

    return {
      valid: true,
      errors: [],
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  },

  /**
   * Order 생성 후 처리 (after hook)
   */
  async afterOrderCreate(context: OrderCreationContext & { orderId: string }): Promise<void> {
    // COSMETICS productType이 아니면 패스
    if (context.productType !== ProductType.COSMETICS) {
      return;
    }

    console.log(
      `[dropshipping-cosmetics] Cosmetics Order created - ID: ${context.orderId}`
    );
    // 추가 로직: 화장품 주문 통계 업데이트, 인플루언서 루틴 연동 등
  },

  // ============================================
  // Lifecycle Hooks
  // ============================================

  /**
   * Extension 활성화 시 호출
   */
  async onActivate(): Promise<void> {
    console.log('[dropshipping-cosmetics] Extension activated');
    console.log('[dropshipping-cosmetics] Cosmetics-specific validation hooks enabled');
    console.log(`[dropshipping-cosmetics] Supported ProductType: ${ProductType.COSMETICS}`);
  },

  /**
   * Extension 비활성화 시 호출
   */
  async onDeactivate(): Promise<void> {
    console.log('[dropshipping-cosmetics] Extension deactivated');
  },
};

export default cosmeticsExtension;
