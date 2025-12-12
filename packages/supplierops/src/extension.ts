/**
 * SupplierOps Extension
 *
 * Dropshipping Core Extension으로 등록되어 Offer 검증을 수행합니다.
 *
 * 핵심 역할:
 * - Offer 생성 시 Supplier 권한 검증
 * - ProductMaster 등록 시 기본 검증
 * - Settlement contextType = 'supplier' 기본값 설정
 *
 * @package @o4o/supplierops
 */

import type {
  DropshippingCoreExtension,
  OfferCreationContext,
  SettlementCreationContext,
  CommissionContext,
  ValidationResult,
} from '@o4o/dropshipping-core';

/**
 * SupplierOps Extension Implementation
 *
 * SupplierOps는 Offer/ProductMaster 흐름에서 Core Hook을 통해 검증을 수행합니다.
 * productType별 정책은 각 산업별 Extension(Cosmetics, Pharmacy 등)이 담당하며,
 * SupplierOps는 범용적인 Supplier 관련 검증만 수행합니다.
 */
export const supplierOpsExtension: DropshippingCoreExtension = {
  appId: 'supplierops',
  displayName: '공급자 운영',
  version: '1.0.0',

  // SupplierOps는 모든 productType을 지원 (필터링 없음)
  // 산업별 정책은 각 Extension이 담당
  supportedProductTypes: undefined,

  /**
   * Offer 생성 검증
   *
   * SupplierOps 레벨에서의 기본 검증:
   * - Supplier 활성화 상태 확인
   * - ProductMaster 상태 확인
   * - 가격 유효성 확인
   *
   * productType 기반 정책(예: pharmaceutical → 약국 라이센스 필요)은
   * 해당 Extension(dropshipping-pharmacy)이 담당합니다.
   */
  async validateOfferCreation(context: OfferCreationContext): Promise<ValidationResult> {
    const errors: Array<{ code: string; message: string; field?: string }> = [];
    const warnings: Array<{ code: string; message: string; field?: string }> = [];

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

  /**
   * Commission 적용 전 검증
   *
   * Supplier 관점에서 Commission이 올바르게 계산되는지 확인
   */
  async beforeCommissionApply(context: CommissionContext): Promise<ValidationResult> {
    const errors: Array<{ code: string; message: string; field?: string }> = [];
    const warnings: Array<{ code: string; message: string; field?: string }> = [];

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
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  },

  /**
   * Commission 적용 후 처리
   *
   * Supplier 정산 내역 기록 등 후처리
   */
  async afterCommissionApply(context: CommissionContext & { commissionAmount: number }): Promise<void> {
    // Supplier 정산 관련 로깅 또는 통계 업데이트
    console.log(
      `[supplierops] Commission applied - Order: ${context.orderRelay?.id}, Amount: ${context.commissionAmount}`
    );
  },
};

export default supplierOpsExtension;
