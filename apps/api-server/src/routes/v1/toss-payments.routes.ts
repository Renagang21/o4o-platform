import { Router, Request, Response } from 'express';
import { tossPaymentsService } from '../../services/TossPaymentsService';
import { authenticateToken } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/error-handler';
import { AppDataSource } from '../../database/connection';
import { Order } from '../../entities/Order';
import { AuthRequest } from '../../types/auth';
import logger from '../../utils/simpleLogger';
import { env } from '../../utils/env-validator';

const router: Router = Router();
// Lazy load repository to avoid initialization issues
const getOrderRepository = () => AppDataSource.isInitialized ? AppDataSource.getRepository(Order) : null;

/**
 * 결제 요청 생성
 * POST /api/v1/payments/toss/create
 */
router.post('/toss/create', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
    const { orderId, amount, orderName, customerName, customerEmail, successUrl, failUrl } = req.body;
    const userId = (req.user as any)?.id;

    // TODO: Order 엔티티 구현 후 실제 주문 조회로 변경
    // Mock order validation
    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        error: '필수 파라미터가 누락되었습니다'
      });
    }

    // 결제 요청 생성
    const payment = await tossPaymentsService.createPayment({
      amount: amount,
      orderId: orderId,
      orderName: orderName || `주문 #${orderId}`,
      customerName: customerName,
      customerEmail: customerEmail,
      successUrl: successUrl || `${env.getString('FRONTEND_URL', '')}/payment/success`,
      failUrl: failUrl || `${env.getString('FRONTEND_URL', '')}/payment/fail`
    });

    return res.json(payment);
}));

/**
 * 결제 승인
 * POST /api/v1/payments/toss/confirm
 */
router.post('/toss/confirm', asyncHandler(async (req: Request, res: Response) => {
    const { paymentKey, orderId, amount } = req.body;

    if (!paymentKey || !orderId || !amount) {
      return res.status(400).json({
        success: false,
        error: '필수 파라미터가 누락되었습니다'
      });
    }

    const result = await tossPaymentsService.confirmPayment({
      paymentKey,
      orderId,
      amount
    });

    return res.json(result);
}));

/**
 * 결제 취소
 * POST /api/v1/payments/toss/cancel
 */
router.post('/toss/cancel', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
    const { paymentKey, cancelReason, cancelAmount } = req.body;
    const userId = (req.user as any)?.id;

    if (!paymentKey || !cancelReason) {
      return res.status(400).json({
        success: false,
        error: '필수 파라미터가 누락되었습니다'
      });
    }

    // 권한 확인 (주문 소유자 또는 관리자)
    // TODO: 실제 권한 체크 로직 구현

    const result = await tossPaymentsService.cancelPayment(
      paymentKey,
      cancelReason,
      cancelAmount
    );

    return res.json(result);
}));

/**
 * 결제 조회
 * GET /api/v1/payments/toss/:paymentKey
 */
router.get('/toss/:paymentKey', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
    const { paymentKey } = req.params;

    const result = await tossPaymentsService.getPayment(paymentKey);

    return res.json(result);
}));

/**
 * 결제 설정 조회
 * GET /api/v1/payments/toss/config
 */
router.get('/toss/config', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  // Return configuration status
  return res.json({
    success: true,
    data: {
      isConfigured: !!env.getString('TOSS_CLIENT_KEY', ''),
      clientKey: env.getString('TOSS_CLIENT_KEY', ''),
      mode: env.getString('TOSS_MODE', 'test'),
      webhookUrl: env.getString('TOSS_WEBHOOK_URL', '')
    }
  });
}));

/**
 * 결제 통계 조회
 * GET /api/v1/payments/toss/stats
 */
router.get('/toss/stats', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  // TODO: Implement actual stats from database
  return res.json({
    success: true,
    data: {
      totalPayments: 0,
      totalAmount: 0,
      todayPayments: 0,
      todayAmount: 0,
      pendingPayments: 0,
      failedPayments: 0
    }
  });
}));

/**
 * 테스트 결제 내역 조회
 * GET /api/v1/payments/toss/tests
 */
router.get('/toss/tests', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  // TODO: Implement test payments history
  return res.json({
    success: true,
    data: [],
    total: 0
  });
}));

/**
 * 환불 목록 조회
 * GET /api/v1/payments/refunds
 */
router.get('/refunds', asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10, status } = req.query;

    // TODO: Implement refunds list from database
    return res.json({
      success: true,
      data: [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: 0,
        totalPages: 0
      }
    });
}));

/**
 * 환불 통계 조회
 * GET /api/v1/payments/refunds/stats
 */
router.get('/refunds/stats', asyncHandler(async (req: Request, res: Response) => {
  // TODO: Implement refund stats from database
  return res.json({
    success: true,
    data: {
      totalRefunds: 0,
      totalRefundAmount: 0,
      pendingRefunds: 0,
      completedRefunds: 0,
      rejectedRefunds: 0
    }
  });
}));

/**
 * 토스페이먼츠 웹훅
 * POST /api/v1/payments/toss/webhook
 */
router.post('/toss/webhook', asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers['toss-signature'] as string;
    const timestamp = req.headers['toss-timestamp'] as string;

    if (!signature || !timestamp) {
      return res.status(400).json({
        success: false,
        error: 'Missing webhook headers'
      });
    }

    await tossPaymentsService.handleWebhook(signature, timestamp, req.body);

    // 토스페이먼츠는 200 OK 응답을 기대
    return res.status(200).json({ success: true });
}));

/**
 * 결제 성공 콜백 페이지
 * GET /api/v1/payments/toss/success
 */
router.get('/toss/success', asyncHandler(async (req: Request, res: Response) => {
    const { paymentKey, orderId, amount } = req.query;

    // 결제 승인 처리
    const result = await tossPaymentsService.confirmPayment({
      paymentKey: paymentKey as string,
      orderId: orderId as string,
      amount: Number(amount)
    });

    // 프론트엔드 성공 페이지로 리다이렉트
    return res.redirect(`${env.getString('FRONTEND_URL', '')}/payment/complete?orderId=${orderId}`);
}));

/**
 * 결제 실패 콜백 페이지
 * GET /api/v1/payments/toss/fail
 */
router.get('/toss/fail', asyncHandler(async (req: Request, res: Response) => {
  const { code, message, orderId } = req.query;
  
  logger.info('Payment failed callback:', { code, message, orderId });
  
  // 프론트엔드 실패 페이지로 리다이렉트
  return res.redirect(`${env.getString('FRONTEND_URL', '')}/payment/fail?code=${code}&message=${encodeURIComponent(message as string)}`);
}));

/**
 * 정산 조회 (관리자용)
 * GET /api/v1/payments/toss/settlements
 */
router.get('/toss/settlements', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
    const userRole = (req.user as any)?.role;
    
    // 관리자만 접근 가능
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: '권한이 없습니다'
      });
    }

    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        error: '날짜를 입력해주세요 (YYYY-MM-DD)'
      });
    }

    const result = await tossPaymentsService.getSettlements(date as string);
    
    return res.json(result);
}));

export default router;