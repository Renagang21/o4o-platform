/**
 * Dropshipping Core Extension Interface
 *
 * 확장앱(Cosmetics, Pharmacy, Partner, Tourism 등)이 Core 기능을
 * override할 수 있는 공식 인터페이스입니다.
 *
 * 확장앱은 manifest를 통해 이 interface를 구현한다고 선언합니다.
 *
 * @package @o4o/dropshipping-core
 */

import type {
  OfferCreationContext,
  ListingCreationContext,
  OrderCreationContext,
  SettlementCreationContext,
  CommissionContext,
  ValidationResult,
  OfferValidationHook,
  ListingValidationHook,
  OrderValidationHook,
  SettlementValidationHook,
  CommissionValidationHook,
} from './validation-hooks.js';

/**
 * DropshippingCoreExtension
 *
 * 확장앱이 구현해야 하는 Core Extension 인터페이스
 *
 * 모든 메서드는 optional이며, 구현하지 않으면 기본 동작(allow all)이 적용됩니다.
 *
 * @example
 * ```typescript
 * // packages/dropshipping-pharmacy/src/extension.ts
 * export const pharmacyExtension: DropshippingCoreExtension = {
 *   appId: 'dropshipping-pharmacy',
 *   supportedProductTypes: ['pharmaceutical'],
 *
 *   async beforeOfferCreate(context) {
 *     // 의약품은 인증된 공급자만 Offer 생성 가능
 *     if (context.productType === 'pharmaceutical') {
 *       if (!context.supplier.metadata?.pharmacyLicense) {
 *         return {
 *           valid: false,
 *           errors: [{ code: 'PHARMACY_LICENSE_REQUIRED', message: '약국 라이센스가 필요합니다.' }]
 *         };
 *       }
 *     }
 *     return { valid: true, errors: [] };
 *   },
 *
 *   async beforeListingCreate(context) {
 *     // 의약품은 Listing 금지 (B2B만 허용)
 *     if (context.productType === 'pharmaceutical') {
 *       return {
 *         valid: false,
 *         errors: [{ code: 'LISTING_NOT_ALLOWED', message: '의약품은 일반 판매가 금지됩니다.' }]
 *       };
 *     }
 *     return { valid: true, errors: [] };
 *   },
 *
 *   async beforeOrderCreate(context) {
 *     // 의약품은 약국만 구매 가능
 *     if (context.productType === 'pharmaceutical') {
 *       if (context.buyerInfo?.organizationType !== 'pharmacy') {
 *         return {
 *           valid: false,
 *           errors: [{ code: 'BUYER_NOT_PHARMACY', message: '의약품은 약국만 구매할 수 있습니다.' }]
 *         };
 *       }
 *     }
 *     return { valid: true, errors: [] };
 *   },
 *
 *   async afterOrderCreate(context) {
 *     // 주문 생성 후 약국에 알림 발송
 *     console.log(`[Pharmacy] Order created: ${context.orderId}`);
 *   }
 * };
 * ```
 */
export interface DropshippingCoreExtension {
  /**
   * 확장앱 ID (manifest.appId와 동일)
   */
  appId: string;

  /**
   * 확장앱 이름 (선택)
   */
  displayName?: string;

  /**
   * 확장앱 버전 (선택)
   */
  version?: string;

  /**
   * 지원하는 productType 목록
   * 명시하면 해당 productType에만 Hook이 적용됨
   */
  supportedProductTypes?: string[];

  // ===== Offer Hooks (before/after 패턴) =====

  /**
   * Offer 생성 전 검증 Hook
   * 기본: always allow
   */
  beforeOfferCreate?: (context: OfferCreationContext) => Promise<ValidationResult>;

  /**
   * Offer 생성 후 Hook
   * 기본: no-op
   */
  afterOfferCreate?: (context: OfferCreationContext & { offerId: string }) => Promise<void>;

  // ===== Listing Hooks (before/after 패턴) =====

  /**
   * Listing 생성 전 검증 Hook
   * 기본: always allow
   */
  beforeListingCreate?: (context: ListingCreationContext) => Promise<ValidationResult>;

  /**
   * Listing 생성 후 Hook
   * 기본: no-op
   */
  afterListingCreate?: (context: ListingCreationContext & { listingId: string }) => Promise<void>;

  // ===== Order Hooks (before/after 패턴) =====

  /**
   * Order 생성 전 검증 Hook
   * 기본: always allow
   */
  beforeOrderCreate?: (context: OrderCreationContext) => Promise<ValidationResult>;

  /**
   * Order 생성 후 Hook
   * 기본: no-op
   */
  afterOrderCreate?: (context: OrderCreationContext & { orderId: string }) => Promise<void>;

  // ===== Settlement Hooks =====

  /**
   * Settlement 생성 전 Hook
   * 기본: always allow
   */
  beforeSettlementCreate?: (context: SettlementCreationContext) => Promise<ValidationResult>;

  // ===== Commission Hooks =====

  /**
   * Commission 적용 전 Hook
   * 기본: always allow
   */
  beforeCommissionApply?: (context: CommissionContext) => Promise<ValidationResult>;

