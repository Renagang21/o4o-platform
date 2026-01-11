/**
 * Admin Stats Controller
 *
 * Phase 7-C: checkout_orders 기반 실데이터 리포트
 *
 * ## 변경 사항 (Phase 7-C)
 * - Mock 데이터 제거
 * - checkout_orders 기반 실제 집계
 * - OrderType별 리포트 지원
 * - paidAt 기준 기간 필터 통일
 *
 * ## 데이터 기준
 * - 매출: paymentStatus='paid' AND status!='cancelled'
 * - 기간: paidAt 기준
 * - 그룹핑: orderType, supplierId, partnerId
 *
 * @see CLAUDE.md §7 - E-commerce Core 절대 규칙
 * @since Phase 7-C (2026-01-11)
 */

import { Request, Response } from 'express';
import { checkoutService } from '../../services/checkout.service.js';
import { OrderType } from '../../entities/checkout/CheckoutOrder.entity.js';
import logger from '../../utils/logger.js';

/**
 * Admin 권한 체크
 */
function isAdmin(req: Request): boolean {
  const user = (req as any).user;
  return user && (
    user.role === 'admin' ||
    user.role === 'administrator' ||
    user.role === 'operator' ||
    user.roles?.includes('admin') ||
    user.roles?.includes('administrator')
  );
}

