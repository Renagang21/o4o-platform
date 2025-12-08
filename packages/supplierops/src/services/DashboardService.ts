/**
 * Dashboard Service
 *
 * Aggregates dashboard data for Supplier
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
        dispatched: 8,
        fulfilled: 45,
        failed: 1,
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
