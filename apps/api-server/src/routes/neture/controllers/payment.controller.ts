/**
 * Neture Payment Controller
 *
 * Phase G-3: 주문/결제 플로우 구현
 * 토스페이먼츠 결제 연동
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import axios from 'axios';
import { NetureService } from '../services/neture.service.js';
import { NeturePaymentMethod } from '../entities/neture-order.entity.js';
import { ErrorResponseDto, OrderPaymentRequestDto } from '../dto/index.js';
import type { AuthRequest } from '../../../types/auth.js';

/**
 * Error response helper
 */
function errorResponse(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, any>
): Response {
  const response: ErrorResponseDto = {
    error: { code, message, details },
  };
  return res.status(statusCode).json(response);
}

/**
 * Validation error helper
 */
function handleValidationErrors(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errorResponse(res, 400, 'VALIDATION_ERROR', 'Validation failed', {
      fields: errors.mapped(),
    });
    return true;
  }
  return false;
}

// 토스페이먼츠 API 설정
const TOSS_PAYMENTS_SECRET_KEY = process.env.TOSS_PAYMENTS_SECRET_KEY || 'test_sk_test_key';
const TOSS_PAYMENTS_API_URL = 'https://api.tosspayments.com/v1/payments';

/**
 * Create Payment router
 */
export function createPaymentController(
  dataSource: DataSource,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void
): Router {
  const router = Router();
  const service = new NetureService(dataSource);

  /**
   * POST /neture/payments/confirm
   * 결제 승인 (토스페이먼츠 결제 승인 후 호출)
   */
  router.post(
    '/confirm',
    requireAuth,
    [
      body('payment_key').notEmpty().isString(),
      body('order_id').notEmpty().isUUID(),
      body('amount').isInt({ min: 1 }),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;

        if (!userId) {
          return errorResponse(res, 401, 'NETURE_401', 'Authentication required');
        }

        const { payment_key, order_id, amount } = req.body as OrderPaymentRequestDto;

        // 1. 주문 조회 및 소유권 확인
        const order = await service.getOrder(order_id, userId);
        if (!order) {
          return errorResponse(res, 404, 'NETURE_404', 'Order not found');
        }

        // 2. 금액 검증
        if (order.final_amount !== amount) {
          return errorResponse(res, 400, 'NETURE_400', 'Amount mismatch', {
            expected: order.final_amount,
            received: amount,
          });
        }

        // 3. 이미 결제된 주문인지 확인
        if (order.status !== 'created') {
          return errorResponse(res, 400, 'NETURE_400', 'Order is not in payable state', {
            current_status: order.status,
          });
        }

        // 4. 토스페이먼츠 결제 승인 API 호출
        try {
          const authHeader = Buffer.from(`${TOSS_PAYMENTS_SECRET_KEY}:`).toString('base64');

          const tossResponse = await axios.post(
            `${TOSS_PAYMENTS_API_URL}/confirm`,
            {
              paymentKey: payment_key,
              orderId: order.order_number,
              amount: amount,
            },
            {
              headers: {
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/json',
              },
            }
          );

          // 5. 결제 성공 시 주문 상태 업데이트
          const paymentMethod = mapTossPaymentMethod(tossResponse.data.method);
          const updatedOrder = await service.confirmPayment(
            order_id,
            payment_key,
            paymentMethod
          );

          res.json({
            data: {
              order: updatedOrder,
              payment: {
                payment_key,
                method: paymentMethod,
                approved_at: tossResponse.data.approvedAt,
                receipt_url: tossResponse.data.receipt?.url,
              },
            },
          });
        } catch (tossError: any) {
          console.error('[Neture] Toss Payments error:', tossError.response?.data || tossError.message);

          const tossErrorData = tossError.response?.data;
          return errorResponse(res, 400, 'PAYMENT_FAILED', 'Payment confirmation failed', {
            toss_code: tossErrorData?.code,
            toss_message: tossErrorData?.message,
          });
        }
      } catch (error: any) {
        console.error('[Neture] Payment confirm error:', error);
        errorResponse(res, 500, 'NETURE_500', 'Internal server error');
      }
    }
  );

  /**
   * GET /neture/payments/order/:orderId
   * 결제 정보 조회 (결제 페이지 렌더링용)
   */
  router.get(
    '/order/:orderId',
    requireAuth,
    [param('orderId').isUUID()],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const userId = authReq.user?.id;

        if (!userId) {
          return errorResponse(res, 401, 'NETURE_401', 'Authentication required');
        }

        const order = await service.getOrder(req.params.orderId, userId);
        if (!order) {
          return errorResponse(res, 404, 'NETURE_404', 'Order not found');
        }

        // 결제 가능한 상태인지 확인
        if (order.status !== 'created') {
          return errorResponse(res, 400, 'NETURE_400', 'Order is not payable', {
            current_status: order.status,
          });
        }

        // 토스페이먼츠 결제 위젯용 정보 반환
        res.json({
          data: {
            order_id: order.id,
            order_number: order.order_number,
            order_name: generateOrderName(order),
            amount: order.final_amount,
            customer_name: order.orderer_name,
            customer_email: order.orderer_email,
            customer_mobile: order.orderer_phone,
            // 토스페이먼츠 클라이언트 키 (공개 키)
            client_key: process.env.TOSS_PAYMENTS_CLIENT_KEY || 'test_ck_test_key',
          },
        });
      } catch (error: any) {
        console.error('[Neture] Get payment info error:', error);
        errorResponse(res, 500, 'NETURE_500', 'Internal server error');
      }
    }
  );

  return router;
}

/**
 * 토스페이먼츠 결제수단을 내부 enum으로 매핑
 */
function mapTossPaymentMethod(method: string): NeturePaymentMethod {
  const methodMap: Record<string, NeturePaymentMethod> = {
    '카드': NeturePaymentMethod.CARD,
    'CARD': NeturePaymentMethod.CARD,
    '가상계좌': NeturePaymentMethod.VIRTUAL_ACCOUNT,
    'VIRTUAL_ACCOUNT': NeturePaymentMethod.VIRTUAL_ACCOUNT,
    '계좌이체': NeturePaymentMethod.BANK_TRANSFER,
    'TRANSFER': NeturePaymentMethod.BANK_TRANSFER,
    '휴대폰': NeturePaymentMethod.MOBILE,
    'MOBILE_PHONE': NeturePaymentMethod.MOBILE,
  };

  return methodMap[method] || NeturePaymentMethod.CARD;
}

/**
 * 주문명 생성 (토스페이먼츠 표시용)
 */
function generateOrderName(order: any): string {
  if (!order.items || order.items.length === 0) {
    return '주문 상품';
  }

  const firstItem = order.items[0];
  if (order.items.length === 1) {
    return firstItem.product_name;
  }

  return `${firstItem.product_name} 외 ${order.items.length - 1}건`;
}
