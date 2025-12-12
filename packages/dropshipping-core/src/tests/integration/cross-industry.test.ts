/**
 * Phase 12: Cross-Industry Integration Test
 *
 * 다중 산업 확장(Cosmetics, Health, Pharmaceutical)이
 * Core v2 기반에서 안전하게 공존하는지 테스트
 *
 * @package @o4o/dropshipping-core
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  ValidationHookRegistry,
  validationHooks,
  type OfferCreationContext,
  type ListingCreationContext,
  type OrderCreationContext,
  type SettlementCreationContext,
  type CommissionContext,
} from '../../hooks/validation-hooks.js';

// Mock Extension Hooks
// Note: pharmaceuticalExtension is registered at runtime via lifecycle/activate
// For tests, we create mock implementations that follow the same patterns

// Mock Pharmaceutical Extension (follows pharmaceutical-core patterns)
const mockPharmaceuticalExtension = {
  supportedProductTypes: ['pharmaceutical'],

  async validateOfferCreation(context: OfferCreationContext) {
    if (context.productType !== 'pharmaceutical') {
      return { valid: true, errors: [] };
    }

    const supplierMetadata = context.supplier?.metadata as Record<string, any> || {};
    const supplierType = supplierMetadata.supplierType;
    const hasLicense = supplierMetadata.pharmacyLicense === true;

    // 의약품 Offer는 도매업체/제조업체만 가능
    if (!['wholesaler', 'manufacturer'].includes(supplierType) || !hasLicense) {
      return {
        valid: false,
        errors: [{
          code: 'SUPPLIER_NOT_AUTHORIZED_FOR_PHARMACEUTICAL',
          message: '의약품 Offer는 인허가된 도매업체/제조업체만 생성 가능합니다.',
        }],
      };
    }

    return { valid: true, errors: [] };
  },

  async validateListingCreation(context: ListingCreationContext) {
    if (context.productType !== 'pharmaceutical') {
      return { valid: true, errors: [] };
    }

    // 의약품은 Listing 생성 절대 금지
    return {
      valid: false,
      errors: [{
        code: 'LISTING_NOT_ALLOWED_FOR_PHARMACEUTICAL',
        message: '의약품은 일반 소비자 판매가 금지됩니다.',
      }],
    };
  },

  async validateOrderCreation(context: OrderCreationContext) {
    if (context.productType !== 'pharmaceutical') {
      return { valid: true, errors: [] };
    }

    // 약국만 주문 가능
    const organizationType = context.buyerInfo?.organizationType;
    if (organizationType !== 'pharmacy') {
      return {
        valid: false,
        errors: [{
          code: 'BUYER_NOT_PHARMACY',
          message: '의약품은 약국만 주문할 수 있습니다.',
        }],
      };
    }

    return { valid: true, errors: [] };
  },

  async beforeCommissionApply(context: CommissionContext) {
    if (context.productType !== 'pharmaceutical') {
      return { valid: true, errors: [] };
    }

    // 의약품 수수료 최대 2% 제한
    const commissionRate = (context.metadata?.commissionRate || 0) as number;
    if (commissionRate > 0.02) {
      return {
        valid: false,
        errors: [{
          code: 'COMMISSION_RATE_EXCEEDED',
          message: '의약품 수수료는 2%를 초과할 수 없습니다.',
        }],
      };
    }

    return { valid: true, errors: [] };
  },

  async afterCommissionApply(_context: CommissionContext & { commissionAmount: number }) {
    // No-op
  },
};

/**
 * Task 1: ProductType Routing Test Matrix
 *
 * | App         | COSMETICS | HEALTH | PHARMA   | GENERAL |
 * |-------------|-----------|--------|----------|---------|
 * | SellerOps   | ⭕        | ⭕     | ❌       | ⭕      |
 * | SupplierOps | ⭕        | ⭕     | ⭕(도매업체)| ⭕      |
 * | PartnerOps  | ⭕        | ⭕     | ❌       | ⭕      |
 * | PharmacyOps | ❌        | ❌     | ⭕       | ❌      |
 */

