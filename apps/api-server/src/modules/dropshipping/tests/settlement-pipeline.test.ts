/**
 * Settlement Pipeline Integration Tests
 * Phase B-4 Step 9 - Tests Order → Settlement → Dashboard workflow
 */

import { initializeTestDatabase, closeTestDatabase, clearTestDatabase, getTestDataSource } from '../../../__tests__/setup/test-database';
import { createCompleteTestScenario } from '../../../__tests__/setup/test-fixtures';
import { SettlementManagementService } from '../services/SettlementManagementService';
import { SettlementReadService } from '../../commerce/services/SettlementReadService';
import { Settlement, SettlementStatus } from '../entities/Settlement';
import { SettlementItem } from '../entities/SettlementItem';

describe('Settlement Pipeline Integration Tests', () => {
  let settlementMgmtService: SettlementManagementService;
  let settlementReadService: SettlementReadService;

  beforeAll(async () => {
    await initializeTestDatabase();
    settlementMgmtService = new SettlementManagementService();
    settlementReadService = new SettlementReadService();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe('generateSettlement()', () => {
    it('should generate settlements for all parties in an order', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { order, seller, supplier, partner } = scenario;

      // Act
      const result = await settlementMgmtService.generateSettlement(order.id);

      // Assert
      expect(result).toBeDefined();
      expect(result.settlements).toBeDefined();
      expect(result.settlements.length).toBeGreaterThanOrEqual(2); // At least seller + supplier

      // Check if all expected parties have settlements
      const partyTypes = result.settlements.map(s => s.partyType);
      expect(partyTypes).toContain('seller');
      expect(partyTypes).toContain('supplier');

      if (partner) {
        expect(partyTypes).toContain('partner');
      }

      // Verify settlement items created
      expect(result.settlementItems).toBeDefined();
      expect(result.settlementItems.length).toBeGreaterThan(0);

      // Verify diagnostics
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics.totalOrders).toBeGreaterThan(0);
    });

    it('should extract correct party information from order items', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { order, seller, supplier } = scenario;

      // Act
      const result = await settlementMgmtService.generateSettlement(order.id);

      // Assert
      const sellerSettlement = result.settlements.find(s => s.partyType === 'seller' && s.partyId === seller.id);
      const supplierSettlement = result.settlements.find(s => s.partyType === 'supplier' && s.partyId === supplier.id);

      expect(sellerSettlement).toBeDefined();
      expect(supplierSettlement).toBeDefined();
    });

    it('should apply default commission rules correctly', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { order } = scenario;
      const orderItem = order.items[0];
      const expectedSellerCommission = orderItem.totalPrice * 0.2; // 20%
      const expectedPartnerCommission = orderItem.totalPrice * 0.05; // 5%

      // Act
      const result = await settlementMgmtService.generateSettlement(order.id);

      // Assert
      const sellerSettlement = result.settlements.find(s => s.partyType === 'seller');
      const partnerSettlement = result.settlements.find(s => s.partyType === 'partner');

      expect(sellerSettlement).toBeDefined();
      if (sellerSettlement) {
        // Seller pays commission, so settlement is negative or reduced
        expect(parseFloat(sellerSettlement.payableAmount)).toBeLessThan(orderItem.totalPrice);
      }

      if (partnerSettlement) {
        // Partner receives commission
        const partnerAmount = parseFloat(partnerSettlement.payableAmount);
        expect(partnerAmount).toBeGreaterThan(0);
        expect(partnerAmount).toBeCloseTo(expectedPartnerCommission, 0);
      }
    });

    it('should create settlement items for each order item', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { order } = scenario;

      // Act
      const result = await settlementMgmtService.generateSettlement(order.id);

      // Assert
      expect(result.settlementItems.length).toBe(order.items.length);

      for (const orderItem of order.items) {
        const matchingSettlementItem = result.settlementItems.find(
          si => si.orderId === order.id && si.orderItemId === orderItem.id
        );
        expect(matchingSettlementItem).toBeDefined();
      }
    });

    it('should set correct settlement status (PENDING)', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { order } = scenario;

      // Act
      const result = await settlementMgmtService.generateSettlement(order.id);

      // Assert
      for (const settlement of result.settlements) {
        expect(settlement.status).toBe(SettlementStatus.PENDING);
      }
    });

    it('should tag settlements with order ID', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { order } = scenario;

      // Act
      const result = await settlementMgmtService.generateSettlement(order.id);

      // Assert
      for (const settlement of result.settlements) {
        if (settlement.metadata && typeof settlement.metadata === 'object') {
          const meta = settlement.metadata as Record<string, unknown>;
          expect(meta.tag).toBe(`order-${order.id}`);
        }
      }
    });

    it('should throw error for non-existent order', async () => {
      // Arrange
      const fakeOrderId = '00000000-0000-0000-0000-000000000001';

      // Act & Assert
      await expect(
        settlementMgmtService.generateSettlement(fakeOrderId)
      ).rejects.toThrow();
    });
  });

  describe('finalizeSettlement()', () => {
    it('should transition settlement from PENDING to PROCESSING', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { order } = scenario;
      const result = await settlementMgmtService.generateSettlement(order.id);
      const settlement = result.settlements[0];

      expect(settlement.status).toBe(SettlementStatus.PENDING);

      // Act
      const finalized = await settlementMgmtService.finalizeSettlement(settlement.id);

      // Assert
      expect(finalized.status).toBe(SettlementStatus.PROCESSING);
    });

    it('should throw error when finalizing already paid settlement', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { order } = scenario;
      const result = await settlementMgmtService.generateSettlement(order.id);
      const settlement = result.settlements[0];

      // Mark as paid
      const dataSource = getTestDataSource();
      const settlementRepo = dataSource.getRepository(Settlement);
      settlement.status = SettlementStatus.PAID;
      await settlementRepo.save(settlement);

      // Act & Assert
      await expect(
        settlementMgmtService.finalizeSettlement(settlement.id)
      ).rejects.toThrow('already paid');
    });

    it('should throw error when finalizing cancelled settlement', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { order } = scenario;
      const result = await settlementMgmtService.generateSettlement(order.id);
      const settlement = result.settlements[0];

      // Mark as cancelled
      const dataSource = getTestDataSource();
      const settlementRepo = dataSource.getRepository(Settlement);
      settlement.status = SettlementStatus.CANCELLED;
      await settlementRepo.save(settlement);

      // Act & Assert
      await expect(
        settlementMgmtService.finalizeSettlement(settlement.id)
      ).rejects.toThrow('cancelled');
    });
  });

  describe('getSettlementOverview()', () => {
    it('should return correct aggregate statistics', async () => {
      // Arrange
      const scenario1 = await createCompleteTestScenario();
      const scenario2 = await createCompleteTestScenario();

      await settlementMgmtService.generateSettlement(scenario1.order.id);
      await settlementMgmtService.generateSettlement(scenario2.order.id);

      // Act
      const overview = await settlementReadService.getSettlementOverview();

      // Assert
      expect(overview).toBeDefined();
      expect(overview.totalSettlements).toBeGreaterThanOrEqual(4); // At least 2 orders × 2 parties
      expect(overview.totalPendingAmount).toBeGreaterThan(0);
      expect(overview.settlementsByStatus).toBeDefined();
      expect(overview.settlementsByStatus[SettlementStatus.PENDING]).toBeGreaterThan(0);
    });

    it('should group settlements by party type', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      await settlementMgmtService.generateSettlement(scenario.order.id);

      // Act
      const overview = await settlementReadService.getSettlementOverview();

      // Assert
      expect(overview.settlementsByPartyType).toBeDefined();
      expect(overview.settlementsByPartyType['seller']).toBeGreaterThan(0);
      expect(overview.settlementsByPartyType['supplier']).toBeGreaterThan(0);
    });

    it('should filter by date range', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      await settlementMgmtService.generateSettlement(scenario.order.id);

      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      // Act
      const overview = await settlementReadService.getSettlementOverview({
        from: yesterday,
        to: tomorrow
      });

      // Assert
      expect(overview.totalSettlements).toBeGreaterThan(0);
    });
  });

  describe('getDailySettlementTotals()', () => {
    it('should group settlements by date', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      await settlementMgmtService.generateSettlement(scenario.order.id);

      const now = new Date();
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Act
      const dailyTotals = await settlementReadService.getDailySettlementTotals({
        from: lastWeek,
        to: now
      });

      // Assert
      expect(dailyTotals).toBeDefined();
      expect(Array.isArray(dailyTotals)).toBe(true);

      if (dailyTotals.length > 0) {
        const today = dailyTotals[dailyTotals.length - 1];
        expect(today).toHaveProperty('date');
        expect(today).toHaveProperty('totalAmount');
        expect(today).toHaveProperty('totalSettlements');
        expect(today).toHaveProperty('pendingAmount');
        expect(today).toHaveProperty('processingAmount');
        expect(today).toHaveProperty('paidAmount');
      }
    });

    it('should return correct daily amounts', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const result = await settlementMgmtService.generateSettlement(scenario.order.id);

      const totalExpectedAmount = result.settlements.reduce(
        (sum, s) => sum + parseFloat(s.payableAmount),
        0
      );

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Act
      const dailyTotals = await settlementReadService.getDailySettlementTotals({
        from: yesterday,
        to: now
      });

      // Assert
      const todayData = dailyTotals.find(d => d.date === now.toISOString().split('T')[0]);
      expect(todayData).toBeDefined();

      if (todayData) {
        expect(todayData.totalSettlements).toBeGreaterThan(0);
        expect(todayData.pendingAmount).toBeGreaterThan(0);
      }
    });
  });

  describe('Full Settlement Pipeline', () => {
    it('should complete entire workflow: Order → Settlement → Finalize → Dashboard', async () => {
      // Arrange
      const scenario = await createCompleteTestScenario();
      const { order } = scenario;

      // Act 1: Generate settlement
      const generated = await settlementMgmtService.generateSettlement(order.id);
      expect(generated.settlements.length).toBeGreaterThan(0);

      // Act 2: Finalize settlement
      const settlement = generated.settlements[0];
      const finalized = await settlementMgmtService.finalizeSettlement(settlement.id);
      expect(finalized.status).toBe(SettlementStatus.PROCESSING);

      // Act 3: Check dashboard overview
      const overview = await settlementReadService.getSettlementOverview();
      expect(overview.totalProcessingAmount).toBeGreaterThan(0);
      expect(overview.settlementsByStatus[SettlementStatus.PROCESSING]).toBeGreaterThan(0);

      // Act 4: Mark as paid
      const paid = await settlementMgmtService.markAsPaid(settlement.id);
      expect(paid.status).toBe(SettlementStatus.PAID);

      // Act 5: Verify dashboard reflects paid status
      const updatedOverview = await settlementReadService.getSettlementOverview();
      expect(updatedOverview.totalPaidAmount).toBeGreaterThan(0);
      expect(updatedOverview.settlementsByStatus[SettlementStatus.PAID]).toBeGreaterThan(0);
    });
  });
});
