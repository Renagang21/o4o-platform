/**
 * Dashboard Service
 *
 * Phase 9-B: Core 정렬 업데이트
 * - OrderRelayStatus enum과 정렬
 * - productType별 통계 지원 준비
 */

import type { DashboardSummaryDto } from '../dto/index.js';

export class DashboardService {
  /**
   * Get dashboard summary for a supplier
   *
   * @param supplierId - Supplier ID
   * @returns Dashboard summary data
   */
  async getDashboardSummary(supplierId: string): Promise<DashboardSummaryDto> {
    // In production, this would query the database
    // For now, return demo data
    return {
      supplierId,
      approvalStatus: 'active',
      totalProducts: 25,
      activeOffers: 18,
      pendingListingRequests: 5,
      relayStats: {
        pending: 3,
        relayed: 2,
        confirmed: 3,
        shipped: 8,
        delivered: 45,
        cancelled: 1,
      },
      monthSales: 8750000,
      pendingSettlement: 3500000,
      recentNotifications: [
        {
          id: '1',
          type: 'order',
          title: '새 주문 접수',
          message: '주문 #ORD-001이 접수되었습니다.',
          createdAt: new Date(),
        },
        {
          id: '2',
          type: 'listing',
          title: '리스팅 승인 요청',
          message: 'Seller A가 상품 리스팅을 요청했습니다.',
          createdAt: new Date(Date.now() - 3600000),
        },
      ],
    };
  }
}
