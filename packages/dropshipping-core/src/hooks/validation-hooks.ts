/**
 * Dropshipping Core Validation Hooks
 *
 * 확장앱(Cosmetics, Pharmacy, Partner 등)이 Core의 workflow를
 * 안전하게 override할 수 있는 Validation Hook 시스템
 *
 * @package @o4o/dropshipping-core
 */

import type { ProductMaster } from '../entities/ProductMaster.entity.js';
import type { Supplier } from '../entities/Supplier.entity.js';
import type { Seller } from '../entities/Seller.entity.js';
import type { SupplierProductOffer } from '../entities/SupplierProductOffer.entity.js';
import type { SellerListing } from '../entities/SellerListing.entity.js';
import type { OrderRelay } from '../entities/OrderRelay.entity.js';
import type { SettlementBatch } from '../entities/SettlementBatch.entity.js';

// ============================================
// Validation Result Types
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  details?: Record<string, any>;
}

export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
}

// ============================================
// Context Types for Validation Hooks
// ============================================

export interface OfferCreationContext {
  product: ProductMaster;
  supplier: Supplier;
  offerData: Partial<SupplierProductOffer>;
  productType?: string;
  metadata?: Record<string, any>;
}

export interface ListingCreationContext {
  offer: SupplierProductOffer;
  seller: Seller;
  listingData: Partial<SellerListing>;
  productType?: string;
  metadata?: Record<string, any>;
}

export interface OrderCreationContext {
  listing: SellerListing;
  orderData: Partial<OrderRelay>;
  buyerInfo?: {
    userId?: string;
    userType?: string;
    organizationId?: string;
    organizationType?: string;
  };
  productType?: string;
  metadata?: Record<string, any>;
}

export interface SettlementCreationContext {
  batch: Partial<SettlementBatch>;
  sellerId?: string;
  supplierId?: string;
  partnerId?: string;
  contextType: 'seller' | 'supplier' | 'partner' | 'pharmacy';
  periodStart: Date;
  periodEnd: Date;
  metadata?: Record<string, any>;
}

export interface CommissionContext {
  orderRelay: OrderRelay;
  orderAmount: number;
  productType?: string;
  category?: string;
  sellerId?: string;
  supplierId?: string;
  metadata?: Record<string, any>;
}

// ============================================
// Validation Hook Interfaces
// ============================================

export interface OfferValidationHook {
  /**
   * Offer 생성 전 검증 (before hook)
   * 기본 구현: always allow
   * 확장앱(Cosmetics/Pharmacy 등)이 override 가능
   */
  beforeOfferCreate(context: OfferCreationContext): Promise<ValidationResult>;

  /**
   * Offer 생성 후 처리 (after hook)
   * 확장앱에서 추가 처리 가능 (알림, 로깅 등)
   */
  afterOfferCreate(context: OfferCreationContext & { offerId: string }): Promise<void>;
}

export interface ListingValidationHook {
  /**
   * Listing 생성 전 검증 (before hook)
   * 기본 구현: always allow
   * Pharmacy Extension 등에서 Listing 금지 구현 가능
   */
  beforeListingCreate(context: ListingCreationContext): Promise<ValidationResult>;

  /**
   * Listing 생성 후 처리 (after hook)
   * 확장앱에서 추가 처리 가능 (가격 동기화 등)
   */
  afterListingCreate(context: ListingCreationContext & { listingId: string }): Promise<void>;
}

export interface OrderValidationHook {
  /**
   * Order 생성 전 검증 (before hook)
   * 기본 구현: allow
   * Pharmacy Extension에서 약국만 구매 허용 등 구현 가능
   */
  beforeOrderCreate(context: OrderCreationContext): Promise<ValidationResult>;

  /**
   * Order 생성 후 처리 (after hook)
   * 확장앱에서 추가 처리 가능 (재고 업데이트 등)
   */
  afterOrderCreate(context: OrderCreationContext & { orderId: string }): Promise<void>;
}

