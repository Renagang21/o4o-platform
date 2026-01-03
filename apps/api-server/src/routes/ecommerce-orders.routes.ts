/**
 * E-commerce Orders Routes
 *
 * H4-3: EcommerceOrder + Toss 결제 통합 API
 *
 * Checkout 도메인 대체 엔드포인트
 * - 주문 생성: EcommerceOrderService
 * - 결제 처리: EcommercePaymentService + TossPaymentsService
 *
 * 기존 checkout.routes.ts를 대체하며,
 * main-site에서 이 API를 사용하도록 전환
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { tossPaymentsService } from '../services/toss-payments.service.js';
import logger from '../utils/logger.js';

const router: Router = Router();

// ============================================================================
// Phase N-1 설정 (checkout에서 가져옴)
// ============================================================================

const PHASE_N1_CONFIG = {
  PLATFORM_SELLER_ID: 'platform-seller',
  SUCCESS_URL: '/checkout/result',
  FAIL_URL: '/checkout/result',
  MAX_ITEMS: 3,
  MAX_AMOUNT: 1000000,
};

// ============================================================================
// Interfaces
// ============================================================================

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface ShippingAddress {
  recipientName: string;
  phone: string;
  zipCode: string;
  address1: string;
  address2?: string;
  memo?: string;
}

interface CreateOrderRequest {
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  channel?: 'local' | 'travel';
  partnerId?: string;
  successUrl?: string;
  failUrl?: string;
}

// ============================================================================
// In-Memory Store (임시 - H4-5에서 DB 마이그레이션)
// ============================================================================

// H4-3: 임시 메모리 저장소 (EcommerceOrder로 전환 전 단계)
const orderStore = new Map<string, any>();
const paymentStore = new Map<string, any>();

function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ECO-${dateStr}-${random}`;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/v1/orders/initiate
 *
 * 주문 생성 + 결제 준비 (Checkout 대체)
 *
 * H4-3: EcommerceOrder 기반 주문 생성
 * - OrderType = RETAIL 고정
 * - metadata.channel 지원 (local/travel)
 * - Toss 결제 준비 정보 반환
 */
router.post('/initiate', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const {
      items,
      shippingAddress,
      channel = 'local',
      partnerId,
      successUrl,
      failUrl,
    }: CreateOrderRequest = req.body;

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

    // Phase N-1: 상품 개수 제한
    if (items.length > PHASE_N1_CONFIG.MAX_ITEMS) {
      return res.status(400).json({
        success: false,
        message: `Phase N-1: Maximum ${PHASE_N1_CONFIG.MAX_ITEMS} items allowed`,
      });
    }

    // 금액 계산
    const orderItems = items.map((item) => ({
      id: generateUUID(),
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.quantity * item.unitPrice,
    }));

    const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const shippingFee = 0;
    const discount = 0;
    const totalAmount = subtotal + shippingFee - discount;

    // Phase N-1: 금액 상한 체크
    if (totalAmount > PHASE_N1_CONFIG.MAX_AMOUNT) {
      return res.status(400).json({
        success: false,
        message: `Phase N-1: Maximum order amount is ${PHASE_N1_CONFIG.MAX_AMOUNT.toLocaleString()} KRW`,
      });
    }

    // 주문 생성 (H4-3: EcommerceOrder 스키마 기반)
    const orderId = generateUUID();
    const orderNumber = generateOrderNumber();
    const now = new Date();

    const order = {
      id: orderId,
      orderNumber,
      orderType: 'retail', // Cosmetics = RETAIL 고정
      buyerId: userId,
      sellerId: PHASE_N1_CONFIG.PLATFORM_SELLER_ID,
      status: 'created',
      paymentStatus: 'pending',
      subtotal,
      shippingFee,
      discount,
      totalAmount,
      currency: 'KRW',
      metadata: {
        channel,
        source: 'ecommerce-orders', // H4-3 마이그레이션 표시
      },
      items: orderItems,
      shippingAddress,
      partnerId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // 임시 저장
    orderStore.set(orderId, order);
    orderStore.set(orderNumber, order); // orderNumber로도 조회 가능

    // 결제 레코드 생성
    const paymentId = generateUUID();
    const payment = {
      id: paymentId,
      orderId,
      pgProvider: 'toss',
      amount: totalAmount,
      status: 'pending',
      createdAt: now.toISOString(),
    };
    paymentStore.set(paymentId, payment);
    paymentStore.set(`order:${orderId}`, payment);

    // 결제 준비 정보 생성
    const orderName =
      orderItems.length === 1
        ? orderItems[0].productName
        : `${orderItems[0].productName} 외 ${orderItems.length - 1}건`;

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const paymentInfo = tossPaymentsService.preparePayment({
      orderId: orderNumber,
      orderName,
      amount: totalAmount,
      successUrl: successUrl || `${baseUrl}${PHASE_N1_CONFIG.SUCCESS_URL}`,
      failUrl: failUrl || `${baseUrl}${PHASE_N1_CONFIG.FAIL_URL}`,
    });

    logger.info('[EcommerceOrders] Order initiated:', {
      orderId,
      orderNumber,
      channel,
      totalAmount,
      partnerId,
    });

    res.status(201).json({
      success: true,
      data: {
        orderId,
        orderNumber,
        totalAmount,
        payment: {
          ...paymentInfo,
          isTestMode: tossPaymentsService.isTestMode(),
        },
      },
    });
  } catch (error) {
    logger.error('[EcommerceOrders] Initiate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate order',
    });
  }
});