  /**
   * Commission 적용 후 Hook
   * 기본: no-op
   */
  afterCommissionApply?: (context: CommissionContext & { commissionAmount: number }) => Promise<void>;

  // ===== Lifecycle Hooks =====

  /**
   * Extension이 활성화될 때 호출
   */
  onActivate?: () => Promise<void>;

  /**
   * Extension이 비활성화될 때 호출
   */
  onDeactivate?: () => Promise<void>;
}

/**
 * Extension Registry
 *
 * 확장앱들을 관리하는 중앙 레지스트리
 */
export class ExtensionRegistry {
  private static instance: ExtensionRegistry;
  private extensions: Map<string, DropshippingCoreExtension> = new Map();

  private constructor() {}

  static getInstance(): ExtensionRegistry {
    if (!ExtensionRegistry.instance) {
      ExtensionRegistry.instance = new ExtensionRegistry();
    }
    return ExtensionRegistry.instance;
  }

  /**
   * Extension 등록
   */
  register(extension: DropshippingCoreExtension): void {
    this.extensions.set(extension.appId, extension);
    console.log(`[ExtensionRegistry] Registered: ${extension.appId}`);
  }

  /**
   * Extension 해제
   */
  unregister(appId: string): void {
    this.extensions.delete(appId);
    console.log(`[ExtensionRegistry] Unregistered: ${appId}`);
  }

  /**
   * Extension 조회
   */
  get(appId: string): DropshippingCoreExtension | undefined {
    return this.extensions.get(appId);
  }

  /**
   * 모든 Extension 목록
   */
  getAll(): DropshippingCoreExtension[] {
    return Array.from(this.extensions.values());
  }

  /**
   * 특정 productType을 지원하는 Extension 목록
   */
  getByProductType(productType: string): DropshippingCoreExtension[] {
    return this.getAll().filter(ext => {
      if (!ext.supportedProductTypes) return true; // 모든 타입 지원
      return ext.supportedProductTypes.includes(productType);
    });
  }

  /**
   * 모든 Extension 초기화 (테스트용)
   */
  reset(): void {
    this.extensions.clear();
  }
}

/**
 * Singleton export
 */
export const extensionRegistry = ExtensionRegistry.getInstance();

/**
 * Extension 등록 헬퍼 함수
 *
 * 확장앱의 lifecycle/activate.ts에서 사용:
 *
 * @example
 * ```typescript
 * import { registerExtension } from '@o4o/dropshipping-core';
 * import { pharmacyExtension } from '../extension.js';
 *
 * export async function activate() {
 *   registerExtension(pharmacyExtension);
 * }
 * ```
 */
export function registerExtension(extension: DropshippingCoreExtension): void {
  extensionRegistry.register(extension);

  // Validation Hook Registry에도 등록
  const { validationHooks } = require('./validation-hooks.js');

  // Offer Hooks (before/after 패턴)
  if (extension.beforeOfferCreate || extension.afterOfferCreate) {
    validationHooks.registerOfferHook(extension.appId, {
      beforeOfferCreate: extension.beforeOfferCreate || (async () => ({ valid: true, errors: [] })),
      afterOfferCreate: extension.afterOfferCreate || (async () => {}),
    });
  }

  // Listing Hooks (before/after 패턴)
  if (extension.beforeListingCreate || extension.afterListingCreate) {
    validationHooks.registerListingHook(extension.appId, {
      beforeListingCreate: extension.beforeListingCreate || (async () => ({ valid: true, errors: [] })),
      afterListingCreate: extension.afterListingCreate || (async () => {}),
    });
  }

  // Order Hooks (before/after 패턴)
  if (extension.beforeOrderCreate || extension.afterOrderCreate) {
    validationHooks.registerOrderHook(extension.appId, {
      beforeOrderCreate: extension.beforeOrderCreate || (async () => ({ valid: true, errors: [] })),
      afterOrderCreate: extension.afterOrderCreate || (async () => {}),
    });
  }

  // Settlement Hooks
  if (extension.beforeSettlementCreate) {
    validationHooks.registerSettlementHook(extension.appId, {
      beforeSettlementCreate: extension.beforeSettlementCreate,
    });
  }

  // Commission Hooks
  if (extension.beforeCommissionApply || extension.afterCommissionApply) {
    validationHooks.registerCommissionHook(extension.appId, {
      beforeCommissionApply: extension.beforeCommissionApply || (async () => ({ valid: true, errors: [] })),
      afterCommissionApply: extension.afterCommissionApply || (async () => {}),
    });
  }
}

/**
 * Extension 해제 헬퍼 함수
 *
 * 확장앱의 lifecycle/deactivate.ts에서 사용
 */
export function unregisterExtension(appId: string): void {
  extensionRegistry.unregister(appId);

  // Validation Hook Registry에서도 해제
  const { validationHooks } = require('./validation-hooks.js');
  validationHooks.unregisterOfferHook(appId);
  validationHooks.unregisterListingHook(appId);
  validationHooks.unregisterOrderHook(appId);
  validationHooks.unregisterSettlementHook(appId);
  validationHooks.unregisterCommissionHook(appId);
}
