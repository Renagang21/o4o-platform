/**
 * Store Order Cancel Service — 매장(구매자) 주문 결제 전 취소
 *
 * WO-O4O-STORE-HUB-EVENT-OFFER-ORDER-VISIBILITY-AND-CANCELLATION-V1
 *
 * ## 배경
 *
 * Store Hub 장바구니(`checkout-confirm`)로 만들어진 이벤트 오퍼 주문에는
 * 매장측 취소 경로가 없었다. Pharmacy-Hub 에만 결제 전 취소가 존재했고
 * (`POST /pharmacy-hub/store-owner/orders/:orderId/cancel`)
 * KPA·GlycoPharm·K-Cosmetics 의 checkout 컨트롤러에는 취소 route 자체가 없었다.
 *
 * ## 계약 (Pharmacy-Hub `cancelBeforePayment` 와 동일 의미)
 *
 *   · **결제 전 단건 취소만** 수행한다. 결제 상태를 직접 조작하지 않는다.
 *   · 이미 취소된 주문은 **멱등 성공**(alreadyCancelled=true).
 *   · 결제 완료 주문은 취소하지 않고 409 `ALREADY_PAID` — 환불은 결제 묶음 단위 별도 경로다.
 *   · 취소 가능 상태는 `created` · `pending_payment` 뿐이다(그 외 409).
 *
 * ## 이벤트 오퍼 재고 보상 (본 서비스의 추가 책임)
 *
 * 이벤트 오퍼 주문은 생성 시 `organization_product_listings.total_quantity` 를
 * **차감(reserve)** 한다(`EventOfferService.reserveEventOfferListing`).
 * 따라서 취소 시 차감분을 되돌리지 않으면 재고가 영구 소실된다.
 * 주문 실패 보상과 동일한 canonical 경로(`EventOfferService.incrementListingQuantity`)로
 * line item 의 `metadata.eventOfferId` × `quantity` 만큼 복원한다.
 *
 * 재고 복원은 원본 보상 경로와 동일하게 **best-effort** 다(실패해도 취소 자체는 유지).
 * 무엇이 복원됐는지는 결과로 반환하고 주문 metadata 에도 기록해 추적 가능하게 한다.
 *
 * DB 를 직접 삭제하지 않는다 — 주문 row 는 남고 상태만 `cancelled` 로 전이한다.
 */

import type { DataSource } from 'typeorm';
import { EventOfferService } from '../../routes/kpa/services/event-offer.service.js';
import { isEventOfferOrderServiceKey } from '../../constants/buyer-order-service-scope.js';
import logger from '../../utils/logger.js';

/** 결제 전 취소가 허용되는 주문 상태 (Pharmacy-Hub 와 동일). */
const CANCELLABLE_STATUSES = new Set(['created', 'pending_payment']);

export interface CancelStoreOrderInput {
  orderId: string;
  buyerId: string;
  /** 이 서비스의 구매자 주문으로 인정하는 metadata.serviceKey 집합 */
  serviceKeys: string[];
  reason?: string;
}

export interface ReleasedListing {
  listingId: string;
  quantity: number;
}

export interface CancelStoreOrderSuccess {
  ok: true;
  orderId: string;
  status: 'cancelled';
  alreadyCancelled: boolean;
  releasedListings: ReleasedListing[];
}

export interface CancelStoreOrderFailure {
  ok: false;
  httpStatus: number;
  code: 'ORDER_NOT_FOUND' | 'ALREADY_PAID' | 'ORDER_NOT_CANCELLABLE';
  message: string;
  details?: Record<string, unknown>;
}

export type CancelStoreOrderResult = CancelStoreOrderSuccess | CancelStoreOrderFailure;

/**
 * 실패 판별용 type predicate.
 *
 * api-server tsconfig 는 `strictNullChecks: false` 라 판별 union 의 자동 narrowing
 * (`if (!result.ok)`)이 동작하지 않는다. 호출부가 안전하게 좁힐 수 있도록 명시적 predicate 를 제공한다.
 */
export function isCancelStoreOrderFailure(
  result: CancelStoreOrderResult,
): result is CancelStoreOrderFailure {
  return result.ok === false;
}

interface OrderRow {
  id: string;
  status: string;
  paymentStatus: string;
  serviceKey: string | null;
  items: Array<{ quantity?: number; metadata?: Record<string, any> | null }> | null;
}

/**
 * 결제 전 매장 주문 취소 + (이벤트 오퍼인 경우) 예약 재고 복원.
 *
 * 서비스별 컨트롤러는 `getBuyerOrderServiceKeys(platformKey)` 결과를 `serviceKeys` 로 넘긴다.
 * 그 집합 밖의 주문은 조회되지 않아 서비스 격리가 유지된다.
 */
