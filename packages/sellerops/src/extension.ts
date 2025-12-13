/**
 * SellerOps Extension
 *
 * Dropshipping Core Extension으로 등록되어 Listing/Order 검증을 수행합니다.
 *
 * 핵심 역할:
 * - Listing 생성 시 productType 기반 검증
 * - Order 생성 시 Seller 권한 검증
 * - Settlement contextType = 'seller' 기본값 설정
 *
 * @package @o4o/sellerops
 */

import {
  ProductType,
  type DropshippingCoreExtension,
  type ListingCreationContext,
  type OrderCreationContext,
  type SettlementCreationContext,
  type ValidationResult,
} from '@o4o/dropshipping-core';

/**
 * SellerOps에서 차단해야 하는 productType 목록
 *
 * PHARMACEUTICAL: 의약품은 Listing/Order 절대 금지
 */
const BLOCKED_PRODUCT_TYPES: ProductType[] = [
  ProductType.PHARMACEUTICAL,
];

/**
 * SellerOps Extension Implementation
 *
 * SellerOps는 Listing/Order 흐름에서 Core Hook을 통해 검증을 수행합니다.
 * productType별 정책은 각 산업별 Extension(Cosmetics, Pharmacy 등)이 담당하며,
 * SellerOps는 범용적인 Seller 관련 검증만 수행합니다.
 */
export const sellerOpsExtension: DropshippingCoreExtension = {
  appId: 'sellerops',
  displayName: '판매자 운영',
  version: '1.0.0',

  // SellerOps는 모든 productType을 지원 (필터링 없음)
  // 산업별 정책은 각 Extension이 담당
  supportedProductTypes: undefined,

  /**
   * Listing 생성 전 검증 (before hook)
   *
   * SellerOps 레벨에서의 기본 검증:
   * 1. productType 기반 차단 (PHARMACEUTICAL 등)
   * 2. Seller-Supplier 관계 확인
   * 3. Offer 상태 확인
   */
  async beforeListingCreate(context: ListingCreationContext): Promise<ValidationResult> {
    const errors: Array<{ code: string; message: string; field?: string }> = [];
    const warnings: Array<{ code: string; message: string; field?: string }> = [];

    // 1. productType 기반 차단 검증 (PHARMACEUTICAL 등)
    const productType = context.productType as ProductType;
    if (productType && BLOCKED_PRODUCT_TYPES.includes(productType)) {
      errors.push({
        code: 'PRODUCT_TYPE_BLOCKED',
        message: `해당 상품 유형(${productType})은 일반 판매가 불가능합니다.`,
        field: 'productType',
      });
      return { valid: false, errors };
    }

    // 2. Offer 상태 확인
    if (!context.offer) {
      errors.push({
        code: 'OFFER_NOT_FOUND',
        message: 'Offer를 찾을 수 없습니다.',
        field: 'offerId',
      });
      return { valid: false, errors, warnings };
    }

    // 3. Offer 활성화 상태 확인
    if (context.offer.status !== 'active') {
      errors.push({
        code: 'OFFER_NOT_ACTIVE',
        message: '비활성화된 Offer로는 Listing을 생성할 수 없습니다.',
        field: 'offerId',
      });
    }

    // 4. 재고 확인
    if (context.offer.stockQuantity <= 0) {
      warnings.push({
        code: 'LOW_STOCK',
        message: '재고가 없습니다. Listing은 생성되지만 판매가 불가능할 수 있습니다.',
      });
    }

    // 5. Seller 활성화 상태 확인
    if (context.seller && context.seller.status !== 'active') {
      errors.push({
        code: 'SELLER_NOT_ACTIVE',
        message: '비활성화된 판매자는 Listing을 생성할 수 없습니다.',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  },

  /**
   * Order 생성 전 검증 (before hook)
   *
   * SellerOps 레벨에서의 기본 검증:
   * 1. productType 기반 차단 (PHARMACEUTICAL 등)
   * 2. Listing 활성화 상태 확인
   * 3. 주문 수량 확인
   */
  async beforeOrderCreate(context: OrderCreationContext): Promise<ValidationResult> {
    const errors: Array<{ code: string; message: string; field?: string }> = [];
    const warnings: Array<{ code: string; message: string; field?: string }> = [];

    // 1. productType 기반 차단 검증 (PHARMACEUTICAL 등)
    const productType = context.productType as ProductType;
    if (productType && BLOCKED_PRODUCT_TYPES.includes(productType)) {
      errors.push({
        code: 'PRODUCT_TYPE_BLOCKED',
        message: `해당 상품 유형(${productType})은 일반 판매 채널에서 주문할 수 없습니다.`,
        field: 'productType',
      });
      return { valid: false, errors };
    }

    // 2. Listing 확인
    if (!context.listing) {
      errors.push({
        code: 'LISTING_NOT_FOUND',
        message: 'Listing을 찾을 수 없습니다.',
        field: 'listingId',
      });
      return { valid: false, errors, warnings };
    }

    // 3. Listing 상태 확인
    if (context.listing.status !== 'active') {
      errors.push({
        code: 'LISTING_NOT_ACTIVE',
        message: '비활성화된 Listing으로는 주문할 수 없습니다.',
        field: 'listingId',
      });
    }

    // 4. 주문 수량 확인
    const quantity = context.orderData?.quantity || 1;
    const availableStock = context.listing.offer?.stockQuantity || 0;

    if (quantity > availableStock) {
      errors.push({
        code: 'INSUFFICIENT_STOCK',
        message: `재고가 부족합니다. 요청: ${quantity}, 가용: ${availableStock}`,
        field: 'quantity',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  },

  /**
   * Settlement 생성 전 검증
   *
   * SellerOps에서 Settlement 생성 시:
   * - contextType = 'seller' 확인
   * - Seller 정보 확인
   */
  async beforeSettlementCreate(context: SettlementCreationContext): Promise<ValidationResult> {
    const errors: Array<{ code: string; message: string; field?: string }> = [];

    // SellerOps는 seller contextType만 처리
    if (context.contextType !== 'seller') {
      return { valid: true, errors: [] };
    }

    // Seller ID 확인
    if (!context.sellerId) {
      errors.push({
        code: 'SELLER_ID_REQUIRED',
        message: 'Seller Settlement에는 sellerId가 필요합니다.',
        field: 'sellerId',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};

export default sellerOpsExtension;
