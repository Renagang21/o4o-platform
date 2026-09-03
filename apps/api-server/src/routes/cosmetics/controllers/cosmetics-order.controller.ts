/**
 * Cosmetics Order Controller
 *
 * WO-O4O-COSMETICS-ORDER-LAYER-COMPLETION-V1
 *
 * EcommerceOrder 기반 실제 DB 연동 구현.
 * Stub(가짜 ID, 빈 배열, 강제 404) 제거 → 실제 저장·조회.
 *
 * ## 설계 원칙
 * - OrderType = RETAIL + metadata.serviceKey = 'cosmetics'
 * - 채널 분기 = order.channel + metadata.channel ('local' | 'travel')
 * - TaxRefund는 Order 단위, Amount 저장 금지 (H2-3)
 * - Travel 전용 필터: DB JSONB 쿼리
 * - 공급 계약 검증 필수 (checkout-guard)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { query, param, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
// WO-O4O-SERVICE-ORDER-FULL-CHECKOUT-ALIGN-V1: canonical checkout_orders 정렬 (ecommerce_orders 미존재 — H1).
// create 를 CheckoutOrder 기준으로 정렬. list/get 은 이미 checkout_orders raw SQL.
import type { AuthRequest } from '../../../types/auth.js';
import logger from '../../../utils/logger.js';
// WO-O4O-STORE-HUB-EVENT-OFFER-ORDER-VISIBILITY-AND-CANCELLATION-V1:
//   이벤트 오퍼 주문(metadata.serviceKey='k-cosmetics-event-offer')이 구매자 주문 목록/상세에서
//   누락되던 결함. 기록(쓰기)은 그대로 두고 조회 범위만 canonical 집합으로 넓힌다.
import { SERVICE_KEYS } from '../../../constants/service-keys.js';
import { requireActiveServiceMembership } from '../../../middleware/service-membership.middleware.js';
import { getBuyerOrderServiceKeys } from '../../../constants/buyer-order-service-scope.js';
import {
  cancelStoreOrderBeforePayment,
  isCancelStoreOrderFailure,
} from '../../../services/checkout/store-order-cancel.service.js';
// WO-O4O-CROSSSERVICE-B2B-BUYER-ORDER-READ-CONTRACT-AND-COMMONIZATION-V1 (DF-1 · DF-4):
//   buyer 주문 조회 의미·ownership·serviceKey 격리는 공통 Core 가 소유한다.
//   이 controller 는 경로 · 서비스 scope · K-Cosmetics 표기/필터 adaptation 만 담당하는 wrapper 다.
import {
  listBuyerOrders,
  getBuyerOrderDetail,
  isBuyerOrderReadFailure,
} from '../../../services/checkout/buyer-order-read.service.js';

/** 'cosmetics'(주문 metadata 축) + 이벤트 오퍼 'k-cosmetics-event-offer' */
const KCOS_BUYER_ORDER_SERVICE_KEYS = getBuyerOrderServiceKeys(SERVICE_KEYS.K_COSMETICS);

// ============================================================================
// Type Definitions
// ============================================================================

type OrderChannel = 'local' | 'travel';
type FulfillmentType = 'pickup' | 'delivery' | 'on-site';

/**
 * TaxRefund Metadata (H2-3 확정 스키마)
 *
 * 핵심 원칙:
 * - amount 필드 없음 (정산 시 계산)
 * - eligible은 필수
 * - 외부 연동은 reference만
 */
interface TaxRefundMeta {
  eligible: boolean;
  scheme?: 'standard' | 'instant';
  estimatedRate?: number;
  provider?: string;
  referenceId?: string;
  status?: 'pending' | 'requested' | 'completed' | 'rejected';
  requestedAt?: string;
  completedAt?: string;
}

interface TravelChannelMeta {
  guideId: string;
  guideName?: string;
  tourSessionId?: string;
  tourDate?: string;
  groupSize?: number;
  taxRefund?: TaxRefundMeta;
}

interface LocalChannelMeta {
  sampleExperienced?: boolean;
  reservationId?: string;
}

