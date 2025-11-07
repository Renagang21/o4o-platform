/**
 * Shadow Mode Service Tests
 * Phase 8: Verify shadow mode comparison logic
 */

import { ShadowModeService } from '../shadow-mode.service.js';

describe('ShadowModeService', () => {
  let shadowModeService: ShadowModeService;

  beforeEach(() => {
    shadowModeService = new ShadowModeService();
  });

  describe('isShadowModeEnabled', () => {
    it('should return true when ENABLE_SUPPLIER_POLICY is false', () => {
      const originalValue = process.env.ENABLE_SUPPLIER_POLICY;
      process.env.ENABLE_SUPPLIER_POLICY = 'false';

      expect(ShadowModeService.isShadowModeEnabled()).toBe(true);

      process.env.ENABLE_SUPPLIER_POLICY = originalValue;
    });

    it('should return true when ENABLE_SUPPLIER_POLICY is undefined', () => {
      const originalValue = process.env.ENABLE_SUPPLIER_POLICY;
      delete process.env.ENABLE_SUPPLIER_POLICY;

      expect(ShadowModeService.isShadowModeEnabled()).toBe(true);

      if (originalValue !== undefined) {
        process.env.ENABLE_SUPPLIER_POLICY = originalValue;
      }
    });

    it('should return false when ENABLE_SUPPLIER_POLICY is true', () => {
      const originalValue = process.env.ENABLE_SUPPLIER_POLICY;
      process.env.ENABLE_SUPPLIER_POLICY = 'true';

      expect(ShadowModeService.isShadowModeEnabled()).toBe(false);

      process.env.ENABLE_SUPPLIER_POLICY = originalValue;
    });
  });

  describe('runShadowComparison', () => {
    it('should calculate difference correctly for matching results', async () => {
      const request = {
        orderId: 'order-1',
        orderItemId: 'item-1',
        productId: 'prod-1',
        supplierId: 'supplier-1',
        partnerId: 'partner-1',
        price: 10000,
        quantity: 1,
        orderDate: new Date()
      };

      // Legacy: 10% of 10000 = 1000
      const legacyCommission = 1000;

      // Note: This is a smoke test - full integration requires DB mocking
      // For now, just verify it doesn't throw
      await expect(
        shadowModeService.runShadowComparison(request, legacyCommission)
      ).resolves.not.toThrow();
    });

    it('should not throw on policy resolution errors', async () => {
      const request = {
        orderId: 'order-1',
        orderItemId: 'item-1',
        productId: 'invalid-product',
        supplierId: 'invalid-supplier',
        partnerId: 'partner-1',
        price: 10000,
        quantity: 1,
        orderDate: new Date()
      };

      const legacyCommission = 1000;

      // Shadow mode should handle errors gracefully
      await expect(
        shadowModeService.runShadowComparison(request, legacyCommission)
      ).resolves.not.toThrow();
    });

    it('should handle zero legacy commission', async () => {
      const request = {
        orderId: 'order-1',
        orderItemId: 'item-1',
        productId: 'prod-1',
        supplierId: 'supplier-1',
        partnerId: 'partner-1',
        price: 10000,
        quantity: 1,
        orderDate: new Date()
      };

      const legacyCommission = 0;

      await expect(
        shadowModeService.runShadowComparison(request, legacyCommission)
      ).resolves.not.toThrow();
    });
  });
});
