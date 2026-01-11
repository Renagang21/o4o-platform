/**
 * Partner Settlements Routes
 *
 * Phase 7-B: checkout_orders 기반 정산 시스템
 *
 * ## 정산 대상 기준
 * - paymentStatus = 'paid' (결제 완료)
 * - status != 'cancelled' (취소되지 않음)
 * - 기간 내 paidAt 기준
 *
 * ## API 엔드포인트
 * - GET /api/v1/partner/settlements - 정산 목록 조회
 * - GET /api/v1/partner/settlements/summary - 정산 집계 조회
 * - GET /api/v1/partner/settlements/:id - 정산 상세 조회
 * - POST /api/v1/partner/settlements/preview - 정산 미리보기
 *
 * @see CLAUDE.md §7 - E-commerce Core 절대 규칙
 * @since Phase 7-B (2026-01-11)
 */

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware.js';
import { checkoutService } from '../../services/checkout.service.js';
import { OrderType } from '../../entities/checkout/CheckoutOrder.entity.js';
import logger from '../../utils/logger.js';

const router: Router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * 정산 상태
 */
enum SettlementStatus {
  PREVIEW = 'PREVIEW',     // 미리보기 (저장 전)
  OPEN = 'OPEN',           // 생성됨
  PENDING_PAYOUT = 'PENDING_PAYOUT', // 지급 대기
  PAID = 'PAID',           // 지급 완료
  CANCELLED = 'CANCELLED', // 취소됨
}

/**
 * @route GET /api/v1/partner/settlements/summary
 * @desc 정산 집계 조회 (기간별/서비스별)
 *
 * Phase 7-B: checkout_orders 기반 실제 집계
 *
 * @query period_start - 정산 시작일 (ISO 8601) [required]
 * @query period_end - 정산 종료일 (ISO 8601) [required]
 * @query order_type - OrderType 필터 (COSMETICS, TOURISM, DROPSHIPPING 등)
 * @query group_by - 그룹 기준 (orderType, supplierId, partnerId)
 * @access Private
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { period_start, period_end, order_type, group_by } = req.query;

    // 필수 파라미터 검증
    if (!period_start || !period_end) {
      return res.status(400).json({
        success: false,
        message: 'period_start and period_end are required',
      });
    }

    const periodStart = new Date(period_start as string);
    const periodEnd = new Date(period_end as string);

    // 날짜 유효성 검증
    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use ISO 8601 format.',
      });
    }

    // OrderType 검증
    let orderType: OrderType | undefined;
    if (order_type) {
      const orderTypeStr = (order_type as string).toUpperCase();
      if (Object.values(OrderType).includes(orderTypeStr as OrderType)) {
        orderType = orderTypeStr as OrderType;
      } else {
        return res.status(400).json({
          success: false,
          message: `Invalid order_type: ${order_type}. Valid values: ${Object.values(OrderType).join(', ')}`,
        });
      }
    }

    // groupBy 검증
    let groupBy: 'orderType' | 'supplierId' | 'partnerId' | undefined;
    if (group_by) {
      const validGroupBy = ['orderType', 'supplierId', 'partnerId'];
      if (validGroupBy.includes(group_by as string)) {
        groupBy = group_by as 'orderType' | 'supplierId' | 'partnerId';
      } else {
        return res.status(400).json({
          success: false,
          message: `Invalid group_by: ${group_by}. Valid values: ${validGroupBy.join(', ')}`,
        });
      }
    }

    logger.info('[PartnerSettlements] GET /settlements/summary', {
      userId,
      periodStart,
      periodEnd,
      orderType,
      groupBy,
    });

    // Phase 7-B: checkout_orders 기반 실제 집계
    const summary = await checkoutService.getSettlementSummary({
      periodStart,
      periodEnd,
      orderType,
      groupBy,
    });

    res.status(200).json({
      success: true,
      data: {
        period: {
          start: periodStart.toISOString(),
          end: periodEnd.toISOString(),
        },
        filter: {
          orderType: orderType || 'ALL',
        },
        summary: {
          totalOrders: summary.totalOrders,
          totalRevenue: summary.totalRevenue,
          currency: 'KRW',
        },
        byGroup: summary.byGroup,
      },
    });
  } catch (error: any) {
    logger.error('[PartnerSettlements] Error in GET /settlements/summary', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @route POST /api/v1/partner/settlements/preview
 * @desc 정산 미리보기 (저장하지 않고 계산만)
 *
 * Phase 7-B: checkout_orders 기반 정산 대상 조회
 *
 * @body period_start - 정산 시작일 (ISO 8601) [required]
 * @body period_end - 정산 종료일 (ISO 8601) [required]
 * @body order_type - OrderType 필터
 * @body partner_id - 파트너 ID 필터
 * @body supplier_id - 공급자 ID 필터
 * @access Private
 */
