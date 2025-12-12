/**
 * Pharmaceutical Core Extension
 *
 * Dropshipping Core Extension Interface 구현 (Core v2 before/after 패턴)
 *
 * 의약품 B2B 워크플로우의 핵심 규칙:
 * 1. Offer 생성: 도매상/제조사만 가능 (beforeOfferCreate)
 * 2. Listing 생성: 항상 차단 - B2C 판매 금지 (beforeListingCreate)
 * 3. Order 생성: 약국만 가능 (beforeOrderCreate)
 * 4. Settlement: 공급자(SUPPLIER)만 정산 (beforeSettlementCreate)
 *
 * @package @o4o/pharmaceutical-core
 */

import type { DropshippingCoreExtension } from '@o4o/dropshipping-core';

/**
 * 의약품 공급자 유형
 * WHOLESALER: 도매상
 * MANUFACTURER: 제조사
 */
type PharmaceuticalSupplierType = 'wholesaler' | 'manufacturer';

/**
 * 약국 조직 유형
 */
type PharmacyOrganizationType = 'pharmacy';

/**
 * Pharmaceutical Core Extension
 *
 * Dropshipping Core에 등록되어 pharmaceutical productType에 대한
 * 검증 로직을 수행합니다.
 *
 * Core v2 before/after hooks 패턴을 사용합니다.
 */
