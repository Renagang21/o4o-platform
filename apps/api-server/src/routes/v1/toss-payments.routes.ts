import { Router, Request, Response } from 'express';
import { tossPaymentsService } from '../../services/TossPaymentsService';
import { authenticateToken } from '../../middleware/auth';
import { AppDataSource } from '../../database/connection';
import { Order } from '../../entities/Order';
import { AuthRequest } from '../../types/auth';
import logger from '../../utils/simpleLogger';

const router: Router = Router();
const orderRepository = AppDataSource.getRepository(Order);

/**
 * 결제 요청 생성
 * POST /api/v1/payments/toss/create
 */
router.post('/toss/create', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { orderId, successUrl, failUrl } = req.body;
    const userId = (req.user as any)?.id;

    // 주문 조회 및 검증
    const order = await orderRepository.findOne({
      where: { id: orderId, userId },
      relations: ['items', 'items.product']
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: '주문을 찾을 수 없습니다'
      });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        error: '이미 결제된 주문입니다'
      });
    }

    // 결제 요청 생성
    const payment = await tossPaymentsService.createPayment({
      amount: order.totalAmount,
      orderId: order.id,
      orderName: `주문 #${order.orderNumber}`,
      customerName: order.billing?.firstName + ' ' + order.billing?.lastName,
      customerEmail: order.billing?.email,
      successUrl: successUrl || `${process.env.FRONTEND_URL}/payment/success`,
      failUrl: failUrl || `${process.env.FRONTEND_URL}/payment/fail`
    });

    res.json(payment);
  } catch (error: any) {
    logger.error('Payment creation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || '결제 요청 생성 실패'
    });
  }
});

/**
 * 결제 승인
 * POST /api/v1/payments/toss/confirm
 */
router.post('/toss/confirm', async (req: Request, res: Response) => {
  try {
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

    res.json(result);
  } catch (error: any) {
    logger.error('Payment confirmation failed:', error);
    
    const errorCode = error.response?.data?.code;
    const errorMessage = error.response?.data?.message || error.message;

    res.status(400).json({
      success: false,
      error: errorMessage,
      code: errorCode
    });
  }
});

/**
 * 결제 취소
 * POST /api/v1/payments/toss/cancel
 */
router.post('/toss/cancel', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
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

    res.json(result);
  } catch (error: any) {
    logger.error('Payment cancellation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || '결제 취소 실패'
    });
  }
});

/**
 * 결제 조회
 * GET /api/v1/payments/toss/:paymentKey
 */
router.get('/toss/:paymentKey', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { paymentKey } = req.params;

    const result = await tossPaymentsService.getPayment(paymentKey);

    res.json(result);
  } catch (error: any) {
    logger.error('Payment query failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || '결제 조회 실패'
    });
  }
});

/**
 * 결제 설정 조회
 * GET /api/v1/payments/toss/config
 */
router.get('/toss/config', async (req: Request, res: Response) => {
  try {
    // Return configuration status
    res.json({
      success: true,
      data: {
        isConfigured: !!process.env.TOSS_CLIENT_KEY,
        clientKey: process.env.TOSS_CLIENT_KEY || null,
        mode: process.env.TOSS_MODE || 'test',
        webhookUrl: process.env.TOSS_WEBHOOK_URL || null
      }
    });
  } catch (error: any) {
    logger.error('Failed to get payment config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment configuration'
    });
  }
});

/**
 * 결제 통계 조회
 * GET /api/v1/payments/toss/stats
 */
router.get('/toss/stats', async (req: Request, res: Response) => {
  try {
    // TODO: Implement actual stats from database
    res.json({
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
  } catch (error: any) {
    logger.error('Failed to get payment stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment statistics'
    });
  }
});

/**
 * 테스트 결제 내역 조회
 * GET /api/v1/payments/toss/tests
 */
router.get('/toss/tests', async (req: Request, res: Response) => {
  try {
    // TODO: Implement test payments history
    res.json({
      success: true,
      data: [],
      total: 0
    });
  } catch (error: any) {
    logger.error('Failed to get test payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get test payments'
    });
  }
});

/**
 * 환불 목록 조회
 * GET /api/v1/payments/refunds
 */
router.get('/refunds', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    // TODO: Implement refunds list from database
    res.json({
      success: true,
      data: [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: 0,
        totalPages: 0
      }
    });
  } catch (error: any) {
    logger.error('Failed to get refunds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get refunds list'
    });
  }
});

/**
 * 환불 통계 조회
 * GET /api/v1/payments/refunds/stats
 */
router.get('/refunds/stats', async (req: Request, res: Response) => {
  try {
    // TODO: Implement refund stats from database
    res.json({
      success: true,
      data: {
        totalRefunds: 0,
        totalRefundAmount: 0,
        pendingRefunds: 0,
        completedRefunds: 0,
        rejectedRefunds: 0
      }
    });
  } catch (error: any) {
    logger.error('Failed to get refund stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get refund statistics'
    });
  }
});

/**
 * 토스페이먼츠 웹훅
 * POST /api/v1/payments/toss/webhook
 */
router.post('/toss/webhook', async (req: Request, res: Response) => {
  try {
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
    res.status(200).json({ success: true });
  } catch (error: any) {
    logger.error('Webhook processing failed:', error);
    
    // 웹훅 처리 실패 시에도 200 반환 (재시도 방지)
    // 에러는 로깅하고 별도로 처리
    res.status(200).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * 결제 성공 콜백 페이지
 * GET /api/v1/payments/toss/success
 */
router.get('/toss/success', async (req: Request, res: Response) => {
  try {
    const { paymentKey, orderId, amount } = req.query;

    // 결제 승인 처리
    const result = await tossPaymentsService.confirmPayment({
      paymentKey: paymentKey as string,
      orderId: orderId as string,
      amount: Number(amount)
    });

    // 프론트엔드 성공 페이지로 리다이렉트
    res.redirect(`${process.env.FRONTEND_URL}/payment/complete?orderId=${orderId}`);
  } catch (error: any) {
    logger.error('Payment success callback failed:', error);
    
    // 실패 페이지로 리다이렉트
    res.redirect(`${process.env.FRONTEND_URL}/payment/fail?error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * 결제 실패 콜백 페이지
 * GET /api/v1/payments/toss/fail
 */
router.get('/toss/fail', async (req: Request, res: Response) => {
  const { code, message, orderId } = req.query;
  
  logger.info('Payment failed callback:', { code, message, orderId });
  
  // 프론트엔드 실패 페이지로 리다이렉트
  res.redirect(`${process.env.FRONTEND_URL}/payment/fail?code=${code}&message=${encodeURIComponent(message as string)}`);
});

/**
 * 정산 조회 (관리자용)
 * GET /api/v1/payments/toss/settlements
 */
router.get('/toss/settlements', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
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
    
    res.json(result);
  } catch (error: any) {
    logger.error('Settlement query failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || '정산 조회 실패'
    });
  }
});

export default router;