export interface SettlementValidationHook {
  /**
   * Settlement 생성 전 검증
   */
  beforeSettlementCreate(context: SettlementCreationContext): Promise<ValidationResult>;
}

export interface CommissionValidationHook {
  /**
   * Commission 적용 전 검증
   */
  beforeCommissionApply(context: CommissionContext): Promise<ValidationResult>;

  /**
   * Commission 적용 후 후처리
   */
  afterCommissionApply(context: CommissionContext & { commissionAmount: number }): Promise<void>;
}

// ============================================
// Default Implementations (Always Allow)
// ============================================

export const defaultOfferValidation: OfferValidationHook = {
  async beforeOfferCreate(_context: OfferCreationContext): Promise<ValidationResult> {
    return { valid: true, errors: [] };
  },
  async afterOfferCreate(_context: OfferCreationContext & { offerId: string }): Promise<void> {
    // No-op by default
  },
};

export const defaultListingValidation: ListingValidationHook = {
  async beforeListingCreate(_context: ListingCreationContext): Promise<ValidationResult> {
    return { valid: true, errors: [] };
  },
  async afterListingCreate(_context: ListingCreationContext & { listingId: string }): Promise<void> {
    // No-op by default
  },
};

export const defaultOrderValidation: OrderValidationHook = {
  async beforeOrderCreate(_context: OrderCreationContext): Promise<ValidationResult> {
    return { valid: true, errors: [] };
  },
  async afterOrderCreate(_context: OrderCreationContext & { orderId: string }): Promise<void> {
    // No-op by default
  },
};

export const defaultSettlementValidation: SettlementValidationHook = {
  async beforeSettlementCreate(_context: SettlementCreationContext): Promise<ValidationResult> {
    return { valid: true, errors: [] };
  },
};

export const defaultCommissionValidation: CommissionValidationHook = {
  async beforeCommissionApply(_context: CommissionContext): Promise<ValidationResult> {
    return { valid: true, errors: [] };
  },
  async afterCommissionApply(_context: CommissionContext & { commissionAmount: number }): Promise<void> {
    // No-op by default
  },
};

// ============================================
// Hook Registry
// ============================================

export class ValidationHookRegistry {
  private static instance: ValidationHookRegistry;

  private offerHooks: Map<string, OfferValidationHook> = new Map();
  private listingHooks: Map<string, ListingValidationHook> = new Map();
  private orderHooks: Map<string, OrderValidationHook> = new Map();
  private settlementHooks: Map<string, SettlementValidationHook> = new Map();
  private commissionHooks: Map<string, CommissionValidationHook> = new Map();

  private constructor() {
    // Register default hooks
    this.offerHooks.set('default', defaultOfferValidation);
    this.listingHooks.set('default', defaultListingValidation);
    this.orderHooks.set('default', defaultOrderValidation);
    this.settlementHooks.set('default', defaultSettlementValidation);
    this.commissionHooks.set('default', defaultCommissionValidation);
  }

  static getInstance(): ValidationHookRegistry {
    if (!ValidationHookRegistry.instance) {
      ValidationHookRegistry.instance = new ValidationHookRegistry();
    }
    return ValidationHookRegistry.instance;
  }

  // ===== Offer Hooks =====

  registerOfferHook(appId: string, hook: OfferValidationHook): void {
    this.offerHooks.set(appId, hook);
  }

  unregisterOfferHook(appId: string): void {
    this.offerHooks.delete(appId);
  }

  async beforeOfferCreate(context: OfferCreationContext): Promise<ValidationResult> {
    const results: ValidationResult[] = [];

    for (const [, hook] of this.offerHooks) {
      const result = await hook.beforeOfferCreate(context);
      results.push(result);
    }

    return this.mergeResults(results);
  }

