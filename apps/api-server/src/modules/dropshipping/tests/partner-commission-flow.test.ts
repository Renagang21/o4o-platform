/**
 * Partner Commission Flow Integration Tests
 * Phase B-4 Step 9 - Tests Partner commission tracking through settlement
 */

import { initializeTestDatabase, closeTestDatabase, clearTestDatabase } from '../../../__tests__/setup/test-database';
import { createCompleteTestScenario } from '../../../__tests__/setup/test-fixtures';
import { SettlementManagementService } from '../services/SettlementManagementService';

describe('Partner Commission Flow Integration Tests', () => {
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

  describe('Partner Settlement Generation', () => {
    it('should generate partner settlement for referral order', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { order, partner } = scenario;

      expect(partner).toBeDefined();

      // Act
      const result = await settlementMgmtService.generateSettlement(order.id);

      // Assert
      const partnerSettlement = result.settlements.find(
        s => s.partyType === 'partner' && s.partyId === partner.id
      );

      expect(partnerSettlement).toBeDefined();
      expect(partnerSettlement?.status).toBe('PENDING');
    });

    it('should calculate 5% partner commission', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { order, partner } = scenario;
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

    it('should link partner settlement to order', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { order, partner } = scenario;

      // Act
      const result = await settlementMgmtService.generateSettlement(order.id);

      // Assert
      const partnerSettlement = result.settlements.find(
        s => s.partyType === 'partner'
      );

      expect(partnerSettlement).toBeDefined();

      if (partnerSettlement && partnerSettlement.metadata) {
        const meta = partnerSettlement.metadata as Record<string, unknown>;
        expect(meta.tag).toBe(`order-${order.id}`);
      }
    });
  });

  describe('Partner Commission Workflow', () => {
    it('should transition partner settlement through status workflow', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { order } = scenario;

      // Act 1: Generate settlement
      const generated = await settlementMgmtService.generateSettlement(order.id);
      const partnerSettlement = generated.settlements.find(s => s.partyType === 'partner');

      expect(partnerSettlement).toBeDefined();
      expect(partnerSettlement?.status).toBe('PENDING');

      // Act 2: Finalize settlement
      if (partnerSettlement) {
        const finalized = await settlementMgmtService.finalizeSettlement(partnerSettlement.id);
        expect(finalized.status).toBe('PROCESSING');

        // Act 3: Mark as paid
        const paid = await settlementMgmtService.markAsPaid(partnerSettlement.id);
        expect(paid.status).toBe('PAID');
        expect(paid.paidAt).toBeDefined();
      }
    });
  });

  describe('Multi-Order Partner Commission', () => {
    it('should generate separate settlements for multiple orders', async () => {
      // Arrange
      const scenario1 = await createCompleteTestScenario();
      const scenario2 = await createCompleteTestScenario();

      // Act
      const result1 = await settlementMgmtService.generateSettlement(scenario1.order.id);
      const result2 = await settlementMgmtService.generateSettlement(scenario2.order.id);

      // Assert
      const partner1Settlement = result1.settlements.find(s => s.partyType === 'partner');
      const partner2Settlement = result2.settlements.find(s => s.partyType === 'partner');

      expect(partner1Settlement).toBeDefined();
      expect(partner2Settlement).toBeDefined();

      // Settlements should be different records
      expect(partner1Settlement?.id).not.toBe(partner2Settlement?.id);
    });
  });

  describe('Partner Commission Edge Cases', () => {
    it('should not generate partner settlement for order without partner', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { seller, supplier, buyer, product } = scenario;

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

      // Assert
      const partnerSettlement = result.settlements.find(s => s.partyType === 'partner');
      expect(partnerSettlement).toBeUndefined();
    });

    it('should calculate commission based on order total, not item price', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { order, partner } = scenario;
      const orderItem = order.items[0];

      // Act
      const result = await settlementMgmtService.generateSettlement(order.id);

      // Assert
      const partnerSettlement = result.settlements.find(
        s => s.partyType === 'partner' && s.partyId === partner.id
      );

      if (partnerSettlement) {
        const partnerAmount = parseFloat(partnerSettlement.payableAmount);
        // Should be 5% of totalPrice, not unitPrice
        const expectedCommission = orderItem.totalPrice * 0.05;
        expect(partnerAmount).toBeCloseTo(expectedCommission, 0);
      }
    });
  });
});