interface CommissionMeta {
  partnerId?: string;
  referralCode?: string;
  rate?: number;
}

interface CosmeticsOrderMetadata {
  channel: OrderChannel;
  fulfillment?: FulfillmentType;
  storeId?: string;
  storeName?: string;
  travel?: TravelChannelMeta;
  local?: LocalChannelMeta;
  commission?: CommissionMeta;
}

// ============================================================================
// Validation Errors
// ============================================================================

const VALIDATION_ERRORS = {
  CHANNEL_REQUIRED: 'metadata.channel is required',
  INVALID_CHANNEL: 'metadata.channel must be "local" or "travel"',
  TRAVEL_GUIDE_REQUIRED: 'metadata.travel.guideId is required for travel channel',
  LOCAL_HAS_TRAVEL_FIELDS: 'Local channel order cannot have travel-specific fields',
  TRAVEL_HAS_LOCAL_FIELDS: 'Travel channel order cannot have local-specific fields',
  ITEMS_REQUIRED: 'At least one order item is required',
  SELLER_ID_REQUIRED: 'sellerId is required',
  TAXREFUND_ELIGIBLE_REQUIRED: 'metadata.travel.taxRefund.eligible is required when taxRefund is provided',
  TAXREFUND_AMOUNT_FORBIDDEN: 'metadata.travel.taxRefund.amount is not allowed (H2-3: Rate-based only)',
  TAXREFUND_INVALID_SCHEME: 'metadata.travel.taxRefund.scheme must be "standard" or "instant"',
  TAXREFUND_INVALID_RATE: 'metadata.travel.taxRefund.estimatedRate must be between 0 and 1',
  TAXREFUND_INVALID_STATUS: 'metadata.travel.taxRefund.status must be one of: pending, requested, completed, rejected',
  INVALID_TAX_REFUND_STATUS_FILTER: 'taxRefundStatus must be one of: pending, requested, completed, rejected',
  INVALID_TAX_REFUND_ELIGIBLE_FILTER: 'taxRefundEligible must be "true" or "false"',
  PRODUCT_NOT_AVAILABLE: 'One or more products are not available or not listed',
} as const;

const VALID_TAX_REFUND_STATUSES = ['pending', 'requested', 'completed', 'rejected'] as const;
type TaxRefundStatusFilter = typeof VALID_TAX_REFUND_STATUSES[number];

interface OrderQueryFilters {
  channel?: OrderChannel;
  status?: string;
  guideId?: string;
  tourSessionId?: string;
  taxRefundEligible?: boolean;
  taxRefundStatus?: TaxRefundStatusFilter;
  page?: number;
  limit?: number;
}

// ============================================================================
// Helpers
// ============================================================================

function errorResponse(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, any>
): Response {
  return res.status(statusCode).json({
    error: { code, message, details },
  });
}

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

/**
 * Parse and validate query filters for order listing (H3-1)
 */
function parseOrderFilters(queryParams: Record<string, any>): {
  valid: boolean;
  filters?: OrderQueryFilters;
  error?: string;
} {
  const filters: OrderQueryFilters = {};

  if (queryParams.channel) {
    if (!['local', 'travel'].includes(queryParams.channel)) {
      return { valid: false, error: VALIDATION_ERRORS.INVALID_CHANNEL };
    }
    filters.channel = queryParams.channel as OrderChannel;
  }
  if (queryParams.status) {
    filters.status = queryParams.status;
  }
  if (queryParams.guideId) {
    filters.guideId = queryParams.guideId;
    if (!filters.channel) filters.channel = 'travel';
  }
  if (queryParams.tourSessionId) {
    filters.tourSessionId = queryParams.tourSessionId;
    if (!filters.channel) filters.channel = 'travel';
  }
  if (queryParams.taxRefundEligible !== undefined) {
    const eligibleStr = String(queryParams.taxRefundEligible).toLowerCase();
    if (eligibleStr !== 'true' && eligibleStr !== 'false') {
      return { valid: false, error: VALIDATION_ERRORS.INVALID_TAX_REFUND_ELIGIBLE_FILTER };
    }
    filters.taxRefundEligible = eligibleStr === 'true';
    if (!filters.channel) filters.channel = 'travel';
  }
  if (queryParams.taxRefundStatus) {
    if (!VALID_TAX_REFUND_STATUSES.includes(queryParams.taxRefundStatus)) {
      return { valid: false, error: VALIDATION_ERRORS.INVALID_TAX_REFUND_STATUS_FILTER };
    }
    filters.taxRefundStatus = queryParams.taxRefundStatus as TaxRefundStatusFilter;
    if (!filters.channel) filters.channel = 'travel';
  }
  filters.page = queryParams.page ? Number(queryParams.page) : 1;
  filters.limit = queryParams.limit ? Number(queryParams.limit) : 20;
  return { valid: true, filters };
}

