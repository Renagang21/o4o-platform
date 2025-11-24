/**
 * SettlementEngine Batch Tests
 * R-8-8-5: Batch settlement - Daily settlement processing
 *
 * Tests:
 * 1. Single order day - settlement status transitions from PENDING to PROCESSING
 * 2. Multiple orders with multiple parties - all settlements finalized
 * 3. Settlement amount validation
 * 4. Idempotency - running batch twice doesn't change already processed settlements
 *
 * Created: 2025-11-24
 */

import { Repository } from 'typeorm';
import { SettlementEngine } from '../SettlementEngine.js';
import { Settlement, SettlementStatus } from '../../../entities/Settlement.js';
import { SettlementItem } from '../../../entities/SettlementItem.js';
import { Order } from '../../../entities/Order.js';
import { AppDataSource } from '../../../database/connection.js';

// Mock dependencies
jest.mock('../../../database/connection.js');
jest.mock('../../../utils/logger.js', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('SettlementEngine - Batch', () => {
  let engine: SettlementEngine;
  let mockOrderRepo: jest.Mocked<Repository<Order>>;
  let mockSettlementRepo: jest.Mocked<Repository<Settlement>>;
  let mockSettlementItemRepo: jest.Mocked<Repository<SettlementItem>>;

  beforeEach(() => {
    // Create mock repositories
    mockOrderRepo = {
      findOne: jest.fn(),
    } as any;

    mockSettlementRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    } as any;

    mockSettlementItemRepo = {
      find: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    // Mock AppDataSource.getRepository
    (AppDataSource.getRepository as jest.Mock) = jest.fn((entity) => {
      if (entity === Order) return mockOrderRepo;
      if (entity === Settlement) return mockSettlementRepo;
      if (entity === SettlementItem) return mockSettlementItemRepo;
      return {} as any;
    });

    // Create service instance
    engine = new SettlementEngine();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('runDailySettlement', () => {
    it('should finalize PENDING settlements for target date', async () => {
      // Arrange
      const targetDate = new Date('2025-11-24');
      const periodStart = new Date('2025-11-24T00:00:00Z');
      const periodEnd = new Date('2025-11-24T23:59:59.999Z');

      const sellerItem = {
        id: 'item-1',
        grossAmount: '200.00',
        commissionAmountSnapshot: '40.00',
        netAmount: '160.00',
      } as SettlementItem;

      const pendingSettlement = {
        id: 'settlement-1',
        partyType: 'seller',
        partyId: 'seller-id',
        periodStart,
        periodEnd,
        status: SettlementStatus.PENDING,
        totalSaleAmount: '200.00',
        totalCommissionAmount: '40.00',
        payableAmount: '160.00',
        items: [sellerItem],
      } as Settlement;

      mockSettlementRepo.find.mockResolvedValue([pendingSettlement]);
      mockSettlementRepo.save.mockImplementation((settlement) => Promise.resolve(settlement as any));

      // Act
      const result = await engine.runDailySettlement(targetDate);

      // Assert
      expect(mockSettlementRepo.find).toHaveBeenCalledWith({
        where: {
          periodStart,
          periodEnd,
          status: SettlementStatus.PENDING,
        },
        relations: ['items'],
      });

      expect(mockSettlementRepo.save).toHaveBeenCalled();
      const savedSettlement = mockSettlementRepo.save.mock.calls[0][0] as Settlement;
      expect(savedSettlement.status).toBe(SettlementStatus.PROCESSING);
      expect(result).toBe(1); // 1 settlement processed
    });

    it('should process multiple settlements for different parties', async () => {
      // Arrange
      const targetDate = new Date('2025-11-24');
      const periodStart = new Date('2025-11-24T00:00:00Z');
      const periodEnd = new Date('2025-11-24T23:59:59.999Z');

      const sellerItem = {
        id: 'item-1',
        grossAmount: '200.00',
        commissionAmountSnapshot: '40.00',
        netAmount: '160.00',
      } as SettlementItem;

      const supplierItem = {
        id: 'item-2',
        grossAmount: '140.00',
        commissionAmountSnapshot: '0.00',
        netAmount: '140.00',
      } as SettlementItem;

      const platformItem = {
        id: 'item-3',
        grossAmount: '40.00',
        commissionAmountSnapshot: '0.00',
        netAmount: '40.00',
      } as SettlementItem;

      const sellerSettlement = {
        id: 'settlement-1',
        partyType: 'seller',
        partyId: 'seller-id',
        periodStart,
        periodEnd,
        status: SettlementStatus.PENDING,
        totalSaleAmount: '200.00',
        totalCommissionAmount: '40.00',
        payableAmount: '160.00',
        items: [sellerItem],
      } as Settlement;

      const supplierSettlement = {
        id: 'settlement-2',
        partyType: 'supplier',
        partyId: 'supplier-id',
        periodStart,
        periodEnd,
        status: SettlementStatus.PENDING,
        totalBaseAmount: '140.00',
        totalCommissionAmount: '0.00',
        payableAmount: '140.00',
        items: [supplierItem],
      } as Settlement;

      const platformSettlement = {
        id: 'settlement-3',
        partyType: 'platform',
        partyId: 'PLATFORM',
        periodStart,
        periodEnd,
        status: SettlementStatus.PENDING,
        totalCommissionAmount: '40.00',
        payableAmount: '40.00',
        items: [platformItem],
      } as Settlement;

      mockSettlementRepo.find.mockResolvedValue([sellerSettlement, supplierSettlement, platformSettlement]);
      mockSettlementRepo.save.mockImplementation((settlement) => Promise.resolve(settlement as any));

      // Act
      const result = await engine.runDailySettlement(targetDate);

      // Assert
      expect(mockSettlementRepo.save).toHaveBeenCalledTimes(3);
      expect(result).toBe(3); // 3 settlements processed

      // Verify all settlements transitioned to PROCESSING
      const savedSettlements = mockSettlementRepo.save.mock.calls.map((call) => call[0] as Settlement);
      expect(savedSettlements.every((s) => s.status === SettlementStatus.PROCESSING)).toBe(true);
    });

    it('should skip settlements with validation errors', async () => {
      // Arrange
      const targetDate = new Date('2025-11-24');
      const periodStart = new Date('2025-11-24T00:00:00Z');
      const periodEnd = new Date('2025-11-24T23:59:59.999Z');

      const mismatchedItem = {
        id: 'item-1',
        grossAmount: '100.00',
        commissionAmountSnapshot: '20.00',
        netAmount: '80.00',
      } as SettlementItem;

      // Settlement with mismatched amounts (validation will fail)
      const invalidSettlement = {
        id: 'settlement-1',
        partyType: 'seller',
        partyId: 'seller-id',
        periodStart,
        periodEnd,
        status: SettlementStatus.PENDING,
        totalSaleAmount: '200.00',
        totalCommissionAmount: '40.00',
        payableAmount: '160.00', // Doesn't match item netAmount (80)
        items: [mismatchedItem],
      } as Settlement;

      mockSettlementRepo.find.mockResolvedValue([invalidSettlement]);
      mockSettlementRepo.save.mockImplementation((settlement) => Promise.resolve(settlement as any));

      // Act
      const result = await engine.runDailySettlement(targetDate);

      // Assert
      expect(mockSettlementRepo.save).not.toHaveBeenCalled();
      expect(result).toBe(0); // No settlements processed due to validation failure
    });

    it('should return 0 if no pending settlements found', async () => {
      // Arrange
      const targetDate = new Date('2025-11-24');
      mockSettlementRepo.find.mockResolvedValue([]);

      // Act
      const result = await engine.runDailySettlement(targetDate);

      // Assert
      expect(result).toBe(0);
      expect(mockSettlementRepo.save).not.toHaveBeenCalled();
    });

    it('should be idempotent - skip already processed settlements', async () => {
      // Arrange
      const targetDate = new Date('2025-11-24');
      const periodStart = new Date('2025-11-24T00:00:00Z');
      const periodEnd = new Date('2025-11-24T23:59:59.999Z');

      // No PENDING settlements (all already PROCESSING)
      mockSettlementRepo.find.mockResolvedValue([]);

      // Act - Run batch twice
      const result1 = await engine.runDailySettlement(targetDate);
      const result2 = await engine.runDailySettlement(targetDate);

      // Assert
      expect(result1).toBe(0);
      expect(result2).toBe(0);
      expect(mockSettlementRepo.save).not.toHaveBeenCalled();
    });

    it('should validate settlement amounts correctly', async () => {
      // Arrange
      const targetDate = new Date('2025-11-24');
      const periodStart = new Date('2025-11-24T00:00:00Z');
      const periodEnd = new Date('2025-11-24T23:59:59.999Z');

      const item1 = {
        id: 'item-1',
        grossAmount: '100.00',
        commissionAmountSnapshot: '20.00',
        netAmount: '80.00',
      } as SettlementItem;

      const item2 = {
        id: 'item-2',
        grossAmount: '150.00',
        commissionAmountSnapshot: '30.00',
        netAmount: '120.00',
      } as SettlementItem;

      // Settlement with correct totals
      const validSettlement = {
        id: 'settlement-1',
        partyType: 'seller',
        partyId: 'seller-id',
        periodStart,
        periodEnd,
        status: SettlementStatus.PENDING,
        totalSaleAmount: '250.00',
        totalCommissionAmount: '50.00', // 20 + 30
        payableAmount: '200.00', // 80 + 120
        items: [item1, item2],
      } as Settlement;

      mockSettlementRepo.find.mockResolvedValue([validSettlement]);
      mockSettlementRepo.save.mockImplementation((settlement) => Promise.resolve(settlement as any));

      // Act
      const result = await engine.runDailySettlement(targetDate);

      // Assert
      expect(mockSettlementRepo.save).toHaveBeenCalled();
      expect(result).toBe(1);
      const savedSettlement = mockSettlementRepo.save.mock.calls[0][0] as Settlement;
      expect(savedSettlement.status).toBe(SettlementStatus.PROCESSING);
    });

    it('should handle settlements with no items', async () => {
      // Arrange
      const targetDate = new Date('2025-11-24');
      const periodStart = new Date('2025-11-24T00:00:00Z');
      const periodEnd = new Date('2025-11-24T23:59:59.999Z');

      const emptySettlement = {
        id: 'settlement-1',
        partyType: 'seller',
        partyId: 'seller-id',
        periodStart,
        periodEnd,
        status: SettlementStatus.PENDING,
        payableAmount: '0.00',
        items: [], // No items
      } as Settlement;

      mockSettlementRepo.find.mockResolvedValue([emptySettlement]);
      mockSettlementRepo.save.mockImplementation((settlement) => Promise.resolve(settlement as any));

      // Act
      const result = await engine.runDailySettlement(targetDate);

      // Assert
      expect(mockSettlementRepo.save).not.toHaveBeenCalled();
      expect(result).toBe(0); // Validation fails for empty settlements
    });
  });
});
