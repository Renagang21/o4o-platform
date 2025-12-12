/**
 * Pharmaceutical Core Extension
 *
 * Dropshipping Core Extension Interface 구현
 *
 * 의약품 B2B 워크플로우의 핵심 규칙:
 * 1. Offer 생성: 도매상/제조사만 가능
 * 2. Listing 생성: 항상 차단 (B2C 판매 금지)
 * 3. Order 생성: 약국만 가능
 *
 * @package @o4o/pharmaceutical-core
 */

import type {
  DropshippingCoreExtension,
} from '@o4o/dropshipping-core';

/**
 * 의약품 공급자 유형 검증
 */
type PharmaceuticalSupplierType = 'wholesaler' | 'manufacturer';

/**
 * 약국 조직 유형 검증
 */
type PharmacyOrganizationType = 'pharmacy';

/**
 * Pharmaceutical Core Extension
 *
 * Dropshipping Core에 등록되어 pharmaceutical productType에 대한
 * 검증 로직을 수행합니다.
 */
export const pharmaceuticalExtension: DropshippingCoreExtension = {
  appId: 'pharmaceutical-core',
  displayName: '의약품 유통',
  version: '1.0.0',
  supportedProductTypes: ['pharmaceutical'],

  /**
   * Offer 생성 검증
   *
   * 의약품은 도매상/제조사만 Offer를 생성할 수 있습니다.
   */
  async validateOfferCreation(context) {
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
            code: 'PHARMACY_LICENSE_REQUIRED',
            message: '의약품 유통을 위한 도매상 허가증이 필요합니다.',
          },
        ],
      };
    }

    return { valid: true, errors: [] };
  },

  /**
   * Listing 생성 검증
   *
   * 의약품은 Listing 생성이 항상 금지됩니다.
   * 의약품은 B2B 거래만 허용되며, 일반 소비자 판매(Listing)는 불가합니다.
   */
  async validateListingCreation(context) {
    // productType이 pharmaceutical이 아니면 패스
    if (context.productType !== 'pharmaceutical') {
      return { valid: true, errors: [] };
    }

    // 의약품은 Listing 생성 절대 금지
    return {
      valid: false,
      errors: [
        {
          code: 'LISTING_NOT_ALLOWED_FOR_PHARMACEUTICAL',
          message: '의약품은 일반 소비자 판매가 금지됩니다. B2B 주문만 가능합니다.',
        },
      ],
    };
  },

  /**
   * Order 생성 검증
   *
   * 의약품은 약국만 주문할 수 있습니다.
   */
  async validateOrderCreation(context) {
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
   * Settlement 생성 전 검증
   *
   * 의약품 정산은 contextType이 'pharmacy'여야 합니다.
   */
  async beforeSettlementCreate(context) {
    // pharmaceutical 관련 정산인지 확인
    if (context.contextType !== 'pharmacy') {
      return { valid: true, errors: [] };
    }

    // 정산 대상 검증 (sellerId, supplierId, partnerId 중 하나가 필요)
    if (!context.sellerId && !context.supplierId && !context.partnerId) {
      return {
        valid: false,
        errors: [
          {
            code: 'TARGET_ID_REQUIRED',
            message: '정산 대상 ID가 필요합니다.',
          },
        ],
      };
    }

    return { valid: true, errors: [] };
  },

  /**
   * Commission 적용 전 검증
   *
   * 의약품 수수료는 2% 이하로 제한됩니다.
   * (commissionRate는 metadata에서 확인)
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
   * Commission 적용 후 Hook
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

  /**
   * Extension 활성화 시 Hook
   */
  async onActivate() {
    console.log('[pharmaceutical-core] Extension activated');
    console.log('[pharmaceutical-core] Validation rules:');
    console.log('[pharmaceutical-core] - Offer: Only wholesaler/manufacturer can create');
    console.log('[pharmaceutical-core] - Listing: ALWAYS BLOCKED for pharmaceutical');
    console.log('[pharmaceutical-core] - Order: Only pharmacy can order');
  },

  /**
   * Extension 비활성화 시 Hook
   */
  async onDeactivate() {
    console.log('[pharmaceutical-core] Extension deactivated');
  },
};

export default pharmaceuticalExtension;