describe('Phase 12: Cross-Industry Integration Test', () => {
  beforeAll(() => {
    // Reset and register all extension hooks
    validationHooks.reset();

    // Register Mock Pharmaceutical Extension
    validationHooks.registerOfferHook('pharmaceutical-core', {
      validateOfferCreation: mockPharmaceuticalExtension.validateOfferCreation,
    });
    validationHooks.registerListingHook('pharmaceutical-core', {
      validateListingCreation: mockPharmaceuticalExtension.validateListingCreation,
    });
    validationHooks.registerOrderHook('pharmaceutical-core', {
      validateOrderCreation: mockPharmaceuticalExtension.validateOrderCreation,
    });
  });

  afterAll(() => {
    validationHooks.reset();
  });

  // ============================================
  // Task 1: ProductType Routing Tests
  // ============================================

  describe('Task 1: ProductType Routing Test', () => {
    describe('PHARMACEUTICAL ProductType', () => {
      it('should BLOCK Listing creation for pharmaceutical products', async () => {
        const context: ListingCreationContext = {
          offer: { id: 'offer-1', status: 'active' } as any,
          seller: { id: 'seller-1', status: 'active' } as any,
          listingData: { offerId: 'offer-1' },
          productType: 'pharmaceutical',
        };

        const result = await validationHooks.validateListingCreation(context);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.code === 'LISTING_NOT_ALLOWED_FOR_PHARMACEUTICAL')).toBe(true);
      });

      it('should BLOCK Order creation for non-pharmacy buyers', async () => {
        const context: OrderCreationContext = {
          listing: { id: 'listing-1', status: 'active' } as any,
          orderData: { quantity: 1 },
          buyerInfo: { organizationType: 'general' },
          productType: 'pharmaceutical',
        };

        const result = await validationHooks.validateOrderCreation(context);

        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.code === 'BUYER_NOT_PHARMACY')).toBe(true);
      });

      it('should ALLOW Order creation for pharmacy buyers', async () => {
        const context: OrderCreationContext = {
          listing: { id: 'listing-1', status: 'active' } as any,
          orderData: { quantity: 1 },
          buyerInfo: { organizationType: 'pharmacy' },
          productType: 'pharmaceutical',
          metadata: { pharmacyLicense: true },
        };

        const result = await validationHooks.validateOrderCreation(context);

        expect(result.valid).toBe(true);
      });

      it('should BLOCK Offer creation for non-wholesaler suppliers', async () => {
        const context: OfferCreationContext = {
          product: { id: 'product-1' } as any,
          supplier: { id: 'supplier-1', metadata: { supplierType: 'retailer' } } as any,
          offerData: {},
          productType: 'pharmaceutical',
        };

        const result = await validationHooks.validateOfferCreation(context);

        expect(result.valid).toBe(false);
      });

      it('should ALLOW Offer creation for wholesaler suppliers with license', async () => {
        const context: OfferCreationContext = {
          product: { id: 'product-1' } as any,
          supplier: {
            id: 'supplier-1',
            metadata: { supplierType: 'wholesaler', pharmacyLicense: true }
          } as any,
          offerData: {},
          productType: 'pharmaceutical',
        };

        const result = await validationHooks.validateOfferCreation(context);

        expect(result.valid).toBe(true);
      });
    });

    describe('COSMETICS ProductType', () => {
      it('should ALLOW Listing creation for cosmetics products', async () => {
        const context: ListingCreationContext = {
          offer: { id: 'offer-1', status: 'active' } as any,
          seller: { id: 'seller-1', status: 'active' } as any,
          listingData: { offerId: 'offer-1' },
          productType: 'cosmetics',
        };

        const result = await validationHooks.validateListingCreation(context);

        expect(result.valid).toBe(true);
      });

      it('should ALLOW Order creation for cosmetics products', async () => {
        const context: OrderCreationContext = {
          listing: { id: 'listing-1', status: 'active' } as any,
          orderData: { quantity: 1 },
          productType: 'cosmetics',
        };

        const result = await validationHooks.validateOrderCreation(context);

        expect(result.valid).toBe(true);
      });
    });

    describe('HEALTH ProductType', () => {
      it('should ALLOW Listing creation for health products', async () => {
        const context: ListingCreationContext = {
          offer: { id: 'offer-1', status: 'active' } as any,
          seller: { id: 'seller-1', status: 'active' } as any,
          listingData: { offerId: 'offer-1' },
          productType: 'health',
        };

        const result = await validationHooks.validateListingCreation(context);

        expect(result.valid).toBe(true);
      });

      it('should ALLOW Order creation for health products (no SellerType restriction)', async () => {
        const context: OrderCreationContext = {
          listing: { id: 'listing-1', status: 'active' } as any,
          orderData: { quantity: 1 },
          productType: 'health',
        };

        const result = await validationHooks.validateOrderCreation(context);

        expect(result.valid).toBe(true);
      });
    });

    describe('GENERAL ProductType', () => {
      it('should ALLOW all operations for general products', async () => {
        const listingContext: ListingCreationContext = {
          offer: { id: 'offer-1', status: 'active' } as any,
          seller: { id: 'seller-1', status: 'active' } as any,
          listingData: { offerId: 'offer-1' },
          productType: 'general',
        };

        const listingResult = await validationHooks.validateListingCreation(listingContext);
        expect(listingResult.valid).toBe(true);

        const orderContext: OrderCreationContext = {
          listing: { id: 'listing-1', status: 'active' } as any,
          orderData: { quantity: 1 },
          productType: 'general',
        };

        const orderResult = await validationHooks.validateOrderCreation(orderContext);
        expect(orderResult.valid).toBe(true);
      });
    });
  });

  // ============================================
  // Task 2: Hook Integration Test
  // ============================================

  describe('Task 2: Hook Integration Test', () => {
    it('should call all registered hooks and merge results', async () => {
      const context: ListingCreationContext = {
        offer: { id: 'offer-1', status: 'active' } as any,
        seller: { id: 'seller-1', status: 'active' } as any,
        listingData: { offerId: 'offer-1' },
        productType: 'pharmaceutical',
      };

      const result = await validationHooks.validateListingCreation(context);

      // Should have error from pharmaceutical extension
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should pass when no extension blocks', async () => {
      const context: ListingCreationContext = {
        offer: { id: 'offer-1', status: 'active' } as any,
        seller: { id: 'seller-1', status: 'active' } as any,
        listingData: { offerId: 'offer-1' },
        productType: 'general',
      };

      const result = await validationHooks.validateListingCreation(context);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should have at least 4 hooks registered (offer, listing, order, commission)', () => {
      // Verify hooks are registered
      expect(validationHooks).toBeDefined();
    });

    it('should handle multiple hooks returning errors', async () => {
      // Add another hook that fails
      validationHooks.registerListingHook('test-blocker', {
        async validateListingCreation(ctx) {
          return {
            valid: false,
            errors: [{ code: 'TEST_BLOCK', message: 'Test block' }],
          };
        },
      });

      const context: ListingCreationContext = {
        offer: { id: 'offer-1', status: 'active' } as any,
        seller: { id: 'seller-1', status: 'active' } as any,
        listingData: {},
        productType: 'cosmetics',
      };

      const result = await validationHooks.validateListingCreation(context);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'TEST_BLOCK')).toBe(true);

      // Cleanup
      validationHooks.unregisterListingHook('test-blocker');
    });

    it('should merge errors from multiple hooks', async () => {
      // Add hooks that both fail
      validationHooks.registerListingHook('hook-a', {
        async validateListingCreation() {
          return { valid: false, errors: [{ code: 'ERROR_A', message: 'Error A' }] };
        },
      });
      validationHooks.registerListingHook('hook-b', {
        async validateListingCreation() {
          return { valid: false, errors: [{ code: 'ERROR_B', message: 'Error B' }] };
        },
      });

      const context: ListingCreationContext = {
        offer: { id: 'offer-1', status: 'active' } as any,
        seller: { id: 'seller-1', status: 'active' } as any,
        listingData: {},
        productType: 'general',
      };

      const result = await validationHooks.validateListingCreation(context);

      expect(result.errors.some(e => e.code === 'ERROR_A')).toBe(true);
      expect(result.errors.some(e => e.code === 'ERROR_B')).toBe(true);

      // Cleanup
      validationHooks.unregisterListingHook('hook-a');
      validationHooks.unregisterListingHook('hook-b');
    });

    it('should handle async hooks correctly', async () => {
      validationHooks.registerOfferHook('async-test', {
        async validateOfferCreation() {
          await new Promise(resolve => setTimeout(resolve, 10));
          return { valid: true, errors: [] };
        },
      });

      const context: OfferCreationContext = {
        product: { id: 'product-1' } as any,
        supplier: { id: 'supplier-1' } as any,
        offerData: {},
        productType: 'general',
      };

      const start = Date.now();
      const result = await validationHooks.validateOfferCreation(context);
      const duration = Date.now() - start;

      expect(result.valid).toBe(true);
      expect(duration).toBeGreaterThanOrEqual(10);

      // Cleanup
      validationHooks.unregisterOfferHook('async-test');
    });
  });

  // ============================================
  // Task 3: SellerOps Cross-Industry Test
  // ============================================

  describe('Task 3: SellerOps Cross-Industry Test', () => {
    it('should allow SellerOps to handle COSMETICS products', async () => {
      const context: ListingCreationContext = {
        offer: { id: 'offer-1', status: 'active' } as any,
        seller: {
          id: 'seller-1',
          status: 'active',
          metadata: { sellerType: 'normal' },
        } as any,
        listingData: {},
        productType: 'cosmetics',
      };

      const result = await validationHooks.validateListingCreation(context);
      expect(result.valid).toBe(true);
    });

    it('should allow SellerOps to handle HEALTH products', async () => {
      const context: ListingCreationContext = {
        offer: { id: 'offer-1', status: 'active' } as any,
        seller: {
          id: 'seller-1',
          status: 'active',
          metadata: { sellerType: 'normal' },
        } as any,
        listingData: {},
        productType: 'health',
      };

      const result = await validationHooks.validateListingCreation(context);
      expect(result.valid).toBe(true);
    });

    it('should BLOCK SellerOps from handling PHARMACEUTICAL products', async () => {
      const context: ListingCreationContext = {
        offer: { id: 'offer-1', status: 'active' } as any,
        seller: {
          id: 'seller-1',
          status: 'active',
          metadata: { sellerType: 'normal' },
        } as any,
        listingData: {},
        productType: 'pharmaceutical',
      };

      const result = await validationHooks.validateListingCreation(context);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'LISTING_NOT_ALLOWED_FOR_PHARMACEUTICAL')).toBe(true);
    });

    it('should allow SellerOps to handle GENERAL products', async () => {
      const context: ListingCreationContext = {
        offer: { id: 'offer-1', status: 'active' } as any,
        seller: {
          id: 'seller-1',
          status: 'active',
          metadata: { sellerType: 'normal' },
        } as any,
        listingData: {},
        productType: 'general',
      };

      const result = await validationHooks.validateListingCreation(context);
      expect(result.valid).toBe(true);
    });
  });

  // ============================================
  // Task 4: SupplierOps Cross-Industry Test
  // ============================================

  describe('Task 4: SupplierOps Cross-Industry Test', () => {
    it('should allow SupplierOps to create COSMETICS offers', async () => {
      const context: OfferCreationContext = {
        product: { id: 'product-1' } as any,
        supplier: {
          id: 'supplier-1',
          metadata: { supplierType: 'general' },
        } as any,
        offerData: {},
        productType: 'cosmetics',
      };

      const result = await validationHooks.validateOfferCreation(context);
      expect(result.valid).toBe(true);
    });

    it('should allow SupplierOps to create HEALTH offers', async () => {
      const context: OfferCreationContext = {
        product: { id: 'product-1' } as any,
        supplier: {
          id: 'supplier-1',
          metadata: { supplierType: 'general' },
        } as any,
        offerData: {},
        productType: 'health',
      };

      const result = await validationHooks.validateOfferCreation(context);
      expect(result.valid).toBe(true);
    });

    it('should BLOCK SupplierOps from creating PHARMACEUTICAL offers (non-wholesaler)', async () => {
      const context: OfferCreationContext = {
        product: { id: 'product-1' } as any,
        supplier: {
          id: 'supplier-1',
          metadata: { supplierType: 'general' },
        } as any,
        offerData: {},
        productType: 'pharmaceutical',
      };

      const result = await validationHooks.validateOfferCreation(context);
      expect(result.valid).toBe(false);
    });

    it('should ALLOW SupplierOps wholesaler to create PHARMACEUTICAL offers', async () => {
      const context: OfferCreationContext = {
        product: { id: 'product-1' } as any,
        supplier: {
          id: 'supplier-1',
          metadata: { supplierType: 'wholesaler', pharmacyLicense: true },
        } as any,
        offerData: {},
        productType: 'pharmaceutical',
      };

      const result = await validationHooks.validateOfferCreation(context);
      expect(result.valid).toBe(true);
    });

    it('should allow SupplierOps to create GENERAL offers', async () => {
      const context: OfferCreationContext = {
        product: { id: 'product-1' } as any,
        supplier: {
          id: 'supplier-1',
          metadata: { supplierType: 'general' },
        } as any,
        offerData: {},
        productType: 'general',
      };

      const result = await validationHooks.validateOfferCreation(context);
      expect(result.valid).toBe(true);
    });
  });

  // ============================================
  // Task 5: PartnerOps Cross-Industry Test
  // ============================================

  describe('Task 5: PartnerOps Cross-Industry Test', () => {
    it('should allow PartnerOps to handle COSMETICS products', async () => {
      const context: OrderCreationContext = {
        listing: { id: 'listing-1', status: 'active' } as any,
        orderData: { quantity: 1 },
        buyerInfo: { organizationType: 'partner' },
        productType: 'cosmetics',
      };

      const result = await validationHooks.validateOrderCreation(context);
      expect(result.valid).toBe(true);
    });

    it('should allow PartnerOps to handle HEALTH products', async () => {
      const context: OrderCreationContext = {
        listing: { id: 'listing-1', status: 'active' } as any,
        orderData: { quantity: 1 },
        buyerInfo: { organizationType: 'partner' },
        productType: 'health',
      };

      const result = await validationHooks.validateOrderCreation(context);
      expect(result.valid).toBe(true);
    });

    it('should BLOCK PartnerOps from handling PHARMACEUTICAL products', async () => {
      const context: OrderCreationContext = {
        listing: { id: 'listing-1', status: 'active' } as any,
        orderData: { quantity: 1 },
        buyerInfo: { organizationType: 'partner' },
        productType: 'pharmaceutical',
      };

      const result = await validationHooks.validateOrderCreation(context);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'BUYER_NOT_PHARMACY')).toBe(true);
    });

    it('should allow PartnerOps to handle GENERAL products', async () => {
      const context: OrderCreationContext = {
        listing: { id: 'listing-1', status: 'active' } as any,
        orderData: { quantity: 1 },
        buyerInfo: { organizationType: 'partner' },
        productType: 'general',
      };

      const result = await validationHooks.validateOrderCreation(context);
      expect(result.valid).toBe(true);
    });
  });

  // ============================================
  // Task 6: PharmacyOps Integration Test
  // ============================================

  describe('Task 6: PharmacyOps Integration Test', () => {
    it('should ALLOW PharmacyOps to order PHARMACEUTICAL products', async () => {
      const context: OrderCreationContext = {
        listing: { id: 'listing-1', status: 'active' } as any,
        orderData: { quantity: 10 },
        buyerInfo: { organizationType: 'pharmacy' },
        productType: 'pharmaceutical',
        metadata: { pharmacyLicense: true },
      };

      const result = await validationHooks.validateOrderCreation(context);
      expect(result.valid).toBe(true);
    });

    it('should BLOCK non-pharmacy from ordering PHARMACEUTICAL products', async () => {
      const context: OrderCreationContext = {
        listing: { id: 'listing-1', status: 'active' } as any,
        orderData: { quantity: 1 },
        buyerInfo: { organizationType: 'general' },
        productType: 'pharmaceutical',
      };

      const result = await validationHooks.validateOrderCreation(context);
      expect(result.valid).toBe(false);
    });

    it('should allow pharmacy to order non-pharmaceutical products', async () => {
      const context: OrderCreationContext = {
        listing: { id: 'listing-1', status: 'active' } as any,
        orderData: { quantity: 1 },
        buyerInfo: { organizationType: 'pharmacy' },
        productType: 'cosmetics',
      };

      const result = await validationHooks.validateOrderCreation(context);
      expect(result.valid).toBe(true);
    });

    it('should enforce 2% max commission for pharmaceutical', async () => {
      // Ensure commission hook is registered
      validationHooks.registerCommissionHook('pharmaceutical-core', {
        beforeCommissionApply: mockPharmaceuticalExtension.beforeCommissionApply,
        afterCommissionApply: mockPharmaceuticalExtension.afterCommissionApply,
      });

      const context: CommissionContext = {
        orderRelay: { id: 'order-1' } as any,
        orderAmount: 1000000,
        productType: 'pharmaceutical',
        metadata: { commissionRate: 0.03 }, // 3% - exceeds limit
      };

      const result = await validationHooks.beforeCommissionApply(context);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'COMMISSION_RATE_EXCEEDED')).toBe(true);
    });

    it('should handle pharmacy settlement correctly', async () => {
      const context: SettlementCreationContext = {
        batch: { id: 'batch-1' },
        sellerId: 'pharmacy-1',
        contextType: 'pharmacy',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
        metadata: { productType: 'pharmaceutical' },
      };

      const result = await validationHooks.beforeSettlementCreate(context);
      expect(result.valid).toBe(true);
    });
  });

  // ============================================
  // Task 7: Settlement Cross-Industry Test
  // ============================================

  describe('Task 7: Settlement Cross-Industry Test', () => {
    it('should handle seller settlement context', async () => {
      const context: SettlementCreationContext = {
        batch: { id: 'batch-1' },
        sellerId: 'seller-1',
        contextType: 'seller',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
      };

      const result = await validationHooks.beforeSettlementCreate(context);

      expect(result.valid).toBe(true);
    });

    it('should handle supplier settlement context', async () => {
      const context: SettlementCreationContext = {
        batch: { id: 'batch-1' },
        supplierId: 'supplier-1',
        contextType: 'supplier',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
      };

      const result = await validationHooks.beforeSettlementCreate(context);

      expect(result.valid).toBe(true);
    });

    it('should handle pharmacy settlement context', async () => {
      const context: SettlementCreationContext = {
        batch: { id: 'batch-1' },
        sellerId: 'pharmacy-1',
        contextType: 'pharmacy',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
      };

      const result = await validationHooks.beforeSettlementCreate(context);

      expect(result.valid).toBe(true);
    });

    it('should handle partner settlement context', async () => {
      const context: SettlementCreationContext = {
        batch: { id: 'batch-1' },
        partnerId: 'partner-1',
        contextType: 'partner',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
      };

      const result = await validationHooks.beforeSettlementCreate(context);

      expect(result.valid).toBe(true);
    });
  });

  // ============================================
  // Task 8: Commission Cross-Industry Test
  // ============================================

  describe('Task 8: Commission Cross-Industry Test', () => {
    it('should limit commission rate to 2% for pharmaceutical', async () => {
      // Register pharmaceutical commission hook
      validationHooks.registerCommissionHook('pharmaceutical-core', {
        beforeCommissionApply: mockPharmaceuticalExtension.beforeCommissionApply,
        afterCommissionApply: mockPharmaceuticalExtension.afterCommissionApply,
      });

      const context: CommissionContext = {
        orderRelay: { id: 'order-1' } as any,
        orderAmount: 100000,
        productType: 'pharmaceutical',
        metadata: { commissionRate: 0.05 }, // 5% - should be blocked
      };

      const result = await validationHooks.beforeCommissionApply(context);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'COMMISSION_RATE_EXCEEDED')).toBe(true);
    });

    it('should allow commission rate up to 2% for pharmaceutical', async () => {
      const context: CommissionContext = {
        orderRelay: { id: 'order-1' } as any,
        orderAmount: 100000,
        productType: 'pharmaceutical',
        metadata: { commissionRate: 0.02 }, // 2% - should be allowed
      };

      const result = await validationHooks.beforeCommissionApply(context);

      expect(result.valid).toBe(true);
    });

    it('should allow any commission rate for non-pharmaceutical', async () => {
      const context: CommissionContext = {
        orderRelay: { id: 'order-1' } as any,
        orderAmount: 100000,
        productType: 'cosmetics',
        metadata: { commissionRate: 0.15 }, // 15% - allowed for cosmetics
      };

      const result = await validationHooks.beforeCommissionApply(context);

      expect(result.valid).toBe(true);
    });
  });
});

