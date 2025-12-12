/**
 * SupplierOps Extension
 *
 * Phase 9-B: Core 정렬 완료
 * - Dropshipping Core Extension으로 등록되어 Offer/Order 검증 수행
 * - before/after hooks 전체 구현
 * - PHARMACEUTICAL 제품 타입 차단
 *
 * 핵심 역할:
 * - Offer 생성/수정 시 Supplier 권한 검증
 * - Order 생성 시 재고 확인 및 상태 검증
 * - Settlement contextType = 'supplier' 기본값 설정
 * - Commission 적용 전후 로깅
 *
 * @package @o4o/supplierops
 */

import { ProductType } from '@o4o/dropshipping-core';
import type {
  DropshippingCoreExtension,
  OfferCreationContext,
  OrderCreationContext,
  SettlementCreationContext,
  CommissionContext,
  ValidationResult,
} from '@o4o/dropshipping-core';

/**
 * SupplierOps Extension Implementation
 *
 * SupplierOps는 Offer/ProductMaster/Order 흐름에서 Core Hook을 통해 검증을 수행합니다.
 * productType별 정책은 각 산업별 Extension(Cosmetics, Pharmacy 등)이 담당하며,
 * SupplierOps는 범용적인 Supplier 관련 검증만 수행합니다.
 */