export const pharmaceuticalExtension: DropshippingCoreExtension = {
  appId: 'pharmaceutical-core',
  displayName: '의약품 유통',
  version: '1.0.0',
  supportedProductTypes: ['pharmaceutical'],

  // ===== Offer Hooks =====

  /**
   * Offer 생성 전 검증 (beforeOfferCreate)
   *
   * 의약품은 도매상(WHOLESALER) 또는 제조사(MANUFACTURER)만 Offer를 생성할 수 있습니다.
   * 또한 약사법에 따른 도매상 허가증이 필요합니다.
   */
  async beforeOfferCreate(context) {
    // productType이 pharmaceutical이 아니면 패스
    if (context.productType !== 'pharmaceutical') {
      return { valid: true, errors: [] };
    }

    const supplierType = context.supplier?.metadata
      ?.supplierType as PharmaceuticalSupplierType | undefined;

    // 공급자 유형 검증
    if (!supplierType) {
      return {
        valid: false,
        errors: [
          {
            code: 'SUPPLIER_TYPE_REQUIRED',
            message: '의약품 공급을 위해서는 공급자 유형(도매상/제조사)이 필요합니다.',
          },
        ],
      };
    }

    if (supplierType !== 'wholesaler' && supplierType !== 'manufacturer') {
      return {
        valid: false,
        errors: [
          {
            code: 'INVALID_SUPPLIER_TYPE',
            message: '의약품은 도매상 또는 제조사만 공급할 수 있습니다.',
          },
        ],
      };
    }

    // 약사법 관련 라이선스 검증
    const hasPharmacyLicense = context.supplier?.metadata?.pharmacyLicense;
    if (!hasPharmacyLicense) {
      return {
        valid: false,
        errors: [
          {
            code: 'WHOLESALE_LICENSE_REQUIRED',
            message: '의약품 유통을 위한 도매상 허가증이 필요합니다.',
          },
        ],
      };
    }

    return { valid: true, errors: [] };
  },

  /**
   * Offer 생성 후 Hook (afterOfferCreate)
   *
   * 의약품 Offer 생성 후 로깅
   */
  async afterOfferCreate(context) {
    if (context.productType !== 'pharmaceutical') {
      return;
    }

    console.log(`[pharmaceutical-core] Offer created: ${context.offerId}`);
  },

  // ===== Listing Hooks =====

  /**
   * Listing 생성 전 검증 (beforeListingCreate)
   *
   * 의약품은 Listing 생성이 항상 금지됩니다.
   * 의약품은 B2B 거래만 허용되며, 일반 소비자 판매(Listing)는 불가합니다.
   */
  async beforeListingCreate(context) {
    // productType이 pharmaceutical이 아니면 패스
    if (context.productType !== 'pharmaceutical') {
      return { valid: true, errors: [] };
    }

    // 의약품은 Listing 생성 절대 금지 (B2C 판매 금지)
    return {
      valid: false,
      errors: [
        {
          code: 'PHARMA_LISTING_BLOCKED',
          message: '의약품은 일반 소비자 판매가 금지됩니다. B2B 주문만 가능합니다.',
        },
      ],
    };
  },

  // ===== Order Hooks =====

  /**
   * Order 생성 전 검증 (beforeOrderCreate)
   *
   * 의약품은 약국(PHARMACY)만 주문할 수 있습니다.
   * 일반 소비자(consumer)의 주문은 차단됩니다.
   */
  async beforeOrderCreate(context) {
    // productType이 pharmaceutical이 아니면 패스
    if (context.productType !== 'pharmaceutical') {
      return { valid: true, errors: [] };
    }

    const organizationType = context.buyerInfo
      ?.organizationType as PharmacyOrganizationType | undefined;

    // 구매자가 약국인지 검증
    if (organizationType !== 'pharmacy') {
      return {
        valid: false,
        errors: [
          {
            code: 'BUYER_NOT_PHARMACY',
            message: '의약품은 약국만 구매할 수 있습니다.',
          },
        ],
      };
    }

    // 약국 라이선스 검증 (metadata에서 확인)
    const hasPharmacyLicense = context.metadata?.pharmacyLicense;
    if (!hasPharmacyLicense) {
      return {
        valid: false,
        errors: [
          {
            code: 'PHARMACY_LICENSE_REQUIRED',
            message: '의약품 구매를 위한 약국 개설 허가증이 필요합니다.',
          },
        ],
      };
    }

    return { valid: true, errors: [] };
  },

  /**
   * Order 생성 후 Hook (afterOrderCreate)
   *
   * 의약품 주문 생성 후 PharmaDispatch 준비 트리거
   */
  async afterOrderCreate(context) {
    if (context.productType !== 'pharmaceutical') {
      return;
    }

    console.log(`[pharmaceutical-core] Order created: ${context.orderId}`);
    console.log(`[pharmaceutical-core] Preparing PharmaDispatch for order...`);
    // 실제 PharmaDispatch 생성은 PharmaOrderService에서 처리
  },

  // ===== Settlement Hooks =====

  /**
   * Settlement 생성 전 검증 (beforeSettlementCreate)
   *
   * 의약품 정산은 SUPPLIER(공급자)만 가능합니다.
   * contextType이 'pharmacy' (약국 관련) 또는 productType이 'pharmaceutical'인 경우에만 적용됩니다.
   */
  async beforeSettlementCreate(context) {
    // pharmaceutical 관련 정산인지 확인
    // contextType이 'pharmacy'이거나 metadata에 pharmaceutical 표시가 있는 경우
    const isPharmaceuticalSettlement =
      context.contextType === 'pharmacy' ||
      context.metadata?.productType === 'pharmaceutical';

    if (!isPharmaceuticalSettlement) {
      return { valid: true, errors: [] };
    }

    // 정산 대상 검증 - SUPPLIER만 가능
    if (!context.supplierId) {
      return {
        valid: false,
        errors: [
          {
            code: 'SUPPLIER_SETTLEMENT_ONLY',
            message: '의약품 정산은 공급자(SUPPLIER)만 가능합니다.',
          },
        ],
      };
    }

    // sellerId가 있으면 차단 (seller 정산 금지)
    if (context.sellerId) {
      return {
        valid: false,
        errors: [
          {
            code: 'SELLER_SETTLEMENT_NOT_ALLOWED',
            message: '의약품은 판매자(SELLER) 정산이 불가합니다. 공급자 정산만 가능합니다.',
          },
        ],
      };
    }

    return { valid: true, errors: [] };
  },

  // ===== Commission Hooks =====

  /**
   * Commission 적용 전 검증 (beforeCommissionApply)
   *
   * 의약품 수수료는 2% 이하로 제한됩니다.
   */
  async beforeCommissionApply(context) {
    // productType이 pharmaceutical이 아니면 패스
    if (context.productType !== 'pharmaceutical') {
      return { valid: true, errors: [] };
    }

    // 수수료율 제한 (의약품은 최대 2%)
    const MAX_PHARMA_COMMISSION_RATE = 0.02;
    const commissionRate = context.metadata?.commissionRate as number | undefined;

    if (commissionRate && commissionRate > MAX_PHARMA_COMMISSION_RATE) {
      return {
        valid: false,
        errors: [
          {
            code: 'COMMISSION_RATE_EXCEEDED',
            message: `의약품 수수료율은 최대 ${MAX_PHARMA_COMMISSION_RATE * 100}%입니다.`,
          },
        ],
      };
    }

    return { valid: true, errors: [] };
  },

  /**
   * Commission 적용 후 Hook (afterCommissionApply)
   *
   * 의약품 수수료 적용 후 로깅
   */
  async afterCommissionApply(context) {
    if (context.productType !== 'pharmaceutical') {
      return;
    }

    const commissionRate = context.metadata?.commissionRate as number | undefined;
    console.log(
      `[pharmaceutical-core] Commission applied: ${context.commissionAmount}${commissionRate ? ` (rate: ${commissionRate * 100}%)` : ''}`
    );
  },

  // ===== Lifecycle Hooks =====

  /**
   * Extension 활성화 시 Hook
   */
  async onActivate() {
    console.log('[pharmaceutical-core] Extension activated');
    console.log('[pharmaceutical-core] Validation rules:');
    console.log('[pharmaceutical-core] - beforeOfferCreate: Only WHOLESALER/MANUFACTURER with license');
    console.log('[pharmaceutical-core] - beforeListingCreate: ALWAYS BLOCKED (B2C prohibited)');
    console.log('[pharmaceutical-core] - beforeOrderCreate: Only PHARMACY with license');
    console.log('[pharmaceutical-core] - beforeSettlementCreate: SUPPLIER only (no seller settlement)');
    console.log('[pharmaceutical-core] - beforeCommissionApply: Max 2% rate');
  },

  /**
   * Extension 비활성화 시 Hook
   */
  async onDeactivate() {
    console.log('[pharmaceutical-core] Extension deactivated');
  },
};

export default pharmaceuticalExtension;