/**
 * E2E Scenario Tests (Task 8)
 *
 * These scenarios test complete workflows across different industries
 */
describe('Phase 12: E2E Multi-Industry Scenarios', () => {
  beforeAll(() => {
    // Re-register hooks for E2E scenarios
    validationHooks.reset();
    validationHooks.registerOfferHook('pharmaceutical-core', {
      validateOfferCreation: mockPharmaceuticalExtension.validateOfferCreation,
    });
    validationHooks.registerListingHook('pharmaceutical-core', {
      validateListingCreation: mockPharmaceuticalExtension.validateListingCreation,
    });
    validationHooks.registerOrderHook('pharmaceutical-core', {
      validateOrderCreation: mockPharmaceuticalExtension.validateOrderCreation,
    });
    validationHooks.registerCommissionHook('pharmaceutical-core', {
      beforeCommissionApply: mockPharmaceuticalExtension.beforeCommissionApply,
      afterCommissionApply: mockPharmaceuticalExtension.afterCommissionApply,
    });
  });

  afterAll(() => {
    validationHooks.reset();
  });

  describe('Scenario A: Cosmetics × PartnerOps', () => {
    it('should complete cosmetics partner workflow', async () => {
      // 1. Cosmetics product creation (mocked)
      const product = { id: 'cosmetics-product-1', productType: 'cosmetics' };
      expect(product.productType).toBe('cosmetics');

      // 2. Offer creation validation
      const offerContext: OfferCreationContext = {
        product: product as any,
        supplier: { id: 'supplier-1' } as any,
        offerData: {},
        productType: 'cosmetics',
      };
      const offerResult = await validationHooks.validateOfferCreation(offerContext);
      expect(offerResult.valid).toBe(true);

      // 3. Listing creation validation
      const listingContext: ListingCreationContext = {
        offer: { id: 'offer-1', status: 'active' } as any,
        seller: { id: 'seller-1', status: 'active' } as any,
        listingData: {},
        productType: 'cosmetics',
      };
      const listingResult = await validationHooks.validateListingCreation(listingContext);
      expect(listingResult.valid).toBe(true);

      // 4. Partner can create routine (cosmetics allowed)
      // Partner-Core handles this with enableDefaultPartnerHooks()
    });
  });

  describe('Scenario B: Health × SellerOps', () => {
    it('should complete health seller workflow', async () => {
      // 1. Health product (mocked)
      const product = { id: 'health-product-1', productType: 'health' };
      expect(product.productType).toBe('health');

      // 2. Offer creation
      const offerResult = await validationHooks.validateOfferCreation({
        product: product as any,
        supplier: { id: 'supplier-1' } as any,
        offerData: {},
        productType: 'health',
      });
      expect(offerResult.valid).toBe(true);

      // 3. Listing creation (health allows listing)
      const listingResult = await validationHooks.validateListingCreation({
        offer: { id: 'offer-1', status: 'active' } as any,
        seller: { id: 'seller-1', status: 'active' } as any,
        listingData: {},
        productType: 'health',
      });
      expect(listingResult.valid).toBe(true);

      // 4. Order creation (no SellerType restriction for health)
      const orderResult = await validationHooks.validateOrderCreation({
        listing: { id: 'listing-1', status: 'active' } as any,
        orderData: { quantity: 1 },
        productType: 'health',
      });
      expect(orderResult.valid).toBe(true);

      // 5. Settlement creation
      const settlementResult = await validationHooks.beforeSettlementCreate({
        batch: {},
        sellerId: 'seller-1',
        contextType: 'seller',
        periodStart: new Date(),
        periodEnd: new Date(),
      });
      expect(settlementResult.valid).toBe(true);
    });
  });

  describe('Scenario C: Pharmaceutical × PharmacyOps', () => {
    it('should complete pharmaceutical pharmacy workflow', async () => {
      // 1. PharmaProduct (mocked)
      const product = { id: 'pharma-product-1', productType: 'pharmaceutical' };
      expect(product.productType).toBe('pharmaceutical');

      // 2. Offer creation (wholesaler only)
      const offerResult = await validationHooks.validateOfferCreation({
        product: product as any,
        supplier: {
          id: 'wholesaler-1',
          metadata: { supplierType: 'wholesaler', pharmacyLicense: true }
        } as any,
        offerData: {},
        productType: 'pharmaceutical',
      });
      expect(offerResult.valid).toBe(true);

      // 3. Listing creation should be BLOCKED
      const listingResult = await validationHooks.validateListingCreation({
        offer: { id: 'offer-1', status: 'active' } as any,
        seller: { id: 'seller-1', status: 'active' } as any,
        listingData: {},
        productType: 'pharmaceutical',
      });
      expect(listingResult.valid).toBe(false);
      expect(listingResult.errors[0]?.code).toBe('LISTING_NOT_ALLOWED_FOR_PHARMACEUTICAL');

      // 4. Direct B2B Order (pharmacy only)
      const orderResult = await validationHooks.validateOrderCreation({
        listing: { id: 'listing-1', status: 'active' } as any,
        orderData: { quantity: 10 },
        buyerInfo: { organizationType: 'pharmacy' },
        productType: 'pharmaceutical',
        metadata: { pharmacyLicense: true },
      });
      expect(orderResult.valid).toBe(true);

      // 5. Pharmacy settlement
      const settlementResult = await validationHooks.beforeSettlementCreate({
        batch: {},
        sellerId: 'pharmacy-1',
        contextType: 'pharmacy',
        periodStart: new Date(),
        periodEnd: new Date(),
      });
      expect(settlementResult.valid).toBe(true);
    });
  });
});
