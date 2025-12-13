/**
 * Order Monitor Service
 *
 * Phase 9-B: Core 정렬 업데이트
 * - Core OrderRelayStatus enum 사용
 * - productType 기반 필터링 지원
 * - 주문 상태 흐름 정규화
 */

import { OrderRelayStatus, ProductType } from '@o4o/dropshipping-core';

export interface OrderRelay {
  id: string;
  orderId: string;
  orderNumber: string;
  listingId?: string;
  sellerId: string;
  sellerName: string;
  productId?: string;
  productMasterId?: string;
  productName: string;
  productType: ProductType;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: OrderRelayStatus;
  shippingInfo?: Record<string, any>;
  trackingNumber?: string;
  relayedAt?: Date;
  confirmedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderFilterOptions {
  productType?: ProductType;
  status?: OrderRelayStatus;
  sellerId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class OrderMonitorService {
  /**
   * Get order relays for a supplier (productType 필터링 지원)
   */
  async getOrderRelays(supplierId: string, options?: OrderFilterOptions): Promise<OrderRelay[]> {
    // Demo data (Core 스펙에 맞게 업데이트)
    const demoRelays: OrderRelay[] = [
      {
        id: '1',
        orderId: 'order-1',
        orderNumber: 'ORD-001',
        listingId: 'listing-1',
        sellerId: 's1',
        sellerName: '뷰티샵 A',
        productId: '1',
        productMasterId: 'pm-1',
        productName: '프리미엄 에센스 세럼',
        productType: ProductType.COSMETICS,
        quantity: 2,
        unitPrice: 32000,
        totalPrice: 64000,
        status: OrderRelayStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        orderId: 'order-2',
        orderNumber: 'ORD-002',
        listingId: 'listing-2',
        sellerId: 's2',
        sellerName: '스킨케어몰',
        productId: '2',
        productMasterId: 'pm-2',
        productName: '수분 크림',
        productType: ProductType.COSMETICS,
        quantity: 3,
        unitPrice: 25000,
        totalPrice: 75000,
        status: OrderRelayStatus.SHIPPED,
        trackingNumber: '1234567890',
        relayedAt: new Date(Date.now() - 86400000),
        confirmedAt: new Date(Date.now() - 86400000),
        shippedAt: new Date(),
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(),
      },
      {
        id: '3',
        orderId: 'order-3',
        orderNumber: 'ORD-003',
        listingId: 'listing-3',
        sellerId: 's1',
        sellerName: '뷰티샵 A',
        productId: '3',
        productMasterId: 'pm-3',
        productName: '클렌징 폼',
        productType: ProductType.COSMETICS,
        quantity: 5,
        unitPrice: 12000,
        totalPrice: 60000,
        status: OrderRelayStatus.DELIVERED,
        trackingNumber: '0987654321',
        relayedAt: new Date(Date.now() - 172800000),
        confirmedAt: new Date(Date.now() - 172800000),
        shippedAt: new Date(Date.now() - 86400000),
        deliveredAt: new Date(),
        createdAt: new Date(Date.now() - 172800000),
        updatedAt: new Date(),
      },
    ];

    // 필터링 적용
    let filtered = demoRelays;
    if (options?.productType) {
      filtered = filtered.filter(r => r.productType === options.productType);
    }
    if (options?.status) {
      filtered = filtered.filter(r => r.status === options.status);
    }
    if (options?.sellerId) {
      filtered = filtered.filter(r => r.sellerId === options.sellerId);
    }
    if (options?.startDate) {
      filtered = filtered.filter(r => r.createdAt >= options.startDate!);
    }
    if (options?.endDate) {
      filtered = filtered.filter(r => r.createdAt <= options.endDate!);
    }

    return filtered;
  }

  /**
   * productType별 주문 조회
   */
  async getOrderRelaysByProductType(supplierId: string, productType: ProductType): Promise<OrderRelay[]> {
    return this.getOrderRelays(supplierId, { productType });
  }

  /**
   * Get order counts by status
   */
  async getOrderCounts(supplierId: string): Promise<Record<OrderRelayStatus, number>> {
    return {
      [OrderRelayStatus.PENDING]: 5,
      [OrderRelayStatus.RELAYED]: 2,
      [OrderRelayStatus.CONFIRMED]: 3,
      [OrderRelayStatus.SHIPPED]: 8,
      [OrderRelayStatus.DELIVERED]: 45,
      [OrderRelayStatus.CANCELLED]: 1,
      [OrderRelayStatus.REFUNDED]: 0,
    };
  }

  /**
   * 주문 확인 (Supplier가 주문을 접수)
   */
  async confirmOrder(relayId: string): Promise<OrderRelay> {
    // 실제 구현에서는 DB 업데이트 및 Core Hook 호출
    console.log(`[OrderMonitorService] Order ${relayId} confirmed`);
    return {
      id: relayId,
      orderId: 'order-1',
      orderNumber: 'ORD-001',
      sellerId: 's1',
      sellerName: '뷰티샵 A',
      productName: '프리미엄 에센스 세럼',
      productType: ProductType.COSMETICS,
      quantity: 2,
      unitPrice: 32000,
      totalPrice: 64000,
      status: OrderRelayStatus.CONFIRMED,
      confirmedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Update relay tracking info (배송 시작)
   */
  async updateTracking(
    relayId: string,
    trackingNumber: string,
    shippingInfo?: Record<string, any>
  ): Promise<OrderRelay> {
    // 실제 구현에서는 DB 업데이트 및 Core Hook 호출
    console.log(`[OrderMonitorService] Order ${relayId} shipped with tracking ${trackingNumber}`);
    return {
      id: relayId,
      orderId: 'order-1',
      orderNumber: 'ORD-001',
      sellerId: 's1',
      sellerName: '뷰티샵 A',
      productName: '프리미엄 에센스 세럼',
      productType: ProductType.COSMETICS,
      quantity: 2,
      unitPrice: 32000,
      totalPrice: 64000,
      status: OrderRelayStatus.SHIPPED,
      shippingInfo,
      trackingNumber,
      shippedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * 배송 완료 처리
   */
  async markAsDelivered(relayId: string): Promise<OrderRelay> {
    console.log(`[OrderMonitorService] Order ${relayId} delivered`);
    return {
      id: relayId,
      orderId: 'order-1',
      orderNumber: 'ORD-001',
      sellerId: 's1',
      sellerName: '뷰티샵 A',
      productName: '프리미엄 에센스 세럼',
      productType: ProductType.COSMETICS,
      quantity: 2,
      unitPrice: 32000,
      totalPrice: 64000,
      status: OrderRelayStatus.DELIVERED,
      deliveredAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * 주문 취소 처리
   */
  async cancelOrder(relayId: string, reason?: string): Promise<OrderRelay> {
    console.log(`[OrderMonitorService] Order ${relayId} cancelled: ${reason}`);
    return {
      id: relayId,
      orderId: 'order-1',
      orderNumber: 'ORD-001',
      sellerId: 's1',
      sellerName: '뷰티샵 A',
      productName: '프리미엄 에센스 세럼',
      productType: ProductType.COSMETICS,
      quantity: 2,
      unitPrice: 32000,
      totalPrice: 64000,
      status: OrderRelayStatus.CANCELLED,
      cancelledAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
