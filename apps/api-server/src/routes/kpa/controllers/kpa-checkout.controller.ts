/**
 * KPA Checkout Controller — 매장 경영자의 **구매/발주(B2B)** 주문 조회·취소
 *
 * WO-O4O-STORE-AND-PLATFORM-CONSUMER-COMMERCE-LEGACY-RETIREMENT-V1:
 *   `WO-O4O-KPA-CUSTOMER-COMMERCE-LOOP-V1` 이 만든 **소비자→매장 판매 loop** 를 제거했다.
 *     · `POST /checkout`                        → 410 (주문 생성 producer)
 *     · `GET|PATCH /checkout/store-orders*`      → 제거 (매장이 판매자인 관점)
 *   근거: `O4O-STORE-COMMERCE-BOUNDARY-V1` §2-1 · §3 · §7 · §10.
 *
 * ## 현재 범위 (전부 buyerId 기준 — 매장이 구매자)
 * - `GET  /checkout/orders`              내 구매/발주 목록
 * - `GET  /checkout/orders/:orderId`     상세
 * - `POST /checkout/orders/:orderId/cancel`  결제 전 취소
 *
 * 조회 범위 = retail 축 키 + event-offer(OPL) 키 (`getBuyerOrderServiceKeys`).
 * retail 축 키는 **과거 주문의 역사 데이터 조회**를 위해 남긴다 — 신규 생성 경로는 없다.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import type { AuthRequest } from '../../../types/auth.js';
import logger from '../../../utils/logger.js';
// WO-O4O-CROSSSERVICE-B2B-BUYER-ORDER-READ-CONTRACT-AND-COMMONIZATION-V1 (DF-1 · DF-4):
//   buyer 주문 조회 의미·ownership·serviceKey 격리는 공통 Core 가 소유한다.
//   이 controller 는 경로 · 서비스 scope · KPA 표기 adaptation 만 담당하는 wrapper 다.
import {
  listBuyerOrders,
  getBuyerOrderDetail,
  isBuyerOrderReadFailure,
} from '../../../services/checkout/buyer-order-read.service.js';
// WO-O4O-STORE-HUB-EVENT-OFFER-ORDER-VISIBILITY-AND-CANCELLATION-V1:
//   이벤트 오퍼 주문(metadata.serviceKey='kpa-groupbuy')이 구매자 주문 목록/상세에서 누락되던 결함.
//   기록(쓰기)은 그대로 두고 조회 범위만 canonical 집합으로 넓힌다.
import { getBuyerOrderServiceKeys } from '../../../constants/buyer-order-service-scope.js';
import {
  cancelStoreOrderBeforePayment,
  isCancelStoreOrderFailure,
} from '../../../services/checkout/store-order-cancel.service.js';
import { SERVICE_KEYS } from '../../../constants/service-keys.js';
import { requireActiveServiceMembership } from '../../../middleware/service-membership.middleware.js';

/** 'kpa-society' + 레거시 'kpa' + 이벤트 오퍼 'kpa-groupbuy' */
const KPA_BUYER_ORDER_SERVICE_KEYS = getBuyerOrderServiceKeys(SERVICE_KEYS.KPA_SOCIETY);

// ============================================================================
// Type Definitions
// ============================================================================