// ============================================================================
// Controller Implementation
// ============================================================================

export function createCosmeticsOrderController(
  dataSource: DataSource,
  requireAuth: (req: Request, res: Response, next: NextFunction) => void,
  // WO-O4O-STORE-AND-PLATFORM-CONSUMER-COMMERCE-LEGACY-RETIREMENT-V1:
  //   주문 생성(POST) 은퇴로 `cosmetics:write` scope 사용처가 사라졌다.
  //   호출부(cosmetics.routes.ts) 시그니처를 흔들지 않기 위해 인자는 유지한다.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _requireScope?: (scope: string) => (req: Request, res: Response, next: NextFunction) => void
): Router {
  const router = Router();

  // ==========================================================================
  // POST /cosmetics/orders — 은퇴 (410)
  //
  // WO-O4O-STORE-AND-PLATFORM-CONSUMER-COMMERCE-LEGACY-RETIREMENT-V1
  //
  //   `OrderType = RETAIL` + `metadata.serviceKey='cosmetics'` + 채널 `local`/`travel` —
  //   소비자가 매장을 상대로 O4O 안에서 결제하는 주문 생성 경로였다.
  //   `O4O-STORE-COMMERCE-BOUNDARY-V1` §2-1 · §2-2 · §3 위반.
  //
  //   결제 leg 은 `WO-O4O-STORE-SALE-CHECKOUT-ROUTE-DEPRECATION-V1` 이 이미
  //   410 `STORE_SALE_PAYMENT_DEPRECATED` 로 차단했고, 본 WO 가 주문 생성 producer 를 닫는다.
  //   조회 경로(`GET /cosmetics/orders*`)는 매장의 구매/발주 축이므로 보존한다.
  // ==========================================================================
  router.post('/', (_req: Request, res: Response) => {
    return res.status(410).json({
      success: false,
      code: 'STORE_CONSUMER_ORDER_RETIRED',
      message:
        '매장 소비자 주문은 O4O에서 제공하지 않습니다. 현장 판매는 매장의 POS, 온라인 판매는 외부 판매채널을 이용해 주세요.',
    });
  });

  // ==========================================================================
  // GET /cosmetics/orders — 주문 목록 조회 (DB 기반)
  // ==========================================================================
  router.get(
    '/',
    requireAuth,
    [
      query('channel').optional().isIn(['local', 'travel']),
      query('status').optional().isString(),
      query('guideId').optional().isString(),
      query('tourSessionId').optional().isString(),
      query('taxRefundEligible').optional().isString(),
      query('taxRefundStatus').optional().isString(),
      query('page').optional().isInt({ min: 1 }).toInt(),
      query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    ],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const buyerId = authReq.user?.id || authReq.authUser?.id;

        if (!buyerId) {
          return errorResponse(res, 401, 'UNAUTHORIZED', 'User not authenticated');
        }

        // Parse and validate filters
        const filterResult = parseOrderFilters(req.query);
        if (!filterResult.valid) {
          return errorResponse(res, 400, 'FILTER_VALIDATION_ERROR', filterResult.error!);
        }

        const filters = filterResult.filters!;

        // WO-O4O-COSMETICS-ORDERS-CANONICAL-CHECKOUT-ALIGNMENT-V1:
        //   canonical 주문 원장은 checkout_orders(CheckoutOrder) 다. off-contract EcommerceOrder
        //   (ecommerce_orders — 프로덕션 미존재, "relation does not exist")를 제거하고
        //   checkout_orders 기준으로 정렬한다. 서비스 격리 metadata->>'serviceKey'='cosmetics' 유지,
        //   기존 buyerId 스코프 보존(의미 변경 없음). 응답 shape(StoreOrder)는 불변.
        //   Boundary Guard: raw SQL 은 parameter binding 만 사용(string interpolation 금지).
        // WO-O4O-STORE-HUB-EVENT-OFFER-ORDER-VISIBILITY-AND-CANCELLATION-V1:
        //   이벤트 오퍼 주문('k-cosmetics-event-offer')이 누락되던 결함 — 조회 범위만 확장.
        //   Boundary Guard 유지: 키 집합도 parameter binding 으로 전달한다.
        const { orders, pagination } = await listBuyerOrders(dataSource, {
          buyerId,
          serviceKeys: KCOS_BUYER_ORDER_SERVICE_KEYS,
          page: filters.page,
          limit: filters.limit,
          // K-Cosmetics 고유 필터 — Core 가 SQL 을 소유하고 여기서는 값만 넘긴다.
          filters: {
            channel: filters.channel,
            status: filters.status,
            travelGuideId: filters.guideId,
            travelTourSessionId: filters.tourSessionId,
            travelTaxRefundEligible:
              filters.taxRefundEligible !== undefined
                ? String(filters.taxRefundEligible)
                : undefined,
            travelTaxRefundStatus: filters.taxRefundStatus,
          },
        });

        // Build applied filters info
        const appliedFilters: Record<string, any> = { buyerId };
        if (filters.channel) appliedFilters.channel = filters.channel;
        if (filters.status) appliedFilters.status = filters.status;
        if (filters.guideId) appliedFilters.guideId = filters.guideId;
        if (filters.tourSessionId) appliedFilters.tourSessionId = filters.tourSessionId;
        if (filters.taxRefundEligible !== undefined) {
          appliedFilters.taxRefundEligible = filters.taxRefundEligible;
        }
        if (filters.taxRefundStatus) {
          appliedFilters.taxRefundStatus = filters.taxRefundStatus;
        }

        logger.info('[Cosmetics Order] List orders:', appliedFilters);

        res.json({
          success: true,
          // wrapper 책임 = K-Cosmetics 표기(channel · storeName)만.
          // 조회 의미·ownership·serviceKey 격리·필터 SQL 은 Core 소유.
          data: orders.map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            totalAmount: order.totalAmount,
            channel: (order.metadata?.channel as string | undefined) ?? undefined,
            storeName: (order.metadata?.storeName as string | undefined) ?? undefined,
            itemCount: order.itemCount,
            createdAt: order.createdAt,
          })),
          pagination,
          filters: appliedFilters,
        });
      } catch (error: unknown) {
        const err = error as Error;
        logger.error('[Cosmetics Order] List orders error:', err);
        errorResponse(res, 500, 'ORDER_LIST_ERROR', 'Failed to list orders');
      }
    }
  );

  // ==========================================================================
  // GET /cosmetics/orders/:id — 단건 조회
  // ==========================================================================
  router.get(
    '/:id',
    requireAuth,
    [param('id').isUUID()],
    async (req: Request, res: Response) => {
      try {
        if (handleValidationErrors(req, res)) return;

        const authReq = req as AuthRequest;
        const buyerId = authReq.user?.id || authReq.authUser?.id;

        if (!buyerId) {
          return errorResponse(res, 401, 'UNAUTHORIZED', 'User not authenticated');
        }

        // WO-O4O-COSMETICS-ORDERS-CANONICAL-CHECKOUT-ALIGNMENT-V1:
        //   canonical checkout_orders 기준 단건 조회. items 는 checkout_orders.items JSONB.
        //   buyerId 스코프 + serviceKey 격리 유지. 응답 shape(StoreOrderDetail) 불변.
        const result = await getBuyerOrderDetail(dataSource, {
          orderId: String(req.params.id ?? ''),
          buyerId,
          serviceKeys: KCOS_BUYER_ORDER_SERVICE_KEYS,
        });

        if (isBuyerOrderReadFailure(result)) {
          return errorResponse(res, result.httpStatus, result.code, result.message);
        }

        const order = result.order;
        const metadata = (order.metadata || {}) as CosmeticsOrderMetadata & { serviceKey: string };
        const orderItems: any[] = order.items;

        res.json({
          success: true,
          data: {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            paymentStatus: order.paymentStatus,
            subtotal: order.subtotal,
            shippingFee: order.shippingFee,
            discount: order.discount,
            totalAmount: order.totalAmount,
            currency: order.currency, // checkout_orders 에는 currency 컬럼 없음 — 단일 통화(KRW) 고정
            channel: metadata?.channel,
            store: metadata?.storeId ? {
              id: metadata.storeId,
              name: metadata.storeName,
            } : undefined,
            fulfillment: metadata?.fulfillment,
            travel: metadata?.travel,
            shippingAddress: order.shippingAddress,
            items: orderItems.map((item: any, idx: number) => ({
              id: item.id ?? `${order.id}-${idx}`,
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: Number(item.unitPrice),
              discount: Number(item.discount ?? 0),
              subtotal: Number(item.subtotal),
              options: item.options,
              metadata: item.metadata,
            })),
            paidAt: order.paidAt,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
          },
        });
      } catch (error: unknown) {
        const err = error as Error;
        logger.error('[Cosmetics Order] Get order error:', err);
        errorResponse(res, 500, 'ORDER_GET_ERROR', 'Failed to get order');
      }
    }
  );

  /**
   * POST /:id/cancel  (router 는 `/api/v1/cosmetics/orders` 에 mount — 최종 경로 /orders/:id/cancel)
   * 결제 전 구매자 주문 취소
   *
   * WO-O4O-STORE-HUB-EVENT-OFFER-ORDER-VISIBILITY-AND-CANCELLATION-V1:
   *   이벤트 오퍼 주문에 매장측 취소 경로가 없어 생성 후 되돌릴 수 없었다.
   *   Pharmacy-Hub `cancelBeforePayment` 와 동일 계약이며,
   *   이벤트 오퍼 주문이면 예약 차감된 재고를 canonical 보상 경로로 복원한다.
   */
  router.post(
    '/:id/cancel',
    requireAuth,
    // WO-O4O-B2B-REMAINING-DEBT-FINAL-CLOSURE-V1 §13:
    //   취소는 canonical `checkout_orders` 상태를 바꾸는 write 다(이벤트오퍼는 재고 복원까지).
    //   cart write · 두 confirm 경로와 동일하게 active membership 을 요구한다 —
    //   정지(suspended)/탈퇴 회원이 주문 원장을 바꾸지 못한다. 조회 경로에는 붙이지 않는다.
    requireActiveServiceMembership(dataSource, SERVICE_KEYS.K_COSMETICS),
    async (req: Request, res: Response) => {
      try {
        const authReq = req as AuthRequest;
        const buyerId = authReq.user?.id || authReq.authUser?.id;
        if (!buyerId) {
          return errorResponse(res, 401, 'UNAUTHORIZED', 'User not authenticated');
        }

        const result = await cancelStoreOrderBeforePayment(dataSource, {
          orderId: String(req.params.id ?? ''),
          buyerId,
          serviceKeys: KCOS_BUYER_ORDER_SERVICE_KEYS,
          reason: typeof req.body?.reason === 'string' ? req.body.reason : undefined,
        });

        // strictNullChecks:false 환경이라 자동 narrowing 이 없다 → 명시적 predicate 사용.
        if (isCancelStoreOrderFailure(result)) {
          return errorResponse(res, result.httpStatus, result.code, result.message, result.details);
        }
        res.json({ success: true, data: result });
      } catch (error: unknown) {
        const err = error as Error;
        logger.error('[Cosmetics Order] Cancel order error:', err);
        errorResponse(res, 500, 'ORDER_CANCEL_ERROR', 'Failed to cancel order');
      }
    }
  );

  return router;
}
