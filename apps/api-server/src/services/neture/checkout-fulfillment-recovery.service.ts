/**
 * CheckoutFulfillmentRecoveryService — paid-but-unbridged 탐지 · 복구 (전 producer 공통)
 *
 * WO-O4O-SUPPLIER-ORDER-PAYMENT-FULFILLMENT-SETTLEMENT-CANONICALIZATION-V1 §2-F
 *
 * 막으려는 영구 상태:
 *   checkout_orders.paymentStatus='paid'  AND  대응 neture_order 없음
 *   → 매장은 결제했는데 공급자 화면에 주문이 없다.
 *
 * 설계:
 *   - **새 queue/framework/DB schema 를 만들지 않는다.** 기존 `CheckoutFulfillmentBridgeService`
 *     를 그대로 재호출한다 — payment-first guard · idempotency(`metadata.checkoutOrderId`) ·
 *     source registry 판정이 전부 bridge 안에 이미 있다.
 *   - 대상 producer 는 `BRIDGE_SOURCES` 가 SSOT 다(Neture B2B · Pharmacy-Hub · 승인축 B2B ·
 *     Event Offer 특가). registry 에 없는 source 는 조회·복구 대상이 아니다.
 *   - 기존 Pharmacy-Hub 전용 recovery(`PharmacyHubOperatorFulfillmentController`)는
 *     **접촉하지 않는다**(회귀 기준). 이 서비스는 그와 같은 동작을 전 producer 로 일반화한 것이다.
 *
 * 안전:
 *   - 결제 상태를 **절대 바꾸지 않는다**. paid 가 아니면 복구 대상이 아니다.
 *   - 재고를 건드리지 않는다(Event Offer 수량은 checkout-confirm 에서 이미 원자 확보).
 *   - 이미 bridge 된 주문은 no-op 으로 기존 netureOrderId 를 돌려준다(멱등).
 *   - 호출자가 서비스 경계를 좁히면(`serviceKeys`) 그 밖의 주문은 조회·복구되지 않는다.
 */
import type { DataSource } from 'typeorm';
import { BRIDGE_SOURCES, CheckoutFulfillmentBridgeService } from './checkout-fulfillment-bridge.service.js';
import logger from '../../utils/logger.js';

export interface StuckOrderRow {
  id: string;
  orderNumber: string | null;
  serviceKey: string | null;
  source: string | null;
  supplierId: string | null;
  totalAmount: number;
  paidAt: string | null;
}

export type RecoveryOutcome =
  | { ok: true; orderId: string; netureOrderId: string; alreadyBridged: boolean }
  | { ok: false; orderId: string; code: RecoveryFailureCode; message: string; detail?: Record<string, unknown> };

export type RecoveryFailureCode =
  | 'ORDER_NOT_FOUND'
  | 'ORDER_NOT_PAID'
  | 'UNSUPPORTED_SOURCE'
  | 'OUT_OF_SCOPE'
  | 'RECOVERY_FAILED';

export interface RecoveryScope {
  /** 허용 serviceKey (metadata.serviceKey). 생략하면 모든 서비스 */
  serviceKeys?: readonly string[];
  /** 허용 source (metadata.source). 생략하면 BRIDGE_SOURCES 전체 */
  sources?: readonly string[];
}

const MAX_LIMIT = 200;

export class CheckoutFulfillmentRecoveryService {
  private bridge: CheckoutFulfillmentBridgeService;

  constructor(private dataSource: DataSource) {
    this.bridge = new CheckoutFulfillmentBridgeService(dataSource);
  }

  /** recovery 대상 source 목록 (registry SSOT ∩ scope) */
  private resolveSources(scope?: RecoveryScope): string[] {
    const all = Object.keys(BRIDGE_SOURCES);
    if (!scope?.sources || scope.sources.length === 0) return all;
    return all.filter((s) => scope.sources!.includes(s));
  }

