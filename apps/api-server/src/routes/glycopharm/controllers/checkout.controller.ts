/**
 * GlycoPharm Checkout Controller
 *
 * WO-ORDER-TYPE-NORMALIZATION-V1
 *
 * ## 설계 원칙
 * - OrderType = RETAIL (거래 모델 구분자) + metadata.serviceKey = 'glycopharm'
 * - Core 위임 패턴: EcommerceOrderService.create() 동일 로직
 * - 채널 승인 검증 필수 (organization_channels)
 * - 상품-채널 매핑 검증 (organization_product_channels)
 * - sales_limit 검증
 * - Order.channel = null 유지, 채널 구분은 metadata.channelType
 *
 * ## 기존 주문 호환
 * - GET 엔드포인트: GLYCOPHARM(레거시) + RETAIL+serviceKey(신규) 모두 조회
 */

import { Router, Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import type { AuthRequest } from '../../../types/auth.js';
import logger from '../../../utils/logger.js';
import { SERVICE_KEYS } from '../../../constants/service-keys.js';
// WO-O4O-STORE-HUB-EVENT-OFFER-ORDER-VISIBILITY-AND-CANCELLATION-V1:
//   이벤트 오퍼 주문(metadata.serviceKey='glycopharm-event-offer')이 구매자 주문 목록/상세에서
//   누락되던 결함. 기록(쓰기)은 그대로 두고 조회 범위만 canonical 집합으로 넓힌다.
import { getBuyerOrderServiceKeys } from '../../../constants/buyer-order-service-scope.js';
import {
  cancelStoreOrderBeforePayment,
  isCancelStoreOrderFailure,
} from '../../../services/checkout/store-order-cancel.service.js';
// WO-O4O-SERVICE-ORDER-FULL-CHECKOUT-ALIGN-V1: 프로덕션 canonical 주문 원장 = checkout_orders
// (ecommerce_orders 미존재 — IR-O4O-ORDER-CANONICAL-TABLE-CONFIRM-V1 / CHECK-...-DIAGNOSTIC-RESULT-V1 H1 확정).
// create/list/get 를 CheckoutOrder 기준으로 정렬. payment controller/handler 도 동일 원장 사용.
import { CheckoutOrder } from '../../../entities/checkout/CheckoutOrder.entity.js';

/** 'glycopharm' + 이벤트 오퍼 'glycopharm-event-offer' */
const GP_BUYER_ORDER_SERVICE_KEYS = getBuyerOrderServiceKeys(SERVICE_KEYS.GLYCOPHARM);

// ============================================================================
// Type Definitions
// ============================================================================

interface GlycopharmOrderMetadata {
  serviceKey: 'glycopharm';
  pharmacyId: string;
  pharmacyName?: string;
  pharmacyCode?: string;
  channelType: string;
  channelId: string;
  deliveryMethod?: 'pickup' | 'delivery';
  prescriptionInfo?: {
    required: boolean;
    verified?: boolean;
    referenceId?: string;
  };
}

// ============================================================================
// Constants & Helpers
// ============================================================================

function errorResponse(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
): Response {
  return res.status(statusCode).json({
    error: { code, message, details },
  });
}

// ============================================================================
// Controller Implementation
// ============================================================================

export function createCheckoutController(
  dataSource: DataSource,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
  // WO-O4O-CHECKOUT-REFUND-AUTHORIZATION-CANONICAL-ROLE-CONTRACT-V1:
  //   운영 성격 write 경로(`/cleanup-expired`)를 위한 GlycoPharm operator scope guard.
  //   `requireGlycopharmScope('glycopharm:operator')` 를 주입한다 —
  //   active glycopharm membership + glycopharm:operator role 을 함께 요구한다.
  //   미주입 시 fail-closed (아래 requireGlycopharmOperator 참조).
  requireOperatorScope?: (req: Request, res: Response, next: NextFunction) => void,
): Router {
  const router = Router();

  // fail-closed 기본값 — guard 를 주입하지 않은 호출부에서 운영 write 가 열리지 않게 한다.
  const requireGlycopharmOperator =
    requireOperatorScope ??
    ((_req: Request, res: Response, _next: NextFunction) => {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: 'OPERATOR_SCOPE_REQUIRED',
      });
    });

  /**
   * POST /checkout — 은퇴 (410)
   *
   * WO-O4O-STORE-AND-PLATFORM-CONSUMER-COMMERCE-LEGACY-RETIREMENT-V1
   *
   *   소비자→매장 주문 생성 경로. `organization_channels.channel_type = 'B2C'`(약국 조직)
   *   승인 여부를 게이트로 쓰던, **매장이 판매자가 되는 O4O 자체 소비자 commerce** 였다.
   *   `O4O-STORE-COMMERCE-BOUNDARY-V1` §2-1 · §2-2 · §3 — O4O 에서 매장 경영자는
   *   소비자에게 판매하지 않으며, 실제 판매·결제는 외부 POS 또는 외부 판매채널이 담당한다.
   *
   *   결제 leg 은 이미 `WO-O4O-STORE-SALE-CHECKOUT-ROUTE-DEPRECATION-V1` 이
   *   410 `STORE_SALE_PAYMENT_DEPRECATED` 로 차단했다. 본 WO 는 그 앞단인
   *   **주문 생성 producer 자체를 제거**해 loop 를 닫는다.
   *
   *   조회 경로(`GET /checkout/orders*`)는 매장 경영자의 **구매/발주(B2B)** 내역이므로 보존한다.
   */
  router.post('/', (_req: Request, res: Response) => {
    return res.status(410).json({
      success: false,
      code: 'STORE_CONSUMER_ORDER_RETIRED',
      message:
        '매장 소비자 주문은 O4O에서 제공하지 않습니다. 현장 판매는 매장의 POS, 온라인 판매는 외부 판매채널을 이용해 주세요.',
    });
  });

  /**
   * GET /checkout/orders
   * Get current user's GlycoPharm orders
   *
   * 호환성: GLYCOPHARM(레거시) + RETAIL+serviceKey='glycopharm'(신규) 모두 조회
   */
  router.get(
    '/orders',
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const authReq = req as AuthRequest;
        const buyerId = authReq.user?.id || authReq.authUser?.id;

        if (!buyerId) {
          return errorResponse(res, 401, 'UNAUTHORIZED', 'User not authenticated');
        }

        const page = Number(req.query.page) || 1;
        const limit = Math.min(Number(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;

        // WO-O4O-SERVICE-ORDER-FULL-CHECKOUT-ALIGN-V1: checkout_orders + metadata.serviceKey 기준.
        // legacy OrderType.GLYCOPHARM 분기 제거 — ecommerce_orders 미존재(H1)이므로 해당 row 없음.
        const orderRepo = dataSource.getRepository(CheckoutOrder);
        // WO-O4O-STORE-HUB-PRODUCTION-E2E-DATA-ENROLLMENT-AND-CLOSURE-V1:
        //   alias 'order' 는 SQL 예약어라 생성 쿼리가 `syntax error at or near "order"` 로 실패했다
        //   (프로덕션 500 / ORDER_LIST_ERROR). KPA·Cosmetics 와 동일하게 'co' 를 쓴다.
        const [orders, total] = await orderRepo
          .createQueryBuilder('co')
          .where('co.buyerId = :buyerId', { buyerId })
          .andWhere("co.metadata->>'serviceKey' IN (:...serviceKeys)", { serviceKeys: GP_BUYER_ORDER_SERVICE_KEYS })
          .orderBy('co.createdAt', 'DESC')
          .take(limit)
          .skip(offset)
          .getManyAndCount();

        res.json({
          success: true,
          data: orders.map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            totalAmount: order.totalAmount,
            pharmacy: {
              id: (order.metadata as GlycopharmOrderMetadata)?.pharmacyId,
              name: (order.metadata as GlycopharmOrderMetadata)?.pharmacyName,
            },
            itemCount: (order.items as unknown[])?.length || 0,
            createdAt: order.createdAt,
          })),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        });
      } catch (error: unknown) {
        const err = error as Error;
        logger.error('[GlycoPharm Checkout] List orders error:', err);
        errorResponse(res, 500, 'ORDER_LIST_ERROR', 'Failed to list orders');
      }
    }
  );

  /**
   * GET /checkout/orders/:orderId
   * Get single order by ID
   *
   * 호환성: GLYCOPHARM(레거시) + RETAIL+serviceKey(신규) 모두 허용
   */
  router.get(
    '/orders/:orderId',
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const authReq = req as AuthRequest;
        const buyerId = authReq.user?.id || authReq.authUser?.id;
        const { orderId } = req.params;

        if (!buyerId) {
          return errorResponse(res, 401, 'UNAUTHORIZED', 'User not authenticated');
        }

        // WO-O4O-SERVICE-ORDER-FULL-CHECKOUT-ALIGN-V1: checkout_orders + metadata.serviceKey 기준.
        const orderRepoForGet = dataSource.getRepository(CheckoutOrder);
        // alias 'order' = SQL 예약어 (위 목록 조회와 동일 사유)
        const order = await orderRepoForGet
          .createQueryBuilder('co')
          .where('co.id = :orderId', { orderId })
          .andWhere('co.buyerId = :buyerId', { buyerId })
          .andWhere("co.metadata->>'serviceKey' IN (:...serviceKeys)", { serviceKeys: GP_BUYER_ORDER_SERVICE_KEYS })
          .getOne();

        if (!order) {
          return errorResponse(res, 404, 'ORDER_NOT_FOUND', 'Order not found');
        }

        const metadata = order.metadata as GlycopharmOrderMetadata;

        res.json({
          success: true,
          data: {
            id: order.id,
            orderNumber: order.orderNumber,
            orderType: 'RETAIL',
            status: order.status,
            paymentStatus: order.paymentStatus,
            subtotal: order.subtotal,
            shippingFee: order.shippingFee,
            discount: order.discount,
            totalAmount: order.totalAmount,
            currency: 'KRW',
            pharmacy: {
              id: metadata?.pharmacyId,
              name: metadata?.pharmacyName,
              code: metadata?.pharmacyCode,
            },
            deliveryMethod: metadata?.deliveryMethod,
            shippingAddress: order.shippingAddress,
            items: order.items?.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
            paidAt: order.paidAt,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
          },
        });
      } catch (error: unknown) {
        const err = error as Error;
        logger.error('[GlycoPharm Checkout] Get order error:', err);
        errorResponse(res, 500, 'ORDER_GET_ERROR', 'Failed to get order');
      }
    }
  );

  /**
   * POST /checkout/orders/:orderId/cancel
   * 결제 전 구매자 주문 취소
   *
   * WO-O4O-STORE-HUB-EVENT-OFFER-ORDER-VISIBILITY-AND-CANCELLATION-V1:
   *   이벤트 오퍼 주문에 매장측 취소 경로가 없어 생성 후 되돌릴 수 없었다.
   *   Pharmacy-Hub `cancelBeforePayment` 와 동일 계약이며,
   *   이벤트 오퍼 주문이면 예약 차감된 재고를 canonical 보상 경로로 복원한다.
   */
  router.post(
    '/orders/:orderId/cancel',
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const authReq = req as AuthRequest;
        const buyerId = authReq.user?.id || authReq.authUser?.id;
        if (!buyerId) {
          return errorResponse(res, 401, 'UNAUTHORIZED', 'User not authenticated');
        }

        const result = await cancelStoreOrderBeforePayment(dataSource, {
          orderId: String(req.params.orderId ?? ''),
          buyerId,
          serviceKeys: GP_BUYER_ORDER_SERVICE_KEYS,
          reason: typeof req.body?.reason === 'string' ? req.body.reason : undefined,
        });

        // strictNullChecks:false 환경이라 자동 narrowing 이 없다 → 명시적 predicate 사용.
        if (isCancelStoreOrderFailure(result)) {
          return errorResponse(res, result.httpStatus, result.code, result.message, result.details);
        }
        res.json({ success: true, data: result });
      } catch (error: unknown) {
        const err = error as Error;
        logger.error('[GlycoPharm Checkout] Cancel order error:', err);
        errorResponse(res, 500, 'ORDER_CANCEL_ERROR', 'Failed to cancel order');
      }
    }
  );

  // ============================================================================
  // POST /checkout/cleanup-expired
  // WO-O4O-SALES-LIMIT-HARDENING-V1 Phase 3: CREATED 주문 TTL 정리
  //
  // 15분 이상 미결제 CREATED 주문을 자동 CANCELLED 처리.
  // Cron / admin 호출용. 인증 필수.
  // ============================================================================
  // WO-O4O-CHECKOUT-REFUND-AUTHORIZATION-CANONICAL-ROLE-CONTRACT-V1:
  //   종전에는 `requireAuth` 하나뿐이었다. **어느 서비스의 아무 로그인 사용자나**
  //   GlycoPharm 의 미결제 주문을 일괄 cancelled 로 바꾸고, 응답으로 타인 주문의
  //   orderNumber 목록까지 받아갈 수 있었다 (cross-service write + 정보 노출).
  //   운영 성격 write 이므로 canonical service operator 계약으로 좁힌다.
  router.post(
    '/cleanup-expired',
    requireAuth,
    requireGlycopharmOperator,
    async (_req: Request, res: Response) => {
      try {
        // WO-O4O-SERVICE-ORDER-FULL-CHECKOUT-ALIGN-V1: canonical checkout_orders 기준.
        const result = await dataSource.query(
          `UPDATE checkout_orders
           SET status = 'cancelled',
               "cancelledAt" = NOW(),
               "updatedAt" = NOW()
           WHERE status = 'created'
             AND metadata->>'serviceKey' = 'glycopharm'
             AND "createdAt" < NOW() - INTERVAL '15 minutes'
           RETURNING id, "orderNumber"`,
        );

        const cancelled = Array.isArray(result) ? result : [];

        logger.info('[GlycoPharm Checkout] Expired orders cleanup:', {
          cancelledCount: cancelled.length,
          orderIds: cancelled.map((r: { id: string }) => r.id),
        });

        res.json({
          success: true,
          data: {
            cancelledCount: cancelled.length,
            cancelledOrders: cancelled.map((r: { id: string; orderNumber: string }) => ({
              id: r.id,
              orderNumber: r.orderNumber,
            })),
          },
        });
      } catch (error: unknown) {
        const err = error as Error;
        logger.error('[GlycoPharm Checkout] Cleanup error:', err);
        errorResponse(res, 500, 'CLEANUP_ERROR', 'Failed to cleanup expired orders');
      }
    }
  );

  return router;
}