export async function cancelStoreOrderBeforePayment(
  dataSource: DataSource,
  input: CancelStoreOrderInput,
): Promise<CancelStoreOrderResult> {
  const { orderId, buyerId, serviceKeys } = input;
  const reason = (input.reason ?? '구매자 취소').slice(0, 200);

  if (serviceKeys.length === 0) {
    return {
      ok: false,
      httpStatus: 404,
      code: 'ORDER_NOT_FOUND',
      message: '주문을 찾을 수 없습니다.',
    };
  }

  const rows: OrderRow[] = await dataSource.query(
    `SELECT id::text AS id,
            status::text AS status,
            "paymentStatus"::text AS "paymentStatus",
            metadata->>'serviceKey' AS "serviceKey",
            items
       FROM checkout_orders
      WHERE id = $1::uuid
        AND "buyerId" = $2::uuid
        AND metadata->>'serviceKey' = ANY($3::text[])`,
    [orderId, buyerId, serviceKeys],
  );
  const order = rows[0];

  if (!order) {
    return {
      ok: false,
      httpStatus: 404,
      code: 'ORDER_NOT_FOUND',
      message: '주문을 찾을 수 없습니다.',
    };
  }

  // 멱등: 이미 취소된 주문은 재고를 다시 복원하지 않는다(중복 증가 방지).
  if (order.status === 'cancelled') {
    return {
      ok: true,
      orderId,
      status: 'cancelled',
      alreadyCancelled: true,
      releasedListings: [],
    };
  }

  if (order.paymentStatus === 'paid' || order.status === 'paid') {
    return {
      ok: false,
      httpStatus: 409,
      code: 'ALREADY_PAID',
      message: '결제된 주문입니다. 결제 취소·환불은 별도 경로로 처리해야 합니다.',
    };
  }

  if (!CANCELLABLE_STATUSES.has(order.status)) {
    return {
      ok: false,
      httpStatus: 409,
      code: 'ORDER_NOT_CANCELLABLE',
      message: '취소할 수 없는 주문 상태입니다.',
      details: { status: order.status },
    };
  }

  // 복원 대상 산출 — 이벤트 오퍼 주문의 line item 만.
  const releaseTargets = new Map<string, number>();
  if (isEventOfferOrderServiceKey(order.serviceKey)) {
    for (const item of order.items ?? []) {
      const listingId = item?.metadata?.eventOfferId ?? item?.metadata?.organizationProductListingId;
      const qty = Number(item?.quantity ?? 0);
      if (typeof listingId === 'string' && listingId && qty > 0) {
        releaseTargets.set(listingId, (releaseTargets.get(listingId) ?? 0) + qty);
      }
    }
  }

  // 상태 전이 — row 는 남기고 status 만 cancelled 로. metadata 는 merge(덮어쓰기 금지).
  await dataSource.query(
    `UPDATE checkout_orders
        SET status = 'cancelled',
            metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
              'cancelReason', $2::text,
              'cancelledBy', 'buyer',
              'cancelledAt', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
            ),
            "updatedAt" = NOW()
      WHERE id = $1::uuid`,
    [orderId, reason],
  );

  // 예약 재고 복원 (best-effort — 원본 보상 경로와 동일 정책).
  //
  // ※ reserve 는 `total_quantity IS NOT NULL` 인 listing 만 차감한다
  //   (`reserveEventOfferListing` (D) — 무제한 listing 은 decrementedQty=0).
  //   따라서 복원도 **같은 조건에서만** 수행해야 한다. 무제한 listing 에 increment 하면
  //   Postgres 에서 `NULL + n = NULL` 이라 값은 안 깨지지만, 복원했다고 잘못 보고하게 된다.
  const releasedListings: ReleasedListing[] = [];
  if (releaseTargets.size > 0) {
    const limitedRows: Array<{ id: string }> = await dataSource.query(
      `SELECT id::text AS id
         FROM organization_product_listings
        WHERE id = ANY($1::uuid[]) AND total_quantity IS NOT NULL`,
      [[...releaseTargets.keys()]],
    );
    const limited = new Set(limitedRows.map((r) => r.id));

    const eventOfferService = new EventOfferService(dataSource);
    for (const [listingId, quantity] of releaseTargets) {
      if (!limited.has(listingId)) continue; // 무제한 listing — 차감된 적이 없으므로 복원 대상 아님
      await eventOfferService.incrementListingQuantity(listingId, quantity);
      releasedListings.push({ listingId, quantity });
    }
  }
  if (releasedListings.length > 0) {
    // 무엇을 복원했는지 주문에 기록해 추적 가능하게 한다.
    await dataSource.query(
      `UPDATE checkout_orders
          SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'releasedEventOfferListings', $2::jsonb
              )
        WHERE id = $1::uuid`,
      [orderId, JSON.stringify(releasedListings)],
    );
  }

  logger.info('[StoreOrderCancel] pre-payment order cancelled', {
    orderId,
    buyerId,
    serviceKey: order.serviceKey,
    releasedListingCount: releasedListings.length,
  });

  return { ok: true, orderId, status: 'cancelled', alreadyCancelled: false, releasedListings };
}