router.post('/preview', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { period_start, period_end, order_type, partner_id, supplier_id } = req.body;

    // 필수 파라미터 검증
    if (!period_start || !period_end) {
      return res.status(400).json({
        success: false,
        message: 'period_start and period_end are required',
      });
    }

    const periodStart = new Date(period_start);
    const periodEnd = new Date(period_end);

    // 날짜 유효성 검증
    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use ISO 8601 format.',
      });
    }

    // OrderType 검증
    let orderType: OrderType | undefined;
    if (order_type) {
      const orderTypeStr = (order_type as string).toUpperCase();
      if (Object.values(OrderType).includes(orderTypeStr as OrderType)) {
        orderType = orderTypeStr as OrderType;
      }
    }

    logger.info('[PartnerSettlements] POST /settlements/preview', {
      userId,
      periodStart,
      periodEnd,
      orderType,
      partnerId: partner_id,
      supplierId: supplier_id,
    });

    // Phase 7-B: checkout_orders 기반 정산 대상 조회
    const orders = await checkoutService.findSettlementTargetOrders({
      periodStart,
      periodEnd,
      orderType,
      partnerId: partner_id,
      supplierId: supplier_id,
    });

    // 집계 계산
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);

    // OrderType별 집계
    const byOrderType = orders.reduce((acc, order) => {
      const type = order.orderType || 'GENERIC';
      if (!acc[type]) {
        acc[type] = { count: 0, revenue: 0 };
      }
      acc[type].count++;
      acc[type].revenue += Number(order.totalAmount);
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);

    res.status(200).json({
      success: true,
      data: {
        status: SettlementStatus.PREVIEW,
        period: {
          start: periodStart.toISOString(),
          end: periodEnd.toISOString(),
        },
        filter: {
          orderType: orderType || 'ALL',
          partnerId: partner_id || null,
          supplierId: supplier_id || null,
        },
        summary: {
          totalOrders: orders.length,
          totalRevenue,
          currency: 'KRW',
        },
        byOrderType: Object.entries(byOrderType).map(([type, data]) => ({
          orderType: type,
          orderCount: data.count,
          revenue: data.revenue,
        })),
        // 주문 목록 (최대 100건)
        orders: orders.slice(0, 100).map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          orderType: order.orderType,
          totalAmount: Number(order.totalAmount),
          paidAt: order.paidAt?.toISOString(),
          supplierId: order.supplierId,
          partnerId: order.partnerId,
        })),
        hasMore: orders.length > 100,
      },
    });
  } catch (error: any) {
    logger.error('[PartnerSettlements] Error in POST /settlements/preview', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @route GET /api/v1/partner/settlements
 * @desc Fetch partner settlements with filters and pagination
 *
 * Phase 7-B: 실제 정산 이력 조회 (미구현 - 정산 Entity 필요)
 *
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 20)
 * @query status - Filter by status (OPEN, PENDING_PAYOUT, PAID, CANCELLED, ALL)
 * @query date_from - Filter from date (ISO 8601)
 * @query date_to - Filter to date (ISO 8601)
 * @access Private (Partner sees own, Admin sees all)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { page = 1, limit = 20, status, date_from, date_to } = req.query;

    logger.info('[PartnerSettlements] GET /settlements', {
      userId,
      page,
      limit,
      status,
      date_from,
      date_to,
    });

    // Phase 7-B Note: Settlement Entity가 구현되면 실제 조회로 전환
    // 현재는 summary와 preview를 통해 정산 기능 제공
    res.status(200).json({
      success: true,
      data: {
        settlements: [],
        pagination: {
          total: 0,
          page: Number(page),
          limit: Number(limit),
          total_pages: 0,
        },
      },
      message: 'Phase 7-B: Use /settlements/summary or /settlements/preview for settlement data. Settlement history will be available after Settlement Entity implementation.',
    });
  } catch (error: any) {
    logger.error('[PartnerSettlements] Error in GET /settlements', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @route GET /api/v1/partner/settlements/:id
 * @desc Fetch partner settlement detail by ID
 *
 * Phase 7-B: 단일 정산 조회 (미구현 - 정산 Entity 필요)
 *
 * @param id - Settlement ID
 * @access Private (Partner sees own, Admin sees all)
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    logger.info('[PartnerSettlements] GET /settlements/:id', { userId, settlementId: id });

    // Phase 7-B Note: Settlement Entity가 구현되면 실제 조회로 전환
    res.status(404).json({
      success: false,
      message: 'Phase 7-B: Settlement history not yet implemented. Use /settlements/preview to calculate settlement.',
    });
  } catch (error: any) {
    logger.error('[PartnerSettlements] Error in GET /settlements/:id', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @route POST /api/v1/partner/settlements
 * @desc Create new partner settlement
 *
 * Phase 7-B: 정산 생성 (미구현 - 정산 Entity 필요)
 *
 * @body period_start - Settlement period start date [required]
 * @body period_end - Settlement period end date [required]
 * @body memo_internal - Internal memo
 * @access Private (Partner, Admin)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { period_start, period_end, memo_internal } = req.body;

    logger.info('[PartnerSettlements] POST /settlements', {
      userId,
      period_start,
      period_end,
    });

    // Phase 7-B Note: Settlement Entity가 구현되면 실제 생성으로 전환
    res.status(501).json({
      success: false,
      message: 'Phase 7-B: Settlement creation not yet implemented. Use /settlements/preview to preview settlement data.',
    });
  } catch (error: any) {
    logger.error('[PartnerSettlements] Error in POST /settlements', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

/**
 * @route PATCH /api/v1/partner/settlements/:id/status
 * @desc Update settlement status
 *
 * Phase 7-B: 정산 상태 변경 (미구현 - 정산 Entity 필요)
 */
router.patch('/:id/status', async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: 'Phase 7-B: Settlement status update not yet implemented.',
  });
});

/**
 * @route PATCH /api/v1/partner/settlements/:id/internal-note
 * @desc Update settlement internal memo
 *
 * Phase 7-B: 정산 메모 수정 (미구현 - 정산 Entity 필요)
 */
router.patch('/:id/internal-note', async (req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    message: 'Phase 7-B: Settlement memo update not yet implemented.',
  });
});

export default router;
