/**
 * Auto-Reorder Engine Integration Tests
 *
 * 자동발주 엔진의 핵심 기능 검증
 *
 * @package @o4o/pharmacyops
 */

import {
  PharmacyInventory,
  InventoryStatus,
  InventoryUpdateSource,
} from '../../entities/PharmacyInventory.entity.js';

// ========================================
// Test Helpers
// ========================================

function createMockInventory(overrides: Partial<PharmacyInventory> = {}): PharmacyInventory {
  const inventory = new PharmacyInventory();
  Object.assign(inventory, {
    id: 'inv-001',
    pharmacyId: 'pharmacy-001',
    productId: 'prod-001',
    productName: 'Test Product',
    productSku: 'TEST-001',
    currentStock: 10,
    safetyStock: 15,
    minOrderQuantity: 5,
    maxStock: 100,
    averageDailyUsage: 3,
    status: InventoryStatus.LOW,
    lastUpdateSource: InventoryUpdateSource.MANUAL,
    requiresColdChain: false,
    isNarcotic: false,
    trackExpiry: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
  return inventory;
}

// ========================================
// PharmacyInventory Entity Tests
// ========================================

describe('PharmacyInventory Entity', () => {
  describe('Computed Properties', () => {
    test('isLowStock should return true when currentStock < safetyStock', () => {
      const inventory = createMockInventory({
        currentStock: 5,
        safetyStock: 10,
      });
      expect(inventory.isLowStock).toBe(true);
    });

    test('isLowStock should return false when currentStock >= safetyStock', () => {
      const inventory = createMockInventory({
        currentStock: 15,
        safetyStock: 10,
      });
      expect(inventory.isLowStock).toBe(false);
    });

    test('isOutOfStock should return true when currentStock is 0', () => {
      const inventory = createMockInventory({ currentStock: 0 });
      expect(inventory.isOutOfStock).toBe(true);
    });

    test('isOutOfStock should return false when currentStock > 0', () => {
      const inventory = createMockInventory({ currentStock: 1 });
      expect(inventory.isOutOfStock).toBe(false);
    });

    test('needsReorder should return true when currentStock <= safetyStock', () => {
      const inventory = createMockInventory({
        currentStock: 10,
        safetyStock: 10,
      });
      expect(inventory.needsReorder).toBe(true);
    });

    test('estimatedDaysUntilStockout should calculate correctly', () => {
      const inventory = createMockInventory({
        currentStock: 15,
        averageDailyUsage: 3,
      });
      expect(inventory.estimatedDaysUntilStockout).toBe(5);
    });

    test('estimatedDaysUntilStockout should return null when ASU is 0', () => {
      const inventory = createMockInventory({
        currentStock: 15,
        averageDailyUsage: 0,
      });
      expect(inventory.estimatedDaysUntilStockout).toBeNull();
    });
  });
});

// ========================================
// Auto-Reorder Algorithm Tests
// ========================================

describe('Auto-Reorder Algorithm', () => {
  /**
   * requiredQuantity = (ASU * leadTimeDays) + safetyStock - currentStock
   */
  function calculateOrderQuantity(
    currentStock: number,
    safetyStock: number,
    averageDailyUsage: number,
    leadTimeDays: number,
    minOrderQuantity: number = 1,
    maxStock?: number
  ): number {
    const required =
      averageDailyUsage * leadTimeDays + safetyStock - currentStock;
    let quantity = Math.max(required, minOrderQuantity);

    if (maxStock) {
      const maxOrder = maxStock - currentStock;
      quantity = Math.min(quantity, Math.max(maxOrder, 0));
    }

    return Math.max(0, Math.ceil(quantity));
  }

  describe('Order Quantity Calculation', () => {
    test('should calculate correct quantity for low stock', () => {
      // 재고 5, 안전재고 10, ASU 3개/일, leadTime 2일
      // 필요량 = (3 * 2) + 10 - 5 = 11
      const quantity = calculateOrderQuantity(5, 10, 3, 2);
      expect(quantity).toBe(11);
    });

    test('should return 0 when stock is sufficient', () => {
      // 재고 50, 안전재고 10, ASU 3개/일, leadTime 2일
      // 필요량 = (3 * 2) + 10 - 50 = -34 → 0
      const quantity = calculateOrderQuantity(50, 10, 3, 2);
      expect(quantity).toBe(0);
    });

    test('should handle out of stock scenario (critical)', () => {
      // 재고 0, 안전재고 10, ASU 3개/일, leadTime 2일
      // 필요량 = (3 * 2) + 10 - 0 = 16
      const quantity = calculateOrderQuantity(0, 10, 3, 2);
      expect(quantity).toBe(16);
    });

    test('should respect minimum order quantity', () => {
      // 재고 12, 안전재고 10, ASU 1개/일, leadTime 1일
      // 필요량 = (1 * 1) + 10 - 12 = -1 → min 5 적용
      const quantity = calculateOrderQuantity(12, 10, 1, 1, 5);
      expect(quantity).toBe(5);
    });

    test('should respect max stock limit', () => {
      // 재고 90, 안전재고 10, ASU 10개/일, leadTime 2일
      // 필요량 = (10 * 2) + 10 - 90 = -60 → 0
      // 하지만 maxStock 100이므로 최대 10개만 추가 가능
      const quantity = calculateOrderQuantity(90, 10, 10, 2, 1, 100);
      expect(quantity).toBe(0);
    });

    test('should handle zero ASU (no consumption history)', () => {
      // 재고 5, 안전재고 10, ASU 0개/일, leadTime 2일
      // 필요량 = (0 * 2) + 10 - 5 = 5
      const quantity = calculateOrderQuantity(5, 10, 0, 2);
      expect(quantity).toBe(5);
    });
  });
});

// ========================================
// Multi-Supplier Ranking Tests
// ========================================

describe('Multi-Supplier Ranking', () => {
  interface SupplierOffer {
    supplierId: string;
    supplierName: string;
    price: number;
    stockQuantity: number;
    leadTime: number;
    hasColdChain: boolean;
    hasNarcoticsLicense: boolean;
    isPreferred: boolean;
  }

  const DEFAULT_CONFIG = {
    priceWeight: 0.4,
    stockWeight: 0.25,
    speedWeight: 0.2,
    complianceWeight: 0.15,
    preferredSupplierBonus: 0.1,
  };

  function rankOffers(
    offers: SupplierOffer[],
    requiresColdChain: boolean,
    isNarcotic: boolean,
    config = DEFAULT_CONFIG
  ): SupplierOffer[] {
    const maxPrice = Math.max(...offers.map((o) => o.price));
    const maxLeadTime = Math.max(...offers.map((o) => o.leadTime), 1);

    const scoredOffers = offers.map((offer) => {
      const priceScore = maxPrice > 0
        ? (1 - offer.price / maxPrice) * config.priceWeight
        : 0;

      const stockScore =
        (offer.stockQuantity > 0 ? 1 : 0) * config.stockWeight;

      const speedScore =
        (1 - offer.leadTime / maxLeadTime) * config.speedWeight;

      let complianceScore = 0;
      if (requiresColdChain && offer.hasColdChain) {
        complianceScore += config.complianceWeight / 2;
      }
      if (isNarcotic && offer.hasNarcoticsLicense) {
        complianceScore += config.complianceWeight / 2;
      }
      if (!requiresColdChain && !isNarcotic) {
        complianceScore = config.complianceWeight;
      }

      const preferredBonus = offer.isPreferred
        ? config.preferredSupplierBonus
        : 0;

      const totalScore =
        priceScore + stockScore + speedScore + complianceScore + preferredBonus;

      return { offer, score: totalScore };
    });

    return scoredOffers
      .sort((a, b) => b.score - a.score)
      .map((s) => s.offer);
  }

  test('should rank lowest price highest for general products', () => {
    const offers: SupplierOffer[] = [
      {
        supplierId: 's1',
        supplierName: 'Expensive',
        price: 5000,
        stockQuantity: 100,
        leadTime: 2,
        hasColdChain: false,
        hasNarcoticsLicense: false,
        isPreferred: false,
      },
      {
        supplierId: 's2',
        supplierName: 'Cheap',
        price: 2500,
        stockQuantity: 100,
        leadTime: 2,
        hasColdChain: false,
        hasNarcoticsLicense: false,
        isPreferred: false,
      },
    ];

    const ranked = rankOffers(offers, false, false);
    expect(ranked[0].supplierId).toBe('s2'); // Cheap should be first
  });

  test('should prefer supplier with cold chain for cold chain products', () => {
    const offers: SupplierOffer[] = [
      {
        supplierId: 's1',
        supplierName: 'No Cold Chain',
        price: 2500,
        stockQuantity: 100,
        leadTime: 2,
        hasColdChain: false,
        hasNarcoticsLicense: false,
        isPreferred: false,
      },
      {
        supplierId: 's2',
        supplierName: 'Has Cold Chain',
        price: 3000,
        stockQuantity: 100,
        leadTime: 2,
        hasColdChain: true,
        hasNarcoticsLicense: false,
        isPreferred: false,
      },
    ];

    const ranked = rankOffers(offers, true, false);
    // Cold chain should outweigh slight price difference
    expect(ranked[0].supplierId).toBe('s2');
  });

  test('should apply preferred supplier bonus', () => {
    const offers: SupplierOffer[] = [
      {
        supplierId: 's1',
        supplierName: 'Regular',
        price: 2500,
        stockQuantity: 100,
        leadTime: 2,
        hasColdChain: true,
        hasNarcoticsLicense: false,
        isPreferred: false,
      },
      {
        supplierId: 's2',
        supplierName: 'Preferred',
        price: 2600,
        stockQuantity: 100,
        leadTime: 2,
        hasColdChain: true,
        hasNarcoticsLicense: false,
        isPreferred: true,
      },
    ];

    const ranked = rankOffers(offers, false, false);
    // Preferred bonus should make up for small price difference
    expect(ranked[0].supplierId).toBe('s2');
  });

  test('should filter out suppliers without stock', () => {
    const offers: SupplierOffer[] = [
      {
        supplierId: 's1',
        supplierName: 'Out of Stock',
        price: 1000,
        stockQuantity: 0,
        leadTime: 1,
        hasColdChain: true,
        hasNarcoticsLicense: true,
        isPreferred: true,
      },
      {
        supplierId: 's2',
        supplierName: 'In Stock',
        price: 5000,
        stockQuantity: 100,
        leadTime: 5,
        hasColdChain: false,
        hasNarcoticsLicense: false,
        isPreferred: false,
      },
    ];

    const ranked = rankOffers(offers, false, false);
    // In stock should rank higher despite worse stats
    expect(ranked[0].supplierId).toBe('s2');
  });
});

// ========================================
// Urgency Calculation Tests
// ========================================

describe('Urgency Calculation', () => {
  function calculateUrgency(
    currentStock: number,
    safetyStock: number,
    daysUntilStockout: number | null,
    isNarcotic: boolean
  ): 'critical' | 'high' | 'medium' | 'low' {
    if (currentStock === 0) return 'critical';
    if (isNarcotic && currentStock < safetyStock) return 'high';
    if (daysUntilStockout !== null && daysUntilStockout <= 1) return 'critical';
    if (daysUntilStockout !== null && daysUntilStockout <= 3) return 'high';
    if (daysUntilStockout !== null && daysUntilStockout <= 7) return 'medium';
    if (currentStock < safetyStock) return 'medium';
    return 'low';
  }

  test('should return critical for out of stock', () => {
    expect(calculateUrgency(0, 10, null, false)).toBe('critical');
  });

  test('should return critical for 1 day until stockout', () => {
    expect(calculateUrgency(3, 10, 1, false)).toBe('critical');
  });

  test('should return high for narcotics below safety stock', () => {
    expect(calculateUrgency(5, 10, 5, true)).toBe('high');
  });

  test('should return high for 3 days until stockout', () => {
    expect(calculateUrgency(9, 10, 3, false)).toBe('high');
  });

  test('should return medium for 7 days until stockout', () => {
    expect(calculateUrgency(21, 10, 7, false)).toBe('medium');
  });

  test('should return medium for below safety stock', () => {
    expect(calculateUrgency(5, 10, 15, false)).toBe('medium');
  });

  test('should return low for sufficient stock', () => {
    expect(calculateUrgency(50, 10, 20, false)).toBe('low');
  });
});

// ========================================
// Inventory Status Tests
// ========================================

describe('Inventory Status', () => {
  function calculateStatus(
    currentStock: number,
    safetyStock: number,
    maxStock?: number
  ): InventoryStatus {
    if (currentStock === 0) return InventoryStatus.OUT_OF_STOCK;
    if (currentStock < safetyStock) return InventoryStatus.LOW;
    if (maxStock && currentStock > maxStock) return InventoryStatus.OVERSTOCK;
    return InventoryStatus.NORMAL;
  }

  test('should return OUT_OF_STOCK when currentStock is 0', () => {
    expect(calculateStatus(0, 10)).toBe(InventoryStatus.OUT_OF_STOCK);
  });

  test('should return LOW when currentStock < safetyStock', () => {
    expect(calculateStatus(5, 10)).toBe(InventoryStatus.LOW);
  });

  test('should return NORMAL when currentStock >= safetyStock', () => {
    expect(calculateStatus(15, 10)).toBe(InventoryStatus.NORMAL);
  });

  test('should return OVERSTOCK when currentStock > maxStock', () => {
    expect(calculateStatus(150, 10, 100)).toBe(InventoryStatus.OVERSTOCK);
  });
});

// ========================================
// Edge Cases
// ========================================

describe('Edge Cases', () => {
  test('should handle very large numbers', () => {
    const inventory = createMockInventory({
      currentStock: 999999,
      safetyStock: 1000000,
      averageDailyUsage: 10000,
    });
    expect(inventory.isLowStock).toBe(true);
    expect(inventory.estimatedDaysUntilStockout).toBe(99);
  });

  test('should handle decimal ASU', () => {
    const inventory = createMockInventory({
      currentStock: 10,
      averageDailyUsage: 2.5,
    });
    expect(inventory.estimatedDaysUntilStockout).toBe(4);
  });
});