  /**
   * paid 인데 대응 neture_order 가 없는 주문 목록.
   * 전 producer 공통 — `BRIDGE_SOURCES` 에 등록된 source 만 본다.
   */
  async listStuckOrders(params: { limit?: number; scope?: RecoveryScope } = {}): Promise<StuckOrderRow[]> {
    const limit = Math.min(Math.max(Number(params.limit ?? 50), 1), MAX_LIMIT);
    const sources = this.resolveSources(params.scope);
    if (sources.length === 0) return [];

    const values: unknown[] = [sources];
    let serviceKeyClause = '';
    if (params.scope?.serviceKeys && params.scope.serviceKeys.length > 0) {
      values.push(params.scope.serviceKeys);
      serviceKeyClause = ` AND co.metadata->>'serviceKey' = ANY($${values.length}::text[])`;
    }

    const rows = await this.dataSource.query(
      `SELECT co.id::text                        AS id,
              co."orderNumber"                   AS "orderNumber",
              co.metadata->>'serviceKey'         AS "serviceKey",
              co.metadata->>'source'             AS source,
              co."supplierId"                    AS "supplierId",
              co."totalAmount"                   AS "totalAmount",
              co."paidAt"                        AS "paidAt"
         FROM checkout_orders co
        WHERE co."paymentStatus" = 'paid'
          AND co.status = 'paid'
          AND co."paidAt" IS NOT NULL
          AND co.metadata->>'source' = ANY($1::text[])${serviceKeyClause}
          AND NOT EXISTS (
                SELECT 1 FROM neture_orders no2
                 WHERE no2.metadata->>'checkoutOrderId' = co.id::text
              )
        ORDER BY co."paidAt" ASC
        LIMIT ${limit}`,
      values,
    );

    return rows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      orderNumber: (r.orderNumber as string) ?? null,
      serviceKey: (r.serviceKey as string) ?? null,
      source: (r.source as string) ?? null,
      supplierId: (r.supplierId as string) ?? null,
      totalAmount: Number(r.totalAmount ?? 0),
      paidAt: r.paidAt ? new Date(r.paidAt as string).toISOString() : null,
    }));
  }

  /**
   * 단건 복구 — 기존 bridge 재호출(멱등).
   * 결제 상태는 바꾸지 않는다. 이미 bridge 됐으면 no-op.
   */
  async recoverOrder(
    checkoutOrderId: string,
    options: { scope?: RecoveryScope; actorId?: string | null } = {},
  ): Promise<RecoveryOutcome> {
    const sources = this.resolveSources(options.scope);

    const [order] = await this.dataSource.query(
      `SELECT id::text AS id, status::text AS status, "paymentStatus"::text AS "paymentStatus",
              metadata->>'source' AS source, metadata->>'serviceKey' AS "serviceKey"
         FROM checkout_orders WHERE id = $1::uuid LIMIT 1`,
      [checkoutOrderId],
    );
    if (!order) {
      return { ok: false, orderId: checkoutOrderId, code: 'ORDER_NOT_FOUND', message: '주문을 찾을 수 없습니다.' };
    }

    // registry 밖 source = 이 경로의 복구 대상이 아니다(타 축 오조작 금지)
    if (!order.source || !BRIDGE_SOURCES[order.source]) {
      return {
        ok: false,
        orderId: checkoutOrderId,
        code: 'UNSUPPORTED_SOURCE',
        message: '공급자 전달 대상 주문이 아닙니다.',
        detail: { source: order.source ?? null },
      };
    }
    // 호출자가 좁힌 경계 밖이면 거부(서비스 운영자가 타 서비스 주문을 건드리지 못하게)
    if (!sources.includes(order.source)) {
      return { ok: false, orderId: checkoutOrderId, code: 'OUT_OF_SCOPE', message: '이 경로로 복구할 수 없는 주문입니다.' };
    }
    if (
      options.scope?.serviceKeys &&
      options.scope.serviceKeys.length > 0 &&
      !options.scope.serviceKeys.includes(order.serviceKey ?? '')
    ) {
      return { ok: false, orderId: checkoutOrderId, code: 'OUT_OF_SCOPE', message: '이 경로로 복구할 수 없는 주문입니다.' };
    }

    // payment-first — 결제 상태는 절대 바꾸지 않는다
    if (order.paymentStatus !== 'paid' || order.status !== 'paid') {
      return {
        ok: false,
        orderId: checkoutOrderId,
        code: 'ORDER_NOT_PAID',
        message: '결제 완료된 주문만 복구할 수 있습니다.',
        detail: { status: order.status, paymentStatus: order.paymentStatus },
      };
    }

    const result = await this.bridge.bridgeCheckoutOrderToNetureFulfillment({ checkoutOrderId });

    // 운영자 개입은 항상 추적 가능해야 한다
    logger.warn('[CheckoutFulfillmentRecovery] recovery attempted', {
      checkoutOrderId,
      actorId: options.actorId ?? null,
      source: order.source,
      serviceKey: order.serviceKey,
      bridged: result.bridged,
      netureOrderId: result.netureOrderId ?? null,
      skippedReason: result.skippedReason ?? null,
    });

    if (!result.netureOrderId) {
      return {
        ok: false,
        orderId: checkoutOrderId,
        code: 'RECOVERY_FAILED',
        message: '공급자 전달에 실패했습니다.',
        detail: { reason: result.skippedReason ?? null },
      };
    }

    return {
      ok: true,
      orderId: checkoutOrderId,
      netureOrderId: result.netureOrderId,
      // 이미 전달돼 있었다면 새로 만들지 않았음을 명시한다(멱등)
      alreadyBridged: !result.bridged,
    };
  }

  /** 여러 건 순차 복구 — 실패해도 다음 건을 계속한다(부분 성공 허용) */
  async recoverMany(
    checkoutOrderIds: string[],
    options: { scope?: RecoveryScope; actorId?: string | null } = {},
  ): Promise<RecoveryOutcome[]> {
    const out: RecoveryOutcome[] = [];
    for (const id of checkoutOrderIds) {
      out.push(await this.recoverOrder(id, options));
    }
    return out;
  }
}