export class AdminStatsController {
  /**
   * Get platform statistics
   * GET /api/v1/admin/platform-stats
   *
   * Phase 7-C: checkout_orders 기반 실데이터
   *
   * @query period - 기간 (7d, 30d, 90d, 365d, all) default: 30d
   * @query order_type - OrderType 필터
   */
  async getPlatformStats(req: Request, res: Response) {
    try {
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      const { period = '30d', order_type } = req.query;

      // 기간 계산
      const { periodStart, periodEnd } = this.calculatePeriod(period as string);

      // OrderType 검증
      let orderType: OrderType | undefined;
      if (order_type) {
        const orderTypeStr = (order_type as string).toUpperCase();
        if (Object.values(OrderType).includes(orderTypeStr as OrderType)) {
          orderType = orderTypeStr as OrderType;
        }
      }

      // Phase 7-C: checkout_orders 기반 실제 집계
      const summary = await checkoutService.getSettlementSummary({
        periodStart,
        periodEnd,
        orderType,
        groupBy: 'orderType',
      });

      // 일별 데이터 조회
      const dailyData = await this.getDailyRevenue(periodStart, periodEnd, orderType);

      // 주문 상태별 건수
      const statusCounts = await this.getStatusCounts(periodStart, periodEnd, orderType);

      const stats = {
        success: true,
        data: {
          period: {
            type: period,
            start: periodStart.toISOString(),
            end: periodEnd.toISOString(),
          },
          filter: {
            orderType: orderType || 'ALL',
          },
          overview: {
            totalRevenue: summary.totalRevenue,
            totalOrders: summary.totalOrders,
            averageOrderValue: summary.totalOrders > 0
              ? Math.round(summary.totalRevenue / summary.totalOrders)
              : 0,
            currency: 'KRW',
          },
          byOrderType: summary.byGroup?.map(g => ({
            orderType: g.groupKey,
            orderCount: g.orderCount,
            revenue: g.revenue,
          })) || [],
          byStatus: statusCounts,
          dailyRevenue: dailyData,
        },
        // Phase 7-C: 데이터 출처 명시
        _meta: {
          source: 'checkout_orders',
          generatedAt: new Date().toISOString(),
          note: 'Phase 7-C: Real data from checkout_orders (paidAt basis)',
        },
      };

      res.json(stats);
    } catch (error) {
      logger.error('Error fetching platform stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch platform statistics'
      });
    }
  }

  /**
   * Get revenue summary
   * GET /api/v1/admin/revenue-summary
   *
   * Phase 7-C: checkout_orders 기반 실데이터
   *
   * @query period - 기간 (7d, 30d, 90d, 365d, all) default: 30d
   * @query order_type - OrderType 필터
   * @query group_by - 그룹 기준 (orderType, supplierId, partnerId)
   */
  async getRevenueSummary(req: Request, res: Response) {
    try {
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      const { period = '30d', order_type, group_by } = req.query;

      // 기간 계산
      const { periodStart, periodEnd } = this.calculatePeriod(period as string);

      // OrderType 검증
      let orderType: OrderType | undefined;
      if (order_type) {
        const orderTypeStr = (order_type as string).toUpperCase();
        if (Object.values(OrderType).includes(orderTypeStr as OrderType)) {
          orderType = orderTypeStr as OrderType;
        }
      }

      // groupBy 검증
      let groupBy: 'orderType' | 'supplierId' | 'partnerId' | undefined;
      if (group_by) {
        const validGroupBy = ['orderType', 'supplierId', 'partnerId'];
        if (validGroupBy.includes(group_by as string)) {
          groupBy = group_by as 'orderType' | 'supplierId' | 'partnerId';
        }
      }

      // Phase 7-C: checkout_orders 기반 실제 집계
      const summary = await checkoutService.getSettlementSummary({
        periodStart,
        periodEnd,
        orderType,
        groupBy,
      });

      // 일 평균 계산
      const daysDiff = Math.max(1, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)));
      const averageDaily = Math.round(summary.totalRevenue / daysDiff);

      res.json({
        success: true,
        data: {
          period: {
            type: period,
            start: periodStart.toISOString(),
            end: periodEnd.toISOString(),
            days: daysDiff,
          },
          filter: {
            orderType: orderType || 'ALL',
            groupBy: groupBy || 'none',
          },
          summary: {
            totalRevenue: summary.totalRevenue,
            totalOrders: summary.totalOrders,
            averageDaily,
            averageOrderValue: summary.totalOrders > 0
              ? Math.round(summary.totalRevenue / summary.totalOrders)
              : 0,
            currency: 'KRW',
          },
          byGroup: summary.byGroup || [],
        },
        _meta: {
          source: 'checkout_orders',
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Error fetching revenue summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch revenue summary'
      });
    }
  }

  /**
   * Get pending settlements summary
   * GET /api/v1/admin/pending-settlements
   *
   * Phase 7-C: checkout_orders 기반 정산 예정 데이터
   * - 결제 완료되었으나 아직 정산되지 않은 주문 기준
   */
  async getPendingSettlements(req: Request, res: Response) {
    try {
      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      // 이번 달 기준 정산 대상 조회
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // Phase 7-C: checkout_orders 기반 정산 대상 집계
      const summary = await checkoutService.getSettlementSummary({
        periodStart,
        periodEnd,
        groupBy: 'orderType',
      });

      res.json({
        success: true,
        data: {
          period: {
            start: periodStart.toISOString(),
            end: periodEnd.toISOString(),
            label: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
          },
          summary: {
            totalOrders: summary.totalOrders,
            totalAmount: summary.totalRevenue,
            currency: 'KRW',
          },
          byOrderType: summary.byGroup?.map(g => ({
            orderType: g.groupKey,
            orderCount: g.orderCount,
            amount: g.revenue,
          })) || [],
        },
        _meta: {
          source: 'checkout_orders',
          generatedAt: new Date().toISOString(),
          note: 'Phase 7-C: Settlement candidates from checkout_orders',
        },
      });
    } catch (error) {
      logger.error('Error fetching pending settlements:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pending settlements'
      });
    }
  }

  /**
   * Process settlement (placeholder)
   * POST /api/v1/admin/process-settlement/:id
   */
  async processSettlement(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { action } = req.body;

      if (!isAdmin(req)) {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      if (!['approve', 'defer'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Use "approve" or "defer"'
        });
      }

      // Phase 7-C Note: 실제 정산 처리는 Settlement Entity 구현 후 활성화
      logger.info(`Processing settlement ${id} with action: ${action}`);

      res.json({
        success: true,
        message: `Settlement ${action === 'approve' ? '승인' : '보류'} 요청됨`,
        data: {
          settlementId: id,
          action,
          processedBy: (req as any).user?.id,
          processedAt: new Date().toISOString()
        },
        _meta: {
          note: 'Phase 7-C: Settlement Entity implementation required for actual processing',
        },
      });
    } catch (error) {
      logger.error('Error processing settlement:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process settlement'
      });
    }
  }

  // ============================================================================
  // Helper Methods (Phase 7-C)
  // ============================================================================

  /**
   * 기간 문자열을 Date 범위로 변환
   */
  private calculatePeriod(period: string): { periodStart: Date; periodEnd: Date } {
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    let periodStart: Date;

    switch (period) {
      case '7d':
        periodStart = new Date(now);
        periodStart.setDate(periodStart.getDate() - 7);
        break;
      case '30d':
        periodStart = new Date(now);
        periodStart.setDate(periodStart.getDate() - 30);
        break;
      case '90d':
        periodStart = new Date(now);
        periodStart.setDate(periodStart.getDate() - 90);
        break;
      case '365d':
        periodStart = new Date(now);
        periodStart.setFullYear(periodStart.getFullYear() - 1);
        break;
      case 'all':
        periodStart = new Date(2020, 0, 1); // 플랫폼 시작일
        break;
      default:
        periodStart = new Date(now);
        periodStart.setDate(periodStart.getDate() - 30);
    }

    periodStart.setHours(0, 0, 0, 0);

    return { periodStart, periodEnd };
  }

  /**
   * 일별 매출 데이터 조회
   *
   * Phase 7-C: checkout_orders 기반 실제 일별 집계
   */
  private async getDailyRevenue(
    periodStart: Date,
    periodEnd: Date,
    orderType?: OrderType
  ): Promise<Array<{ date: string; revenue: number; orders: number }>> {
    try {
      // 정산 대상 주문 조회
      const orders = await checkoutService.findSettlementTargetOrders({
        periodStart,
        periodEnd,
        orderType,
      });

      // 일별 집계
      const dailyMap = new Map<string, { revenue: number; orders: number }>();

      for (const order of orders) {
        if (order.paidAt) {
          const dateKey = order.paidAt.toISOString().split('T')[0];
          const existing = dailyMap.get(dateKey) || { revenue: 0, orders: 0 };
          dailyMap.set(dateKey, {
            revenue: existing.revenue + Number(order.totalAmount),
            orders: existing.orders + 1,
          });
        }
      }

      // 날짜 순 정렬
      const result = Array.from(dailyMap.entries())
        .map(([date, data]) => ({
          date,
          revenue: data.revenue,
          orders: data.orders,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return result;
    } catch (error) {
      logger.error('Error getting daily revenue:', error);
      return [];
    }
  }

  /**
   * 주문 상태별 건수 조회
   */
  private async getStatusCounts(
    periodStart: Date,
    periodEnd: Date,
    orderType?: OrderType
  ): Promise<{
    paid: number;
    pending: number;
    refunded: number;
    cancelled: number;
  }> {
    try {
      // 결제 완료
      const paidResult = await checkoutService.findAll({
        paymentStatus: 'paid' as any,
        orderType,
      });

      // 결제 대기
      const pendingResult = await checkoutService.findAll({
        paymentStatus: 'pending' as any,
        orderType,
      });

      // 환불
      const refundedResult = await checkoutService.findAll({
        paymentStatus: 'refunded' as any,
        orderType,
      });

      // 취소
      const cancelledResult = await checkoutService.findAll({
        status: 'cancelled' as any,
        orderType,
      });

      return {
        paid: paidResult.total,
        pending: pendingResult.total,
        refunded: refundedResult.total,
        cancelled: cancelledResult.total,
      };
    } catch (error) {
      logger.error('Error getting status counts:', error);
      return { paid: 0, pending: 0, refunded: 0, cancelled: 0 };
    }
  }
}

export default new AdminStatsController();
