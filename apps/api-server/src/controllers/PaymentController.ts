import { Request, Response, NextFunction } from 'express';
import paymentService, {
  PreparePaymentRequest,
  ConfirmPaymentRequest,
  CancelPaymentRequest
} from '../services/PaymentService.js';
import { WebhookEventType } from '../entities/PaymentWebhook.js';
import logger from '../utils/logger.js';
import { TossPaymentService, TossConfirmRequest } from '../services/TossPaymentService.js';

export class PaymentController {
  private tossPaymentService = new TossPaymentService();

  /**
   * POST /api/v1/payments/prepare
   * 결제 준비 - 결제 위젯으로 전달할 정보 생성
   */
  preparePayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const request: PreparePaymentRequest = {
        orderId: req.body.orderId,
        amount: req.body.amount,
        orderName: req.body.orderName,
        customerEmail: req.body.customerEmail || req.user?.email,
        customerName: req.body.customerName || req.user?.name,
        customerMobilePhone: req.body.customerMobilePhone,
        successUrl: req.body.successUrl,
        failUrl: req.body.failUrl
      };

      // 입력 검증
      if (!request.orderId || !request.amount || !request.orderName) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: orderId, amount, orderName'
        });
        return;
      }

      if (!request.successUrl || !request.failUrl) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: successUrl, failUrl'
        });
        return;
      }

      const payment = await paymentService.preparePayment(request);

      res.json({
        success: true,
        data: {
          paymentId: payment.id,
          orderId: payment.orderId,
          amount: payment.amount,
          orderName: payment.orderName,
          customerEmail: payment.customerEmail,
          customerName: payment.customerName
        }
      });

    } catch (error) {
      logger.error('Error preparing payment:', error);
      next(error);
    }
  };

  /**
   * POST /api/v1/payments/confirm
   * 결제 승인 - 토스페이먼츠에서 리다이렉트 후 호출
   */
  confirmPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const request: ConfirmPaymentRequest = {
        paymentKey: req.body.paymentKey,
        orderId: req.body.orderId,
        amount: req.body.amount
      };

      // 입력 검증
      if (!request.paymentKey || !request.orderId || !request.amount) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: paymentKey, orderId, amount'
        });
        return;
      }

      const payment = await paymentService.confirmPayment(request);

      res.json({
        success: true,
        data: {
          paymentId: payment.id,
          orderId: payment.orderId,
          paymentKey: payment.paymentKey,
          status: payment.status,
          amount: payment.amount,
          approvedAt: payment.approvedAt
        }
      });

    } catch (error) {
      logger.error('Error confirming payment:', error);

      // 토스페이먼츠 API 에러 처리
      if (error.response?.data) {
        res.status(error.response.status || 400).json({
          success: false,
          message: error.response.data.message || 'Payment confirmation failed',
          code: error.response.data.code
        });
        return;
      }

      next(error);
    }
  };

  /**
   * POST /api/v1/payments/toss/confirm
   * Phase PG-1: Toss Payments 결제 승인 (Order-centric, simplified)
   *
   * 프론트엔드에서 Toss 결제 성공 콜백 후 호출
   * Order 엔티티에 직접 결제 정보를 저장하는 간소화된 방식
   */
  confirmTossPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const request: TossConfirmRequest = {
        paymentKey: req.body.paymentKey,
        orderId: req.body.orderId,
        amount: req.body.amount
      };

      // 입력 검증
      if (!request.paymentKey || !request.orderId || !request.amount) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: paymentKey, orderId, amount'
        });
        return;
      }

      const order = await this.tossPaymentService.confirmPayment(request);

      res.json({
        success: true,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentKey: order.paymentKey,
          paymentStatus: order.paymentStatus,
          orderStatus: order.status,
          amount: order.calculateTotal(),
          paidAt: order.paidAt
        }
      });

    } catch (error: any) {
      logger.error('Error confirming Toss payment:', error);

      res.status(400).json({
        success: false,
        message: error.message || 'Payment confirmation failed'
      });
    }
  };

  /**
   * POST /api/v1/payments/toss/fail
   * Phase PG-1: Toss Payments 결제 실패 처리
   *
   * 프론트엔드에서 Toss 결제 실패 콜백 후 호출
   */
  failTossPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { orderNumber, errorCode, errorMessage } = req.body;

      if (!orderNumber) {
        res.status(400).json({
          success: false,
          message: 'Missing required field: orderNumber'
        });
        return;
      }

      const reason = errorMessage || errorCode || 'Payment failed';
      const order = await this.tossPaymentService.failPayment(orderNumber, reason);

      res.json({
        success: true,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          message: 'Payment marked as failed'
        }
      });

    } catch (error: any) {
      logger.error('Error handling Toss payment failure:', error);

      res.status(400).json({
        success: false,
        message: error.message || 'Failed to process payment failure'
      });
    }
  };

  /**
   * POST /api/v1/payments/:paymentKey/cancel
   * 결제 취소/환불
   */
  cancelPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { paymentKey } = req.params;
      const request: CancelPaymentRequest = {
        paymentKey,
        cancelReason: req.body.cancelReason,
        cancelAmount: req.body.cancelAmount
      };

      // 입력 검증
      if (!request.cancelReason) {
        res.status(400).json({
          success: false,
          message: 'Missing required field: cancelReason'
        });
        return;
      }

      const payment = await paymentService.cancelPayment(request);

      res.json({
        success: true,
        data: {
          paymentId: payment.id,
          paymentKey: payment.paymentKey,
          status: payment.status,
          cancelAmount: payment.cancelAmount,
          balanceAmount: payment.balanceAmount
        }
      });

    } catch (error) {
      logger.error('Error canceling payment:', error);

      // 토스페이먼츠 API 에러 처리
      if (error.response?.data) {
        res.status(error.response.status || 400).json({
          success: false,
          message: error.response.data.message || 'Payment cancellation failed',
          code: error.response.data.code
        });
        return;
      }

      next(error);
    }
  };

  /**
   * POST /api/v1/payments/webhook
   * 토스페이먼츠 웹훅 수신
   */
  handleWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const eventType = this.mapWebhookEventType(req.body.eventType);
      const payload = req.body;
      const headers = req.headers;

      // rawBody는 express.json()의 verify 옵션으로 저장됨
      const rawBody = (req as any).rawBody;

      const webhook = await paymentService.handleWebhook(eventType, payload, headers, rawBody);

      // 웹훅은 항상 200 응답 (토스페이먼츠 요구사항)
      res.status(200).json({
        success: true,
        webhookId: webhook.id,
        verified: webhook.signatureVerified
      });

    } catch (error) {
      logger.error('Error handling webhook:', error);

      // 웹훅은 에러가 발생해도 200 응답
      res.status(200).json({
        success: false,
        message: 'Webhook received but processing failed'
      });
    }
  };

  /**
   * GET /api/v1/payments/:id
   * 결제 정보 조회
   */
  getPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const payment = await paymentService.getPayment(id);

      if (!payment) {
        res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
        return;
      }

      // 권한 확인 (본인 결제만 조회 가능, 관리자는 모두 조회 가능)
      if (req.user?.role !== 'admin') {
        // TODO: payment의 주문의 구매자 확인
      }

      res.json({
        success: true,
        data: payment
      });

    } catch (error) {
      logger.error('Error getting payment:', error);
      next(error);
    }
  };

  /**
   * GET /api/v1/payments/order/:orderId
   * 주문의 결제 정보 조회
   */
  getPaymentByOrderId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { orderId } = req.params;
      const payment = await paymentService.getPaymentByOrderId(orderId);

      if (!payment) {
        res.status(404).json({
          success: false,
          message: 'Payment not found for this order'
        });
        return;
      }

      res.json({
        success: true,
        data: payment
      });

    } catch (error) {
      logger.error('Error getting payment by order ID:', error);
      next(error);
    }
  };

  /**
   * 웹훅 이벤트 타입 매핑
   */
  private mapWebhookEventType(eventType: string): WebhookEventType {
    const eventTypeMap: Record<string, WebhookEventType> = {
      'PAYMENT_CONFIRMED': WebhookEventType.PAYMENT_CONFIRMED,
      'PAYMENT_CANCELLED': WebhookEventType.PAYMENT_CANCELLED,
      'PAYMENT_FAILED': WebhookEventType.PAYMENT_FAILED,
      'VIRTUAL_ACCOUNT_ISSUED': WebhookEventType.VIRTUAL_ACCOUNT_ISSUED,
      'VIRTUAL_ACCOUNT_DEPOSIT': WebhookEventType.VIRTUAL_ACCOUNT_DEPOSIT,
      'REFUND_COMPLETED': WebhookEventType.REFUND_COMPLETED
    };

    return eventTypeMap[eventType] || WebhookEventType.UNKNOWN;
  }
}

export default new PaymentController();