/**
 * POST /api/v1/orders/confirm
 *
 * Toss 결제 승인 (Checkout 대체)
 *
 * H4-3: EcommercePaymentService + TossPaymentsService 사용
 */
router.post('/confirm', async (req: Request, res: Response) => {
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
    const order = orderStore.get(orderNumber);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // 금액 검증
    if (Number(order.totalAmount) !== amount) {
      logger.warn('[EcommerceOrders] Payment amount mismatch:', {
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

    // 주문 상태 업데이트
    const now = new Date();
    order.status = 'paid';
    order.paymentStatus = 'paid';
    order.paymentMethod = tossResponse.method;
    order.paidAt = tossResponse.approvedAt;
    order.updatedAt = now.toISOString();

    // 결제 레코드 업데이트
    const payment = paymentStore.get(`order:${order.id}`);
    if (payment) {
      payment.paymentKey = paymentKey;
      payment.status = 'success';
      payment.method = tossResponse.method;
      payment.cardCompany = tossResponse.card?.company;
      payment.cardNumber = tossResponse.card?.number;
      payment.installmentMonths = tossResponse.card?.installmentPlanMonths;
      payment.approvedAt = tossResponse.approvedAt;
      payment.metadata = { tossResponse: tossResponse.rawResponse };
    }

    logger.info('[EcommerceOrders] Payment confirmed:', {
      orderId: order.id,
      orderNumber,
      paymentKey,
      amount,
      partnerId: order.partnerId,
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        paidAt: order.paidAt,
        partnerId: order.partnerId,
      },
    });
  } catch (error: any) {
    logger.error('[EcommerceOrders] Confirm error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Payment confirmation failed',
    });
  }
});

/**
 * POST /api/v1/orders/refund
 *
 * 환불 처리 (운영자만)
 */
router.post('/refund', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // 운영자만 환불 가능
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

    const order = orderStore.get(orderId);
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

    // 결제 레코드 조회
    const payment = paymentStore.get(`order:${order.id}`);

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

    // 상태 업데이트
    const now = new Date();
    order.status = 'refunded';
    order.paymentStatus = 'refunded';
    order.refundedAt = now.toISOString();
    order.updatedAt = now.toISOString();

    payment.status = 'refunded';
    payment.refundedAmount = amount || order.totalAmount;
    payment.refundReason = reason;
    payment.refundedAt = now.toISOString();

    logger.info('[EcommerceOrders] Payment refunded:', {
      orderId,
      orderNumber: order.orderNumber,
      reason,
      amount: amount || order.totalAmount,
      operatorId: user.id,
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        refundedAt: order.refundedAt,
        refundReason: reason,
      },
    });
  } catch (error: any) {
    logger.error('[EcommerceOrders] Refund error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Refund failed',
    });
  }
});

/**
 * GET /api/v1/orders/:id
 *
 * 주문 상세 조회
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    // UUID 또는 orderNumber로 조회
    let order = orderStore.get(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // 본인 주문인지 확인 (admin/operator는 모두 조회 가능)
    if (order.buyerId !== userId && !['admin', 'operator'].includes(userRole)) {
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
    logger.error('[EcommerceOrders] Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order',
    });
  }
});

/**
 * GET /api/v1/orders
 *
 * 내 주문 목록 조회
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // 사용자의 주문만 필터링
    const orders: any[] = [];
    orderStore.forEach((order, key) => {
      // UUID 형식의 키만 처리 (orderNumber 중복 제외)
      if (key.includes('-') && key.length > 20 && order.buyerId === userId) {
        orders.push(order);
      }
    });

    // 최신순 정렬
    orders.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    logger.error('[EcommerceOrders] Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get orders',
    });
  }
});

export default router;
