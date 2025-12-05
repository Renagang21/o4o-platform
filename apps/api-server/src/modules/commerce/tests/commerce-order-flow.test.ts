/**
 * Commerce Order Flow Integration Tests
 * Phase B-4 Step 9 - Tests Order Creation → Settlement Generation workflow
 */

import { initializeTestDatabase, closeTestDatabase, clearTestDatabase } from '../../../__tests__/setup/test-database';
import { createCompleteTestScenario } from '../../../__tests__/setup/test-fixtures';
import { SettlementManagementService } from '../../dropshipping/services/SettlementManagementService';
import { OrderStatus, PaymentStatus } from '../entities/Order';

describe('Commerce Order Flow Integration Tests', () => {
  let settlementMgmtService: SettlementManagementService;

  beforeAll(async () => {
    await initializeTestDatabase();
    settlementMgmtService = new SettlementManagementService();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe('Order Creation', () => {
    it('should create order with required fields', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { order } = scenario;

      // Assert
      expect(order).toBeDefined();
      expect(order.id).toBeDefined();
      expect(order.orderNumber).toBeDefined();
      expect(order.buyerId).toBeDefined();
      expect(order.items).toBeDefined();
      expect(order.items.length).toBeGreaterThan(0);
    });

    it('should create order with correct party information', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { order, seller, supplier } = scenario;

      // Assert
      const orderItem = order.items[0];
      expect(orderItem.sellerId).toBe(seller.id);
      expect(orderItem.supplierId).toBe(supplier.id);
    });

    it('should store immutable pricing snapshots', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { order } = scenario;

      // Assert
      const orderItem = order.items[0];
      expect(orderItem.basePriceSnapshot).toBeDefined();
      expect(orderItem.commissionAmount).toBeDefined();
      expect(orderItem.unitPrice).toBeDefined();
      expect(orderItem.totalPrice).toBeDefined();
    });

    it('should include partner information if present', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { order, partner } = scenario;

      // Assert
      if (partner) {
        const orderItem = order.items[0];
        expect(orderItem.attributes).toBeDefined();

        if (orderItem.attributes) {
          const attrs = orderItem.attributes as Record<string, unknown>;
          expect(attrs.partnerId).toBe(partner.id);
        }
      }
    });
  });

  describe('Order → Settlement Integration', () => {
    it('should generate settlements for completed order', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { order } = scenario;

      // Ensure order is completed
      expect(order).toBeDefined();

      // Act
      const result = await settlementMgmtService.generateSettlement(order.id);

      // Assert
      expect(result).toBeDefined();
      expect(result.settlements).toBeDefined();
      expect(result.settlements.length).toBeGreaterThan(0);
      expect(result.settlementItems.length).toBeGreaterThan(0);
    });

    it('should create settlement for each party in order', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { order, seller, supplier, partner } = scenario;

      // Act
      const result = await settlementMgmtService.generateSettlement(order.id);

      // Assert
      const sellerSettlement = result.settlements.find(
        s => s.partyType === 'seller' && s.partyId === seller.id
      );
      const supplierSettlement = result.settlements.find(
        s => s.partyType === 'supplier' && s.partyId === supplier.id
      );

      expect(sellerSettlement).toBeDefined();
      expect(supplierSettlement).toBeDefined();

      if (partner) {
        const partnerSettlement = result.settlements.find(
          s => s.partyType === 'partner' && s.partyId === partner.id
        );
        expect(partnerSettlement).toBeDefined();
      }
    });

    it('should calculate correct settlement amounts', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { order } = scenario;
      const orderItem = order.items[0];

      // Expected calculations based on default rules (20% seller, 5% partner)
      const expectedSellerPayable = orderItem.totalPrice - (orderItem.totalPrice * 0.2);
      const expectedPartnerCommission = orderItem.totalPrice * 0.05;

      // Act
      const result = await settlementMgmtService.generateSettlement(order.id);

      // Assert
      const sellerSettlement = result.settlements.find(s => s.partyType === 'seller');
      const partnerSettlement = result.settlements.find(s => s.partyType === 'partner');

      if (sellerSettlement) {
        const sellerAmount = parseFloat(sellerSettlement.payableAmount);
        // Seller pays commission, so amount should be less than total
        expect(sellerAmount).toBeLessThan(orderItem.totalPrice);
      }

      if (partnerSettlement) {
        const partnerAmount = parseFloat(partnerSettlement.payableAmount);
        expect(partnerAmount).toBeGreaterThan(0);
        expect(partnerAmount).toBeCloseTo(expectedPartnerCommission, 0);
      }
    });

    it('should link settlement items to order items', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { order } = scenario;

      // Act
      const result = await settlementMgmtService.generateSettlement(order.id);

      // Assert
      for (const orderItem of order.items) {
        const matchingSettlementItem = result.settlementItems.find(
          si => si.orderId === order.id && si.orderItemId === orderItem.id
        );
        expect(matchingSettlementItem).toBeDefined();
      }
    });
  });

  describe('Commission Calculation', () => {
    it('should calculate seller commission correctly (20%)', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { order } = scenario;
      const orderItem = order.items[0];
      const expectedCommission = orderItem.totalPrice * 0.2;

      // Act
      const result = await settlementMgmtService.generateSettlement(order.id);

      // Assert
      const sellerSettlement = result.settlements.find(s => s.partyType === 'seller');
      expect(sellerSettlement).toBeDefined();

      if (sellerSettlement) {
        const sellerAmount = parseFloat(sellerSettlement.payableAmount);
        const impliedCommission = orderItem.totalPrice - sellerAmount;
        expect(impliedCommission).toBeCloseTo(expectedCommission, 0);
      }
    });

    it('should calculate partner commission correctly (5%)', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { order, partner } = scenario;

      if (!partner) {
        return; // Skip if no partner
      }

      const orderItem = order.items[0];
      const expectedCommission = orderItem.totalPrice * 0.05;

      // Act
      const result = await settlementMgmtService.generateSettlement(order.id);

      // Assert
      const partnerSettlement = result.settlements.find(
        s => s.partyType === 'partner' && s.partyId === partner.id
      );

      expect(partnerSettlement).toBeDefined();

      if (partnerSettlement) {
        const partnerAmount = parseFloat(partnerSettlement.payableAmount);
        expect(partnerAmount).toBeCloseTo(expectedCommission, 0);
      }
    });

    it('should give supplier full base price (0% commission)', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { order, supplier } = scenario;
      const orderItem = order.items[0];
      const expectedAmount = orderItem.basePriceSnapshot * orderItem.quantity;

      // Act
      const result = await settlementMgmtService.generateSettlement(order.id);

      // Assert
      const supplierSettlement = result.settlements.find(
        s => s.partyType === 'supplier' && s.partyId === supplier.id
      );

      expect(supplierSettlement).toBeDefined();

      if (supplierSettlement) {
        const supplierAmount = parseFloat(supplierSettlement.payableAmount);
        expect(supplierAmount).toBeCloseTo(expectedAmount, 0);
      }
    });
  });

  describe('Multi-Order Scenarios', () => {
    it('should handle multiple orders from same parties', async () => {
      // Arrange
      const scenario1 = await createCompleteTestScenario();
      const scenario2 = await createCompleteTestScenario();

      // Act
      const result1 = await settlementMgmtService.generateSettlement(scenario1.order.id);
      const result2 = await settlementMgmtService.generateSettlement(scenario2.order.id);

      // Assert
      expect(result1.settlements.length).toBeGreaterThan(0);
      expect(result2.settlements.length).toBeGreaterThan(0);

      // Each order should have separate settlements
      expect(result1.settlements[0].id).not.toBe(result2.settlements[0].id);
    });

    it('should maintain separate settlement records per order', async () => {
      // Arrange
      const scenario1 = await createCompleteTestScenario();
      const scenario2 = await createCompleteTestScenario();

      // Act
      const result1 = await settlementMgmtService.generateSettlement(scenario1.order.id);
      const result2 = await settlementMgmtService.generateSettlement(scenario2.order.id);

      // Assert - Check settlement metadata tags
      for (const settlement of result1.settlements) {
        if (settlement.metadata) {
          const meta = settlement.metadata as Record<string, unknown>;
          expect(meta.tag).toBe(`order-${scenario1.order.id}`);
        }
      }

      for (const settlement of result2.settlements) {
        if (settlement.metadata) {
          const meta = settlement.metadata as Record<string, unknown>;
          expect(meta.tag).toBe(`order-${scenario2.order.id}`);
        }
      }
    });
  });

  describe('Edge Cases', () => {
    it('should throw error for non-existent order', async () => {
      // Arrange
      const fakeOrderId = '00000000-0000-0000-0000-000000000099';

      // Act & Assert
      await expect(
        settlementMgmtService.generateSettlement(fakeOrderId)
      ).rejects.toThrow();
    });

    it('should handle order without partner gracefully', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { order, seller, supplier, buyer, product } = scenario;

      // Create order without partner
      const { createTestOrder } = await import('../../../__tests__/setup/test-fixtures');
      const orderWithoutPartner = await createTestOrder({
        buyerId: buyer.id,
        sellerId: seller.id,
        supplierId: supplier.id,
        productId: product.id
        // No partnerId
      });

      // Act
      const result = await settlementMgmtService.generateSettlement(orderWithoutPartner.id);

      // Assert - Should still generate settlements for seller + supplier
      expect(result.settlements.length).toBeGreaterThanOrEqual(2);

      const sellerSettlement = result.settlements.find(s => s.partyType === 'seller');
      const supplierSettlement = result.settlements.find(s => s.partyType === 'supplier');

      expect(sellerSettlement).toBeDefined();
      expect(supplierSettlement).toBeDefined();
    });
  });
});
