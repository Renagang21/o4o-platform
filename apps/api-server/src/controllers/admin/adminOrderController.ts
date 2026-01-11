/**
 * Admin Order Controller
 *
 * Phase N-2: 운영 안정화
 * Phase 7-A: orderType 필터 추가
 *
 * 운영자용 주문 관리 API
 * - 주문 목록/상세 조회
 * - 환불 처리
 * - 상태/로그 조회
 * - 서비스별(OrderType) 필터링
 */

import { Response } from 'express';
import { AuthRequest } from '../../types/auth.js';
import { checkoutService } from '../../services/checkout.service.js';
import { tossPaymentsService } from '../../services/toss-payments.service.js';
import { OrderType } from '../../entities/checkout/CheckoutOrder.entity.js';
import logger from '../../utils/logger.js';

/**
 * Admin 권한 체크
 */
function isAdmin(user: any): boolean {
  return user && ['admin', 'operator'].includes(user.role);
}

export class AdminOrderController {
  /**
   * GET /api/admin/orders
   *
   * 주문 목록 조회 (Admin)
   *
   * Phase 7-A: orderType 쿼리 파라미터 추가
   * - ?orderType=COSMETICS → Cosmetics 주문만
   * - ?orderType=TOURISM → Tourism 주문만
   * - ?orderType=DROPSHIPPING → Dropshipping 주문만
   * - 미지정 시 전체 주문 조회
   */
  static async getOrders(req: AuthRequest, res: Response) {
    try {
      const user = (req as any).user;

      if (!isAdmin(user)) {
        return res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
      }

      const { status, paymentStatus, supplierId, partnerId, orderType, limit, offset } =
        req.query;

      // Phase 7-A: orderType 유효성 검증
      let validatedOrderType: OrderType | undefined;
      if (orderType) {
        const orderTypeStr = (orderType as string).toUpperCase();
        if (Object.values(OrderType).includes(orderTypeStr as OrderType)) {
          validatedOrderType = orderTypeStr as OrderType;
        } else {
          return res.status(400).json({
            success: false,
            message: `Invalid orderType: ${orderType}. Valid values: ${Object.values(OrderType).join(', ')}`,
          });
        }
      }

      const { orders, total } = await checkoutService.findAll({
        status: status as any,
        paymentStatus: paymentStatus as any,
        supplierId: supplierId as string,
        partnerId: partnerId as string,
        orderType: validatedOrderType, // Phase 7-A
        limit: limit ? parseInt(limit as string, 10) : 50,
        offset: offset ? parseInt(offset as string, 10) : 0,
      });

      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            total,
            limit: limit ? parseInt(limit as string, 10) : 50,
            offset: offset ? parseInt(offset as string, 10) : 0,
          },
          // Phase 7-A: 현재 적용된 필터 정보
          filters: {
            orderType: validatedOrderType || 'ALL',
          },
        },
      });
    } catch (error) {
      logger.error('Admin get orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get orders',
      });
    }
  }

  /**
   * GET /api/admin/orders/:id
   *
   * 주문 상세 조회 (Admin)
   */
  static async getOrder(req: AuthRequest, res: Response) {
    try {
      const user = (req as any).user;

      if (!isAdmin(user)) {
        return res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
      }

      const { id } = req.params;

      let order = await checkoutService.findById(id);

      if (!order) {
        order = await checkoutService.findByOrderNumber(id);
      }

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      // 결제 정보 조회
      const payment = await checkoutService.findPaymentByOrderId(order.id);

      res.json({
        success: true,
        data: {
          order,
          payment,
        },
      });
    } catch (error) {
      logger.error('Admin get order error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get order',
      });
    }
  }

  /**
   * POST /api/admin/orders/:id/refund
   *
   * 환불 처리 (Admin)
   */
  static async refundOrder(req: AuthRequest, res: Response) {
    try {
      const user = (req as any).user;

      if (!isAdmin(user)) {
        return res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
      }

      const { id } = req.params;
      const { reason, amount } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Refund reason is required',
        });
      }

      const order = await checkoutService.findById(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      if (order.paymentStatus !== 'paid') {
        return res.status(400).json({
          success: false,
          message: 'Only paid orders can be refunded',
        });
      }

      // Payment 조회
      const payment = await checkoutService.findPaymentByOrderId(id);

      if (!payment || !payment.paymentKey) {
        return res.status(400).json({
          success: false,
          message: 'Payment record not found',
        });
      }

      // Toss 환불 요청
      await tossPaymentsService.cancelPayment({
        paymentKey: payment.paymentKey,
        cancelReason: reason,
        cancelAmount: amount,
      });

      // DB 업데이트
      const { order: updatedOrder, payment: updatedPayment } =
        await checkoutService.refundOrder(id, {
          reason,
          amount,
          performedBy: user.id,
          performerType: user.role,
        });

      logger.info('Admin refund processed:', {
        orderId: id,
        orderNumber: updatedOrder.orderNumber,
        reason,
        amount: amount || updatedOrder.totalAmount,
        adminId: user.id,
      });

      res.json({
        success: true,
        data: {
          order: updatedOrder,
          payment: updatedPayment,
        },
        message: 'Refund processed successfully',
      });
    } catch (error: any) {
      logger.error('Admin refund error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Refund failed',
      });
    }
  }

  /**
   * GET /api/admin/orders/:id/logs
   *
   * 주문 로그 조회 (Admin)
   */
  static async getOrderLogs(req: AuthRequest, res: Response) {
    try {
      const user = (req as any).user;

      if (!isAdmin(user)) {
        return res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
      }

      const { id } = req.params;

      const order = await checkoutService.findById(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      const logs = await checkoutService.getOrderLogs(id);

      res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      logger.error('Admin get order logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get order logs',
      });
    }
  }

  /**
   * GET /api/admin/orders/stats
   *
   * 주문 통계 (간단 버전)
   */
  static async getStats(req: AuthRequest, res: Response) {
    try {
      const user = (req as any).user;

      if (!isAdmin(user)) {
        return res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
      }

      // 각 상태별 주문 수 조회
      const { orders: paidOrders, total: paidCount } =
        await checkoutService.findAll({
          paymentStatus: 'paid' as any,
        });

      const { total: refundedCount } = await checkoutService.findAll({
        paymentStatus: 'refunded' as any,
      });

      const { total: pendingCount } = await checkoutService.findAll({
        paymentStatus: 'pending' as any,
      });

      // 총 매출 계산
      const totalRevenue = paidOrders.reduce(
        (sum, order) => sum + Number(order.totalAmount),
        0
      );

      res.json({
        success: true,
        data: {
          counts: {
            paid: paidCount,
            refunded: refundedCount,
            pending: pendingCount,
            total: paidCount + refundedCount + pendingCount,
          },
          revenue: {
            total: totalRevenue,
            currency: 'KRW',
          },
        },
      });
    } catch (error) {
      logger.error('Admin get stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get stats',
      });
    }
  }
}
