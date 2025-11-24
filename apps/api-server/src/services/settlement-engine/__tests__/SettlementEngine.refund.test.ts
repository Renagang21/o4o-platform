/**
 * SettlementEngine Refund Tests
 * R-8-8-4: Refund settlement - Automatic reversal on order cancellation/refund
 *
 * Tests:
 * 1. Order refund generates reversal settlement items
 * 2. Reversal items have negative amounts
 * 3. Settlement totals are correctly adjusted
 * 4. Full refund results in zero net settlement
 *
 * Created: 2025-11-24
 */

import { Repository } from 'typeorm';
import { SettlementEngine } from '../SettlementEngine.js';
import { SettlementCalculator } from '../SettlementCalculator.js';
import { SettlementAggregator } from '../SettlementAggregator.js';
import { Order, OrderStatus } from '../../../entities/Order.js';
import { OrderItem as OrderItemEntity } from '../../../entities/OrderItem.js';
import { Settlement, SettlementStatus } from '../../../entities/Settlement.js';
import { SettlementItem } from '../../../entities/SettlementItem.js';
import { AppDataSource } from '../../../database/connection.js';

// Mock dependencies
jest.mock('../../../database/connection.js');
jest.mock('../../../utils/logger.js', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('SettlementEngine - Refund', () => {
  let engine: SettlementEngine;
  let calculator: SettlementCalculator;
  let aggregator: SettlementAggregator;
  let mockOrderRepo: jest.Mocked<Repository<Order>>;
  let mockSettlementRepo: jest.Mocked<Repository<Settlement>>;
  let mockSettlementItemRepo: jest.Mocked<Repository<SettlementItem>>;

  beforeEach(() => {
    // Create mock repositories
    mockOrderRepo = {
      findOne: jest.fn(),
    } as any;

    mockSettlementRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as any;

    mockSettlementItemRepo = {
      find: jest.fn(),
      save: jest.fn(),
    } as any;

    // Mock AppDataSource.getRepository
    (AppDataSource.getRepository as jest.Mock) = jest.fn((entity) => {
      if (entity === Order) return mockOrderRepo;
      if (entity === Settlement) return mockSettlementRepo;
      if (entity === SettlementItem) return mockSettlementItemRepo;
      return {} as any;
    });

    // Create service instances
    calculator = new SettlementCalculator();
    aggregator = new SettlementAggregator();
    engine = new SettlementEngine();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('runOnRefund', () => {
    it('should generate reversal settlement items with negative amounts', async () => {
      // Arrange
      const orderId = 'test-order-id';
      const sellerId = 'seller-id';
      const supplierId = 'supplier-id';

      const orderItem = {
        id: 'item-id',
        productId: 'product-id',
        productName: 'Test Product',
        quantity: 2,
        unitPrice: 100,
        totalPrice: 200,
        sellerId,
        sellerName: 'Test Seller',
        supplierId,
        supplierName: 'Test Supplier',
        basePriceSnapshot: 70,
        salePriceSnapshot: 100,
        commissionType: 'rate',
        commissionRate: 0.2,
        commissionAmount: 40,
      } as OrderItemEntity;

      const order = {
        id: orderId,
        orderNumber: 'ORD-001',
        orderDate: new Date('2025-11-24'),
        status: OrderStatus.CANCELLED,
        itemsRelation: [orderItem],
      } as Order;

      // Original settlement items (created by runOnOrderCompleted)
      const originalSellerItem = {
        id: 'original-seller-item',
        orderId,
        orderItemId: 'item-id',
        partyType: 'seller',
        partyId: sellerId,
        grossAmount: '200.00',
        commissionAmountSnapshot: '40.00',
        netAmount: '160.00',
        reasonCode: 'order_completed',
        productName: 'Test Product',
        quantity: 2,
        salePriceSnapshot: '100.00',
        basePriceSnapshot: '70.00',
      } as SettlementItem;

      const originalSupplierItem = {
        id: 'original-supplier-item',
        orderId,
        orderItemId: 'item-id',
        partyType: 'supplier',
        partyId: supplierId,
        grossAmount: '140.00',
        commissionAmountSnapshot: '0.00',
        netAmount: '140.00',
        reasonCode: 'order_completed',
        productName: 'Test Product',
        quantity: 2,
        salePriceSnapshot: '100.00',
        basePriceSnapshot: '70.00',
      } as SettlementItem;

      const originalPlatformItem = {
        id: 'original-platform-item',
        orderId,
        orderItemId: 'item-id',
        partyType: 'platform',
        partyId: 'PLATFORM',
        grossAmount: '40.00',
        commissionAmountSnapshot: '0.00',
        netAmount: '40.00',
        reasonCode: 'order_completed',
        productName: 'Test Product',
        quantity: 2,
        salePriceSnapshot: '100.00',
        basePriceSnapshot: '70.00',
      } as SettlementItem;

      mockOrderRepo.findOne.mockResolvedValue(order);
      mockSettlementItemRepo.find.mockResolvedValue([
        originalSellerItem,
        originalSupplierItem,
        originalPlatformItem,
      ]);

      // Mock existing settlements
      const existingSellerSettlement = {
        id: 'seller-settlement',
        partyType: 'seller',
        partyId: sellerId,
        periodStart: new Date('2025-11-24T00:00:00Z'),
        periodEnd: new Date('2025-11-24T23:59:59Z'),
        totalSaleAmount: '200.00',
        totalCommissionAmount: '40.00',
        payableAmount: '160.00',
        status: SettlementStatus.PENDING,
      } as Settlement;

      mockSettlementRepo.findOne.mockResolvedValue(existingSellerSettlement);
      mockSettlementRepo.save.mockImplementation((settlement) => Promise.resolve(settlement as any));
      mockSettlementItemRepo.save.mockImplementation((items) => Promise.resolve(items as any));

      // Act
      const settlements = await engine.runOnRefund(orderId);

      // Assert
      expect(mockSettlementItemRepo.find).toHaveBeenCalledWith({
        where: {
          orderId,
          reasonCode: 'order_completed',
        },
      });

      // Verify reversal items were saved
      expect(mockSettlementItemRepo.save).toHaveBeenCalled();
      const savedItems = mockSettlementItemRepo.save.mock.calls[0][0] as SettlementItem[];

      // Should have reversal items with negative amounts
      const sellerReversalItem = savedItems.find((item) => item.partyType === 'seller');
      expect(sellerReversalItem).toBeDefined();
      expect(parseFloat(sellerReversalItem!.grossAmount)).toBe(-200);
      expect(parseFloat(sellerReversalItem!.netAmount)).toBe(-160);
      expect(sellerReversalItem!.reasonCode).toBe('refund');
    });

    it('should adjust settlement totals correctly after refund', async () => {
      // Arrange
      const orderId = 'test-order-id';
      const sellerId = 'seller-id';

      const order = {
        id: orderId,
        orderNumber: 'ORD-001',
        orderDate: new Date('2025-11-24'),
        status: OrderStatus.CANCELLED,
        itemsRelation: [],
      } as Order;

      const originalItem = {
        id: 'original-item',
        orderId,
        orderItemId: 'item-id',
        partyType: 'seller',
        partyId: sellerId,
        grossAmount: '200.00',
        commissionAmountSnapshot: '40.00',
        netAmount: '160.00',
        reasonCode: 'order_completed',
        productName: 'Test Product',
        quantity: 2,
        salePriceSnapshot: '100.00',
        basePriceSnapshot: '70.00',
      } as SettlementItem;

      const existingSettlement = {
        id: 'settlement-id',
        partyType: 'seller',
        partyId: sellerId,
        periodStart: new Date('2025-11-24T00:00:00Z'),
        periodEnd: new Date('2025-11-24T23:59:59Z'),
        totalSaleAmount: '200.00',
        totalMarginAmount: '160.00',
        totalCommissionAmount: '40.00',
        payableAmount: '160.00',
        status: SettlementStatus.PENDING,
      } as Settlement;

      mockOrderRepo.findOne.mockResolvedValue(order);
      mockSettlementItemRepo.find.mockResolvedValue([originalItem]);
      mockSettlementRepo.findOne.mockResolvedValue(existingSettlement);
      mockSettlementRepo.save.mockImplementation((settlement) => Promise.resolve(settlement as any));
      mockSettlementItemRepo.save.mockImplementation((items) => Promise.resolve(items as any));

      // Act
      await engine.runOnRefund(orderId);

      // Assert
      expect(mockSettlementRepo.save).toHaveBeenCalled();
      const savedSettlement = mockSettlementRepo.save.mock.calls[0][0] as Settlement;

      // After full refund, amounts should be zero
      expect(parseFloat(savedSettlement.payableAmount)).toBe(0);
      expect(parseFloat(savedSettlement.totalSaleAmount)).toBe(0);
      expect(parseFloat(savedSettlement.totalMarginAmount)).toBe(0);
      expect(parseFloat(savedSettlement.totalCommissionAmount)).toBe(0);
    });

    it('should handle multiple items refund correctly', async () => {
      // Arrange
      const orderId = 'test-order-id';
      const sellerId = 'seller-id';

      const order = {
        id: orderId,
        orderNumber: 'ORD-001',
        orderDate: new Date('2025-11-24'),
        status: OrderStatus.CANCELLED,
        itemsRelation: [],
      } as Order;

      const originalItem1 = {
        id: 'original-item-1',
        orderId,
        orderItemId: 'item-1',
        partyType: 'seller',
        partyId: sellerId,
        grossAmount: '100.00',
        commissionAmountSnapshot: '20.00',
        netAmount: '80.00',
        reasonCode: 'order_completed',
        productName: 'Product 1',
        quantity: 1,
        salePriceSnapshot: '100.00',
      } as SettlementItem;

      const originalItem2 = {
        id: 'original-item-2',
        orderId,
        orderItemId: 'item-2',
        partyType: 'seller',
        partyId: sellerId,
        grossAmount: '150.00',
        commissionAmountSnapshot: '30.00',
        netAmount: '120.00',
        reasonCode: 'order_completed',
        productName: 'Product 2',
        quantity: 1,
        salePriceSnapshot: '150.00',
      } as SettlementItem;

      const existingSettlement = {
        id: 'settlement-id',
        partyType: 'seller',
        partyId: sellerId,
        periodStart: new Date('2025-11-24T00:00:00Z'),
        periodEnd: new Date('2025-11-24T23:59:59Z'),
        totalSaleAmount: '250.00', // 100 + 150
        totalMarginAmount: '200.00', // 80 + 120
        totalCommissionAmount: '50.00', // 20 + 30
        payableAmount: '200.00',
        status: SettlementStatus.PENDING,
      } as Settlement;

      mockOrderRepo.findOne.mockResolvedValue(order);
      mockSettlementItemRepo.find.mockResolvedValue([originalItem1, originalItem2]);
      mockSettlementRepo.findOne.mockResolvedValue(existingSettlement);
      mockSettlementRepo.save.mockImplementation((settlement) => Promise.resolve(settlement as any));
      mockSettlementItemRepo.save.mockImplementation((items) => Promise.resolve(items as any));

      // Act
      await engine.runOnRefund(orderId);

      // Assert
      const savedSettlement = mockSettlementRepo.save.mock.calls[0][0] as Settlement;

      // After refund of both items, all amounts should be zero
      expect(parseFloat(savedSettlement.payableAmount)).toBe(0);
      expect(parseFloat(savedSettlement.totalSaleAmount)).toBe(0);
    });

    it('should handle case when no original settlement items exist', async () => {
      // Arrange
      const orderId = 'test-order-id';

      const order = {
        id: orderId,
        orderNumber: 'ORD-001',
        orderDate: new Date('2025-11-24'),
        status: OrderStatus.CANCELLED,
        itemsRelation: [],
      } as Order;

      mockOrderRepo.findOne.mockResolvedValue(order);
      mockSettlementItemRepo.find.mockResolvedValue([]); // No original items

      // Act
      const settlements = await engine.runOnRefund(orderId);

      // Assert
      expect(settlements).toEqual([]);
      expect(mockSettlementRepo.save).not.toHaveBeenCalled();
    });

    it('should include reversal metadata in reversal items', async () => {
      // Arrange
      const orderId = 'test-order-id';
      const sellerId = 'seller-id';

      const order = {
        id: orderId,
        orderNumber: 'ORD-001',
        orderDate: new Date('2025-11-24'),
        status: OrderStatus.CANCELLED,
        itemsRelation: [],
      } as Order;

      const originalItem = {
        id: 'original-item-id',
        orderId,
        orderItemId: 'item-id',
        partyType: 'seller',
        partyId: sellerId,
        grossAmount: '100.00',
        commissionAmountSnapshot: '20.00',
        netAmount: '80.00',
        reasonCode: 'order_completed',
        productName: 'Test Product',
        quantity: 1,
        salePriceSnapshot: '100.00',
        metadata: { originalKey: 'originalValue' },
      } as SettlementItem;

      mockOrderRepo.findOne.mockResolvedValue(order);
      mockSettlementItemRepo.find.mockResolvedValue([originalItem]);
      mockSettlementRepo.findOne.mockResolvedValue(null);
      mockSettlementRepo.save.mockImplementation((settlement) =>
        Promise.resolve({ ...settlement, id: 'new-settlement' } as any)
      );
      mockSettlementItemRepo.save.mockImplementation((items) => Promise.resolve(items as any));

      // Act
      await engine.runOnRefund(orderId);

      // Assert
      const savedItems = mockSettlementItemRepo.save.mock.calls[0][0] as SettlementItem[];
      const reversalItem = savedItems[0];

      expect(reversalItem.metadata).toBeDefined();
      expect(reversalItem.metadata!.reversedSettlementItemId).toBe('original-item-id');
      expect(reversalItem.metadata!.originalReasonCode).toBe('order_completed');
      expect(reversalItem.metadata!.refundedAt).toBeDefined();
      expect(reversalItem.metadata!.originalKey).toBe('originalValue'); // Original metadata preserved
    });
  });
});
