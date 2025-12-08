/**
 * Order Monitor Service
 *
 * Monitors order relays for Supplier
 */

export interface OrderRelay {
  id: string;
  orderId: string;
  sellerId: string;
  sellerName: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  status: 'pending' | 'dispatched' | 'fulfilled' | 'failed';
  trackingNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class OrderMonitorService {
  /**
   * Get order relays for a supplier
   */
  async getOrderRelays(supplierId: string): Promise<OrderRelay[]> {
    // Demo data
    return [
      {
        id: '1',
        orderId: 'ORD-001',
        sellerId: 's1',
        sellerName: '뷰티샵 A',
        productName: '프리미엄 에센스 세럼',
        quantity: 2,
        totalPrice: 64000,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        orderId: 'ORD-002',
        sellerId: 's2',
        sellerName: '스킨케어몰',
        productName: '수분 크림',
        quantity: 3,
        totalPrice: 75000,
        status: 'dispatched',
        trackingNumber: '1234567890',
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(),
      },
      {
        id: '3',
        orderId: 'ORD-003',
        sellerId: 's1',
        sellerName: '뷰티샵 A',
        productName: '클렌징 폼',
        quantity: 5,
        totalPrice: 60000,
        status: 'fulfilled',
        trackingNumber: '0987654321',
        createdAt: new Date(Date.now() - 172800000),
        updatedAt: new Date(Date.now() - 86400000),
      },
    ];
  }

  /**
   * Get order counts by status
   */
  async getOrderCounts(supplierId: string): Promise<Record<string, number>> {
    return {
      pending: 5,
      dispatched: 8,
      fulfilled: 45,
      failed: 1,
    };
  }

  /**
   * Update relay tracking info
   */
  async updateTracking(
    relayId: string,
    trackingNumber: string
  ): Promise<OrderRelay> {
    return {
      id: relayId,
      orderId: 'ORD-001',
      sellerId: 's1',
      sellerName: '뷰티샵 A',
      productName: '프리미엄 에센스 세럼',
      quantity: 2,
      totalPrice: 64000,
      status: 'dispatched',
      trackingNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
