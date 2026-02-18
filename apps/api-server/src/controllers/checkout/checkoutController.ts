/**
 * Checkout Controller
 *
 * Phase N-2: 운영 안정화
 *
 * 결제 흐름 (DB 영속화 버전):
 * 1. initiate - 주문 생성 + 결제 준비 정보 반환
 * 2. confirm - Toss 결제 성공 후 서버 승인
 * 3. refund - 환불 처리 (운영자만)
 */

import { Response } from 'express';
import { AuthRequest } from '../../types/auth.js';
import { tossPaymentsService } from '../../services/toss-payments.service.js';
import { checkoutService } from '../../services/checkout.service.js';
import logger from '../../utils/logger.js';

// Phase N-1 고정 설정
const PHASE_N1_CONFIG = {
  // 단일 Supplier (하드코딩)
  SUPPLIER_ID: 'supplier-phase-n1',
  SUPPLIER_NAME: 'Phase N-1 Test Supplier',
  // Platform as Seller
  PLATFORM_SELLER_ID: 'platform-seller',
  // Base URLs
  SUCCESS_URL: '/checkout/result',
  FAIL_URL: '/checkout/result',
  // Phase N-1 제약
  MAX_ITEMS: 3,
  MAX_AMOUNT: 1000000,
};

export class CheckoutController {
  /**
   * POST /api/checkout/initiate
   *
   * 주문 생성 + 결제 준비
   */
  static async initiate(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const { items, shippingAddress, partnerId, sellerOrganizationId, successUrl, failUrl } =
        req.body;

      // Validation
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Items are required',
        });
      }

      if (!shippingAddress) {
        return res.status(400).json({
          success: false,
          message: 'Shipping address is required',
        });
      }

      // WO-CHECKOUT-ORG-BOUNDARY-FIX-V1: sellerOrganizationId UUID 검증
      if (sellerOrganizationId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(sellerOrganizationId)) {
          return res.status(400).json({
            success: false,
            message: 'sellerOrganizationId must be a valid UUID',
          });
        }
      }

      // Phase N-1: 상품 개수 제한
      if (items.length > PHASE_N1_CONFIG.MAX_ITEMS) {
        return res.status(400).json({
          success: false,
          message: `Phase N-1: Maximum ${PHASE_N1_CONFIG.MAX_ITEMS} items allowed`,
        });
      }

      // 금액 계산
      const orderItems = items.map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.quantity * item.unitPrice,
      }));

      const totalAmount = orderItems.reduce(
        (sum: number, item: any) => sum + item.subtotal,
        0
      );

      // Phase N-1: 금액 상한 체크
      if (totalAmount > PHASE_N1_CONFIG.MAX_AMOUNT) {
        return res.status(400).json({
          success: false,
          message: `Phase N-1: Maximum order amount is ${PHASE_N1_CONFIG.MAX_AMOUNT.toLocaleString()} KRW`,
        });
      }

      // DB에 주문 생성
      const order = await checkoutService.createOrder({
        buyerId: userId,
        sellerId: PHASE_N1_CONFIG.PLATFORM_SELLER_ID,
        supplierId: PHASE_N1_CONFIG.SUPPLIER_ID,
        partnerId: partnerId || undefined,
        sellerOrganizationId: sellerOrganizationId || undefined,
        items: orderItems,
        shippingAddress,
      });

      // 결제 레코드 생성
      await checkoutService.createPayment(order.id, order.totalAmount);

      // 결제 준비 정보 생성
      const orderName =
        orderItems.length === 1
          ? orderItems[0].productName
          : `${orderItems[0].productName} 외 ${orderItems.length - 1}건`;

      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const paymentInfo = tossPaymentsService.preparePayment({
        orderId: order.orderNumber,
        orderName,
        amount: order.totalAmount,
        successUrl: successUrl || `${baseUrl}${PHASE_N1_CONFIG.SUCCESS_URL}`,
        failUrl: failUrl || `${baseUrl}${PHASE_N1_CONFIG.FAIL_URL}`,
      });

      logger.info('Checkout initiated:', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        partnerId,
      });

      res.status(201).json({
        success: true,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          payment: {
            ...paymentInfo,
            isTestMode: tossPaymentsService.isTestMode(),
          },
        },
      });
    } catch (error) {
      logger.error('Checkout initiate error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initiate checkout',
      });
    }
  }

  /**
   * POST /api/checkout/confirm
   *
   * Toss 결제 승인
   */
  static async confirm(req: AuthRequest, res: Response) {
    try {
      const { paymentKey, orderId: orderNumber, amount } = req.body;

      // Validation
      if (!paymentKey || !orderNumber || !amount) {
        return res.status(400).json({
          success: false,
          message: 'paymentKey, orderId, amount are required',
        });
      }

      // 주문 조회
      const order = await checkoutService.findByOrderNumber(orderNumber);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      // 금액 검증
      if (Number(order.totalAmount) !== amount) {
        logger.warn('Payment amount mismatch:', {
          expected: order.totalAmount,
          received: amount,
        });
        return res.status(400).json({
          success: false,
          message: 'Payment amount mismatch',
        });
      }

      // 이미 결제된 주문인지 확인
      if (order.paymentStatus === 'paid') {
        return res.status(400).json({
          success: false,
          message: 'Order already paid',
        });
      }

      // Toss 결제 승인
      const tossResponse = await tossPaymentsService.confirmPayment({
        paymentKey,
        orderId: orderNumber,
        amount,
      });

      // DB 업데이트
      const { order: updatedOrder } = await checkoutService.completePayment(
        order.id,
        {
          paymentKey,
          method: tossResponse.method,
          cardCompany: tossResponse.card?.company,
          cardNumber: tossResponse.card?.number,
          installmentMonths: tossResponse.card?.installmentPlanMonths,
          approvedAt: tossResponse.approvedAt,
          metadata: { tossResponse: tossResponse.rawResponse },
        }
      );

      logger.info('Payment confirmed:', {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        paymentKey,
        amount,
        partnerId: updatedOrder.partnerId,
      });

      res.json({
        success: true,
        data: {
          orderId: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          status: updatedOrder.status,
          paymentStatus: updatedOrder.paymentStatus,
          totalAmount: updatedOrder.totalAmount,
          paidAt: updatedOrder.paidAt,
          partnerId: updatedOrder.partnerId,
        },
      });
    } catch (error: any) {
      logger.error('Payment confirm error:', error);

      res.status(400).json({
        success: false,
        message: error.message || 'Payment confirmation failed',
      });
    }
  }

  /**
   * POST /api/checkout/refund
   *
   * 환불 처리 (운영자만)
   */
  static async refund(req: AuthRequest, res: Response) {
    try {
      const user = (req as any).user;

      // Phase N-2: 운영자만 환불 가능
      if (!user || !['admin', 'operator'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Only operators can process refunds',
        });
      }

      const { orderId, reason, amount } = req.body;

      if (!orderId || !reason) {
        return res.status(400).json({
          success: false,
          message: 'orderId and reason are required',
        });
      }

      const order = await checkoutService.findById(orderId);
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

      // Payment 레코드 조회
      const payment = await checkoutService.findPaymentByOrderId(orderId);

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
      const { order: updatedOrder } = await checkoutService.refundOrder(
        orderId,
        {
          reason,
          amount,
          performedBy: user.id,
          performerType: user.role,
        }
      );

      logger.info('Payment refunded:', {
        orderId,
        orderNumber: updatedOrder.orderNumber,
        reason,
        amount: amount || updatedOrder.totalAmount,
        operatorId: user.id,
      });

      res.json({
        success: true,
        data: {
          orderId: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          status: updatedOrder.status,
          paymentStatus: updatedOrder.paymentStatus,
          refundedAt: updatedOrder.refundedAt,
          refundReason: reason,
        },
      });
    } catch (error: any) {
      logger.error('Refund error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Refund failed',
      });
    }
  }

  /**
   * GET /api/orders/:id
   *
   * 주문 상세 조회
   */
  static async getOrder(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      // UUID 또는 orderNumber로 조회
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

      // 본인 주문인지 확인 (admin/operator는 모두 조회 가능)
      if (
        order.buyerId !== userId &&
        !['admin', 'operator'].includes(userRole)
      ) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      logger.error('Get order error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get order',
      });
    }
  }

  /**
   * GET /api/orders
   *
   * 내 주문 목록 조회
   */
  static async getOrders(req: AuthRequest, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const orders = await checkoutService.findByBuyerId(userId);

      res.json({
        success: true,
        data: orders,
      });
    } catch (error) {
      logger.error('Get orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get orders',
      });
    }
  }
}
