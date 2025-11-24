/**
 * SettlementEngine Unit Tests
 * R-8-8-2: SettlementEngine v1 - Automatic settlement generation
 *
 * Tests:
 * 1. Order completion generates settlement items for seller, supplier, platform
 * 2. Seller and supplier calculations are accurate
 * 3. Settlement aggregation amounts are correct
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

describe('SettlementEngine', () => {
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

  describe('runOnOrderCompleted', () => {
    it('should generate settlement items for seller, supplier, and platform', async () => {
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
        commissionAmount: 40, // 20% of 200
      } as OrderItemEntity;

      const order = {
        id: orderId,
        orderNumber: 'ORD-001',
        orderDate: new Date('2025-11-24'),
        status: OrderStatus.DELIVERED,
        itemsRelation: [orderItem],
      } as Order;

      mockOrderRepo.findOne.mockResolvedValue(order);
      mockSettlementRepo.findOne.mockResolvedValue(null); // No existing settlement
      mockSettlementRepo.save.mockImplementation((settlement) =>
        Promise.resolve({ ...settlement, id: 'settlement-id' } as any)
      );
      mockSettlementItemRepo.save.mockImplementation((items) => Promise.resolve(items as any));

      // Act
      const settlements = await engine.runOnOrderCompleted(orderId);

      // Assert
      expect(mockOrderRepo.findOne).toHaveBeenCalledWith({
        where: { id: orderId },
        relations: ['itemsRelation'],
      });

      // Should create settlements (one per party type)
      expect(settlements.length).toBeGreaterThan(0);

      // Verify settlement items were saved
      expect(mockSettlementItemRepo.save).toHaveBeenCalled();
      const savedItems = mockSettlementItemRepo.save.mock.calls[0][0] as SettlementItem[];

      // Should have at least seller, supplier, and platform items
      const partyTypes = savedItems.map((item) => item.partyType);
      expect(partyTypes).toContain('seller');
      expect(partyTypes).toContain('supplier');
      expect(partyTypes).toContain('platform');
    });

    it('should calculate correct amounts for seller settlement', async () => {
      // Arrange
      const orderItem = {
        id: 'item-id',
        productId: 'product-id',
        productName: 'Test Product',
        quantity: 2,
        unitPrice: 100,
        totalPrice: 200,
        sellerId: 'seller-id',
        sellerName: 'Test Seller',
        supplierId: 'supplier-id',
        supplierName: 'Test Supplier',
        basePriceSnapshot: 70,
        salePriceSnapshot: 100,
        commissionType: 'rate',
        commissionRate: 0.2,
        commissionAmount: 40, // 20% of 200
      } as OrderItemEntity;

      const order = {
        id: 'order-id',
        orderNumber: 'ORD-001',
        orderDate: new Date('2025-11-24'),
        status: OrderStatus.DELIVERED,
        itemsRelation: [orderItem],
      } as Order;

      // Act
      const settlementItems = calculator.calculateFromOrderItems(order, [orderItem]);

      // Assert
      const sellerItem = settlementItems.find((item) => item.partyType === 'seller');
      expect(sellerItem).toBeDefined();
      expect(sellerItem!.grossAmount).toBe(200); // totalPrice
      expect(sellerItem!.commissionAmount).toBe(40); // commission
      expect(sellerItem!.netAmount).toBe(160); // 200 - 40
      expect(sellerItem!.partyId).toBe('seller-id');
    });

    it('should calculate correct amounts for supplier settlement', async () => {
      // Arrange
      const orderItem = {
        id: 'item-id',
        productId: 'product-id',
        productName: 'Test Product',
        quantity: 2,
        unitPrice: 100,
        totalPrice: 200,
        sellerId: 'seller-id',
        sellerName: 'Test Seller',
        supplierId: 'supplier-id',
        supplierName: 'Test Supplier',
        basePriceSnapshot: 70,
        salePriceSnapshot: 100,
        commissionType: 'rate',
        commissionRate: 0.2,
        commissionAmount: 40,
      } as OrderItemEntity;

      const order = {
        id: 'order-id',
        orderNumber: 'ORD-001',
        orderDate: new Date('2025-11-24'),
        status: OrderStatus.DELIVERED,
        itemsRelation: [orderItem],
      } as Order;

      // Act
      const settlementItems = calculator.calculateFromOrderItems(order, [orderItem]);

      // Assert
      const supplierItem = settlementItems.find((item) => item.partyType === 'supplier');
      expect(supplierItem).toBeDefined();
      expect(supplierItem!.grossAmount).toBe(140); // basePriceSnapshot * quantity = 70 * 2
      expect(supplierItem!.commissionAmount).toBe(0); // No commission for supplier
      expect(supplierItem!.netAmount).toBe(140); // gross - commission
      expect(supplierItem!.partyId).toBe('supplier-id');
    });

    it('should calculate correct amounts for platform settlement', async () => {
      // Arrange
      const orderItem = {
        id: 'item-id',
        productId: 'product-id',
        productName: 'Test Product',
        quantity: 2,
        unitPrice: 100,
        totalPrice: 200,
        sellerId: 'seller-id',
        sellerName: 'Test Seller',
        supplierId: 'supplier-id',
        supplierName: 'Test Supplier',
        basePriceSnapshot: 70,
        salePriceSnapshot: 100,
        commissionType: 'rate',
        commissionRate: 0.2,
        commissionAmount: 40,
      } as OrderItemEntity;

      const order = {
        id: 'order-id',
        orderNumber: 'ORD-001',
        orderDate: new Date('2025-11-24'),
        status: OrderStatus.DELIVERED,
        itemsRelation: [orderItem],
      } as Order;

      // Act
      const settlementItems = calculator.calculateFromOrderItems(order, [orderItem]);

      // Assert
      const platformItem = settlementItems.find((item) => item.partyType === 'platform');
      expect(platformItem).toBeDefined();
      expect(platformItem!.grossAmount).toBe(40); // commission amount
      expect(platformItem!.commissionAmount).toBe(0); // Platform doesn't pay commission
      expect(platformItem!.netAmount).toBe(40);
      expect(platformItem!.partyId).toBe('PLATFORM');
    });

    it('should aggregate settlement items correctly', async () => {
      // Arrange
      const orderItem1 = {
        id: 'item-1',
        productId: 'product-1',
        productName: 'Product 1',
        quantity: 1,
        unitPrice: 100,
        totalPrice: 100,
        sellerId: 'seller-id',
        sellerName: 'Seller',
        supplierId: 'supplier-id',
        supplierName: 'Supplier',
        basePriceSnapshot: 70,
        salePriceSnapshot: 100,
        commissionAmount: 20,
      } as OrderItemEntity;

      const orderItem2 = {
        id: 'item-2',
        productId: 'product-2',
        productName: 'Product 2',
        quantity: 2,
        unitPrice: 50,
        totalPrice: 100,
        sellerId: 'seller-id', // Same seller
        sellerName: 'Seller',
        supplierId: 'supplier-id', // Same supplier
        supplierName: 'Supplier',
        basePriceSnapshot: 35,
        salePriceSnapshot: 50,
        commissionAmount: 20,
      } as OrderItemEntity;

      const order = {
        id: 'order-id',
        orderNumber: 'ORD-001',
        orderDate: new Date('2025-11-24'),
        status: OrderStatus.DELIVERED,
        itemsRelation: [orderItem1, orderItem2],
      } as Order;

      const settlementItems = calculator.calculateFromOrderItems(order, [orderItem1, orderItem2]);

      mockSettlementRepo.findOne.mockResolvedValue(null);
      mockSettlementRepo.save.mockImplementation((settlement) =>
        Promise.resolve({ ...settlement, id: 'settlement-id' } as any)
      );
      mockSettlementItemRepo.save.mockImplementation((items) => Promise.resolve(items as any));

      // Act
      const settlements = await aggregator.aggregate(order, settlementItems);

      // Assert
      // Should create one settlement per party (seller, supplier, platform)
      expect(settlements.length).toBeGreaterThan(0);

      // Find seller settlement
      const sellerSettlement = settlements.find((s) => s.partyType === 'seller');
      expect(sellerSettlement).toBeDefined();

      // Seller should receive: (100 - 20) + (100 - 20) = 160
      const expectedSellerNet = 160;
      expect(parseFloat(sellerSettlement!.payableAmount)).toBe(expectedSellerNet);

      // Find supplier settlement
      const supplierSettlement = settlements.find((s) => s.partyType === 'supplier');
      expect(supplierSettlement).toBeDefined();

      // Supplier should receive: (70 * 1) + (35 * 2) = 140
      const expectedSupplierNet = 140;
      expect(parseFloat(supplierSettlement!.payableAmount)).toBe(expectedSupplierNet);

      // Find platform settlement
      const platformSettlement = settlements.find((s) => s.partyType === 'platform');
      expect(platformSettlement).toBeDefined();

      // Platform should receive: 20 + 20 = 40
      const expectedPlatformNet = 40;
      expect(parseFloat(platformSettlement!.payableAmount)).toBe(expectedPlatformNet);
    });

    it('should handle orders with no items gracefully', async () => {
      // Arrange
      const orderId = 'test-order-id';
      const order = {
        id: orderId,
        orderNumber: 'ORD-001',
        orderDate: new Date('2025-11-24'),
        status: OrderStatus.DELIVERED,
        itemsRelation: [],
      } as Order;

      mockOrderRepo.findOne.mockResolvedValue(order);

      // Act
      const settlements = await engine.runOnOrderCompleted(orderId);

      // Assert
      expect(settlements).toEqual([]);
      expect(mockSettlementRepo.save).not.toHaveBeenCalled();
    });

    it('should throw error if order not found', async () => {
      // Arrange
      const orderId = 'non-existent-order';
      mockOrderRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(engine.runOnOrderCompleted(orderId)).rejects.toThrow('Order non-existent-order not found');
    });
  });
});