interface KpaOrderMetadata {
  serviceKey: 'kpa-society' | 'kpa';
  organizationId: string;
  organizationName?: string;
  channelType: string;
  channelId: string;
  deliveryMethod?: 'pickup' | 'delivery';
  referral?: {
    referrerId: string;
    referrerType: string;
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

export function createKpaCheckoutController(
  dataSource: DataSource,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void
): Router {
  const router = Router();

  /**
   * POST /checkout — 은퇴 (410)
   *
   * WO-O4O-STORE-AND-PLATFORM-CONSUMER-COMMERCE-LEGACY-RETIREMENT-V1
   *
   *   `WO-O4O-KPA-CUSTOMER-COMMERCE-LOOP-V1` 이 만든 소비자→매장 주문 생성 경로.
   *   `organization_channels.channel_type='B2C'` 승인을 게이트로 쓰는 O4O 자체 소비자 commerce 이며
   *   `O4O-STORE-COMMERCE-BOUNDARY-V1` §2-1 · §2-2 · §3 위반이다.
   *
   *   KPA 자체 storefront 는 `WO-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-V1` 로 이미 은퇴했고
   *   결제 leg 은 410 `STORE_SALE_PAYMENT_DEPRECATED` 로 차단돼 있었다. 본 WO 가 주문 생성
   *   producer 를 닫아 loop 를 완결한다.
   *
   *   보존: `GET /checkout/orders*` — 매장 경영자의 **구매/발주(B2B)** 내역 축.
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
   * Get current user's KPA orders
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

        const { orders, pagination } = await listBuyerOrders(dataSource, {
          buyerId,
          serviceKeys: KPA_BUYER_ORDER_SERVICE_KEYS,
          page: req.query.page as string | undefined,
          limit: req.query.limit as string | undefined,
        });

        res.json({
          success: true,
          // wrapper 책임 = KPA 표기(조직)만. 조회 의미·ownership·serviceKey 격리는 Core 소유.
          data: orders.map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            totalAmount: order.totalAmount,
            organization: {
              id: (order.metadata as KpaOrderMetadata)?.organizationId,
              name: (order.metadata as KpaOrderMetadata)?.organizationName,
            },
            itemCount: order.itemCount,
            createdAt: order.createdAt,
          })),
          pagination,
        });
      } catch (error: unknown) {
        const err = error as Error;
        logger.error('[KPA Checkout] List orders error:', err);
        errorResponse(res, 500, 'ORDER_LIST_ERROR', 'Failed to list orders');
      }
    }
  );

  /**
   * GET /checkout/orders/:orderId
   * Get single order by ID
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

        const result = await getBuyerOrderDetail(dataSource, {
          orderId: String(orderId ?? ''),
          buyerId,
          serviceKeys: KPA_BUYER_ORDER_SERVICE_KEYS,
        });

        if (isBuyerOrderReadFailure(result)) {
          return errorResponse(res, result.httpStatus, result.code, result.message);
        }

        const order = result.order;
        const metadata = order.metadata as KpaOrderMetadata;

        res.json({
          success: true,
          data: {
            id: order.id,
            orderNumber: order.orderNumber,
            orderType: 'retail',
            status: order.status,
            paymentStatus: order.paymentStatus,
            subtotal: order.subtotal,
            shippingFee: order.shippingFee,
            discount: order.discount,
            totalAmount: order.totalAmount,
            currency: 'KRW',
            organization: {
              id: metadata?.organizationId,
              name: metadata?.organizationName,
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
        logger.error('[KPA Checkout] Get order error:', err);
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
    // WO-O4O-B2B-REMAINING-DEBT-FINAL-CLOSURE-V1 §13:
    //   취소는 canonical `checkout_orders` 상태를 바꾸는 write 다(이벤트오퍼는 재고 복원까지).
    //   cart write · 두 confirm 경로와 동일하게 active membership 을 요구한다 —
    //   정지(suspended)/탈퇴 회원이 주문 원장을 바꾸지 못한다. 조회 경로에는 붙이지 않는다.
    requireActiveServiceMembership(dataSource, SERVICE_KEYS.KPA_SOCIETY),
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
          serviceKeys: KPA_BUYER_ORDER_SERVICE_KEYS,
          reason: typeof req.body?.reason === 'string' ? req.body.reason : undefined,
        });

        // strictNullChecks:false 환경이라 자동 narrowing 이 없다 → 명시적 predicate 사용.
        if (isCancelStoreOrderFailure(result)) {
          return errorResponse(res, result.httpStatus, result.code, result.message, result.details);
        }
        res.json({ success: true, data: result });
      } catch (error: unknown) {
        const err = error as Error;
        logger.error('[KPA Checkout] Cancel order error:', err);
        errorResponse(res, 500, 'ORDER_CANCEL_ERROR', 'Failed to cancel order');
      }
    }
  );

  // ==========================================================================
  // Store Owner "판매자 관점" 엔드포인트 — 제거됨
  //
  // WO-O4O-STORE-AND-PLATFORM-CONSUMER-COMMERCE-LEGACY-RETIREMENT-V1
  //
  //   제거 대상 4개 (모두 `sellerOrganizationId` 기준 = 매장이 판매자):
  //     GET   /checkout/store-orders
  //     GET   /checkout/store-orders/kpi
  //     GET   /checkout/store-orders/:orderId
  //     PATCH /checkout/store-orders/:orderId/status   ← 매장 경영자의 소비자 주문 취소·환불
  //
  //   `O4O-STORE-COMMERCE-BOUNDARY-V1` §2-1 (매장 경영자는 소비자에게 판매하지 않는다) ·
  //   §7 (매장 환불) · §10 (개발 금지선). 매장 경영자에게 소비자 판매 주문 관리·환불 화면을
  //   제공하는 것 자체가 경계 위반이므로 조회 경로까지 함께 제거한다.
  //
  //   보존: 매장이 **구매자**인 축 — `GET /checkout/orders`, `/orders/:orderId`,
  //         `POST /orders/:orderId/cancel` (buyerId 기준, B2B 발주).
  // ==========================================================================

  return router;
}