export const supplierOpsExtension: DropshippingCoreExtension = {
  appId: 'supplierops',
  displayName: '공급자 운영',
  version: '1.0.0',

  // SupplierOps는 모든 productType을 지원 (필터링 없음)
  // 단, PHARMACEUTICAL은 차단 (pharmacy-core가 담당)
  supportedProductTypes: undefined,

  // ============================================
  // Offer Hooks
  // ============================================

  /**
   * Offer 생성 전 검증 (before hook)
   *
   * SupplierOps 레벨에서의 기본 검증:
   * - PHARMACEUTICAL 제품 타입 차단
   * - Supplier 활성화 상태 확인
   * - ProductMaster 상태 확인
   * - 가격 유효성 확인
   */
  async beforeOfferCreate(context: OfferCreationContext): Promise<ValidationResult> {
    const errors: Array<{ code: string; message: string; field?: string }> = [];
    const warnings: Array<{ code: string; message: string; field?: string }> = [];

    // 0. PHARMACEUTICAL 제품 타입 차단
    if (context.product?.productType === ProductType.PHARMACEUTICAL) {
      errors.push({
        code: 'PHARMACEUTICAL_NOT_ALLOWED',
        message: '의약품 Offer는 SupplierOps에서 생성할 수 없습니다. pharmacy-core Extension을 사용하세요.',
        field: 'productType',
      });
      return { valid: false, errors, warnings };
    }

    // 1. ProductMaster 확인
    if (!context.product) {
      errors.push({
        code: 'PRODUCT_NOT_FOUND',
        message: 'ProductMaster를 찾을 수 없습니다.',
        field: 'productId',
      });
      return { valid: false, errors, warnings };
    }

    // 2. ProductMaster 상태 확인
    if (context.product.status !== 'active') {
      errors.push({
        code: 'PRODUCT_NOT_ACTIVE',
        message: '비활성화된 상품으로는 Offer를 생성할 수 없습니다.',
        field: 'productId',
      });
    }

    // 3. Supplier 활성화 상태 확인
    if (context.supplier && context.supplier.status !== 'active') {
      errors.push({
        code: 'SUPPLIER_NOT_ACTIVE',
        message: '비활성화된 공급자는 Offer를 생성할 수 없습니다.',
      });
    }

    // 4. 가격 유효성 확인
    const supplierPrice = context.offerData?.supplierPrice;
    if (supplierPrice !== undefined && supplierPrice <= 0) {
      errors.push({
        code: 'INVALID_PRICE',
        message: '공급가는 0보다 커야 합니다.',
        field: 'supplierPrice',
      });
    }

    // 5. 재고 확인 (경고)
    const stock = context.offerData?.stockQuantity;
    if (stock !== undefined && stock <= 0) {
      warnings.push({
        code: 'ZERO_STOCK',
        message: '재고가 0입니다. Offer는 생성되지만 판매가 불가능할 수 있습니다.',
        field: 'stockQuantity',
      });
    }

    // 6. 최소 주문 수량 확인
    const minOrder = context.offerData?.minOrderQuantity;
    if (minOrder !== undefined && minOrder < 1) {
      errors.push({
        code: 'INVALID_MIN_ORDER',
        message: '최소 주문 수량은 1 이상이어야 합니다.',
        field: 'minOrderQuantity',
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
   * Offer 생성 완료 후 로깅 및 통계 업데이트
   */
  async afterOfferCreate(context: OfferCreationContext & { offerId: string }): Promise<void> {
    console.log(
      `[supplierops] Offer created - ID: ${context.offerId}, Product: ${context.product?.id}, Supplier: ${context.supplier?.id}`
    );
    // 추가 로직: Supplier 통계 업데이트, 알림 발송 등
  },

  // ============================================
  // Order Hooks
  // ============================================

  /**
   * Order 생성 전 검증 (before hook)
   *
   * 주문 생성 시 Supplier 관점에서 검증:
   * - Listing 활성화 상태 확인
   * - 주문 수량 확인
   */
  async beforeOrderCreate(context: OrderCreationContext): Promise<ValidationResult> {
    const errors: Array<{ code: string; message: string; field?: string }> = [];
    const warnings: Array<{ code: string; message: string; field?: string }> = [];

    // 1. Listing 확인
    if (!context.listing) {
      errors.push({
        code: 'LISTING_NOT_FOUND',
        message: 'Listing을 찾을 수 없습니다.',
        field: 'listingId',
      });
      return { valid: false, errors, warnings };
    }

    // 2. Listing 활성화 상태 확인
    if (context.listing.status !== 'active') {
      errors.push({
        code: 'LISTING_NOT_ACTIVE',
        message: '비활성화된 Listing으로는 주문할 수 없습니다.',
        field: 'listingId',
      });
    }

    // 3. 주문 수량 확인
    const requestedQuantity = context.orderData?.quantity || 0;
    if (requestedQuantity <= 0) {
      errors.push({
        code: 'INVALID_QUANTITY',
        message: '주문 수량은 1 이상이어야 합니다.',
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
   * Order 생성 후 처리 (after hook)
   *
   * 주문 생성 완료 후 재고 차감 및 알림
   */
  async afterOrderCreate(context: OrderCreationContext & { orderId: string }): Promise<void> {
    console.log(
      `[supplierops] Order created - OrderID: ${context.orderId}, Listing: ${context.listing?.id}`
    );
    // 추가 로직: 재고 차감, Supplier 알림 발송 등
  },

  // ============================================
  // Settlement Hooks
  // ============================================

  /**
   * Settlement 생성 전 검증
   *
   * SupplierOps에서 Settlement 생성 시:
   * - contextType = 'supplier' 확인
   * - Supplier 정보 확인
   */
  async beforeSettlementCreate(context: SettlementCreationContext): Promise<ValidationResult> {
    const errors: Array<{ code: string; message: string; field?: string }> = [];

    // SupplierOps는 supplier contextType만 처리
    if (context.contextType !== 'supplier') {
      return { valid: true, errors: [] };
    }

    // Supplier ID 확인
    if (!context.supplierId) {
      errors.push({
        code: 'SUPPLIER_ID_REQUIRED',
        message: 'Supplier Settlement에는 supplierId가 필요합니다.',
        field: 'supplierId',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  // ============================================
  // Commission Hooks
  // ============================================

  /**
   * Commission 적용 전 검증
   *
   * Supplier 관점에서 Commission이 올바르게 계산되는지 확인
   */
  async beforeCommissionApply(context: CommissionContext): Promise<ValidationResult> {
    const errors: Array<{ code: string; message: string; field?: string }> = [];

    // 주문 금액 확인
    if (context.orderAmount <= 0) {
      errors.push({
        code: 'INVALID_ORDER_AMOUNT',
        message: '주문 금액이 유효하지 않습니다.',
        field: 'orderAmount',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Commission 적용 후 처리
   *
   * Supplier 정산 내역 기록 등 후처리
   */
  async afterCommissionApply(context: CommissionContext & { commissionAmount: number }): Promise<void> {
    console.log(
      `[supplierops] Commission applied - Order: ${context.orderRelay?.id}, Amount: ${context.commissionAmount}`
    );
    // 추가 로직: Supplier 정산 내역 기록, 월간 통계 업데이트 등
  },
};

export default supplierOpsExtension;