  async afterOfferCreate(context: OfferCreationContext & { offerId: string }): Promise<void> {
    for (const [, hook] of this.offerHooks) {
      await hook.afterOfferCreate(context);
    }
  }

  // ===== Listing Hooks =====

  registerListingHook(appId: string, hook: ListingValidationHook): void {
    this.listingHooks.set(appId, hook);
  }

  unregisterListingHook(appId: string): void {
    this.listingHooks.delete(appId);
  }

  async beforeListingCreate(context: ListingCreationContext): Promise<ValidationResult> {
    const results: ValidationResult[] = [];

    for (const [, hook] of this.listingHooks) {
      const result = await hook.beforeListingCreate(context);
      results.push(result);
    }

    return this.mergeResults(results);
  }

  async afterListingCreate(context: ListingCreationContext & { listingId: string }): Promise<void> {
    for (const [, hook] of this.listingHooks) {
      await hook.afterListingCreate(context);
    }
  }

  // ===== Order Hooks =====

  registerOrderHook(appId: string, hook: OrderValidationHook): void {
    this.orderHooks.set(appId, hook);
  }

  unregisterOrderHook(appId: string): void {
    this.orderHooks.delete(appId);
  }

  async beforeOrderCreate(context: OrderCreationContext): Promise<ValidationResult> {
    const results: ValidationResult[] = [];

    for (const [, hook] of this.orderHooks) {
      const result = await hook.beforeOrderCreate(context);
      results.push(result);
    }

    return this.mergeResults(results);
  }

  async afterOrderCreate(context: OrderCreationContext & { orderId: string }): Promise<void> {
    for (const [, hook] of this.orderHooks) {
      await hook.afterOrderCreate(context);
    }
  }

  // ===== Settlement Hooks =====

  registerSettlementHook(appId: string, hook: SettlementValidationHook): void {
    this.settlementHooks.set(appId, hook);
  }

  unregisterSettlementHook(appId: string): void {
    this.settlementHooks.delete(appId);
  }

  async beforeSettlementCreate(context: SettlementCreationContext): Promise<ValidationResult> {
    const results: ValidationResult[] = [];

    for (const [, hook] of this.settlementHooks) {
      const result = await hook.beforeSettlementCreate(context);
      results.push(result);
    }

    return this.mergeResults(results);
  }

  // ===== Commission Hooks =====

  registerCommissionHook(appId: string, hook: CommissionValidationHook): void {
    this.commissionHooks.set(appId, hook);
  }

  unregisterCommissionHook(appId: string): void {
    this.commissionHooks.delete(appId);
  }

  async beforeCommissionApply(context: CommissionContext): Promise<ValidationResult> {
    const results: ValidationResult[] = [];

    for (const [, hook] of this.commissionHooks) {
      const result = await hook.beforeCommissionApply(context);
      results.push(result);
    }

    return this.mergeResults(results);
  }

  async afterCommissionApply(context: CommissionContext & { commissionAmount: number }): Promise<void> {
    for (const [, hook] of this.commissionHooks) {
      await hook.afterCommissionApply(context);
    }
  }

  // ===== Helper Methods =====

  private mergeResults(results: ValidationResult[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const result of results) {
      errors.push(...result.errors);
      if (result.warnings) {
        warnings.push(...result.warnings);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  // ===== Utility =====

  /**
   * 모든 훅 초기화 (테스트용)
   */
  reset(): void {
    this.offerHooks.clear();
    this.listingHooks.clear();
    this.orderHooks.clear();
    this.settlementHooks.clear();
    this.commissionHooks.clear();

    // Re-register defaults
    this.offerHooks.set('default', defaultOfferValidation);
    this.listingHooks.set('default', defaultListingValidation);
    this.orderHooks.set('default', defaultOrderValidation);
    this.settlementHooks.set('default', defaultSettlementValidation);
    this.commissionHooks.set('default', defaultCommissionValidation);
  }
}

// Singleton export
export const validationHooks = ValidationHookRegistry.getInstance();
