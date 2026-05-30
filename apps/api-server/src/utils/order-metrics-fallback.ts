/**
 * Order metrics safe-fallback helper.
 *
 * WO-O4O-STORE-DASHBOARD-ORDER-METRICS-SAFE-FALLBACK-V1
 * 근거: docs/investigations/IR-O4O-ECOMMERCE-ORDERS-TABLE-CROSSSERVICE-IMPACT-V1.md
 *
 * 배경:
 *   ecommerce_orders / ecommerce_order_items 테이블은 production 에 존재하지
 *   않는다 (CREATE TABLE migration 부재). canonical 주문 테이블은
 *   checkout_orders 이며, ecommerce_orders 참조 클러스터는 추후 구조 정렬
 *   대상 (별도 schema diff IR + 정렬 WO).
 *
 * 본 helper:
 *   - PG 42P01 (undefined_table) 오류만 한정해 safe-fallback 처리한다.
 *   - 다른 오류는 그대로 propagate (silent 처리 금지).
 *   - controller 응답에 부착할 meta 정보를 제공해 프론트가 "준비 중" 상태로
 *     구분 렌더할 수 있게 한다.
 *
 * 사용 패턴 (controller layer):
 *   try {
 *     const stats = await adapter.getOrderStats(...);
 *     res.json({ success: true, data: stats, meta: READY_META });
 *   } catch (err) {
 *     if (isMissingOrderTable(err)) {
 *       logger.warn('[xxx] order table not ready', { ... });
 *       res.json({ success: true, data: <empty default>, meta: NOT_READY_META });
 *       return;
 *     }
 *     throw err;  // 또는 기존 일반 500 처리
 *   }
 */

import logger from './logger.js';

// ─── Status constants (cross-service stable contract) ─────────────────────

export const ORDER_METRICS_NOT_READY_CODE = 'ORDER_METRICS_NOT_READY';
export const ORDER_METRICS_NOT_READY_MESSAGE = '주문 데이터 준비 중입니다.';

export type OrderMetricsFeatureStatus = 'ready' | 'not_ready';

export interface OrderMetricsMeta {
  featureStatus: OrderMetricsFeatureStatus;
  /** featureStatus === 'not_ready' 인 경우만 부착 */
  featureCode?: string;
  /** featureStatus === 'not_ready' 인 경우만 부착 */
  message?: string;
}

export const READY_META: OrderMetricsMeta = { featureStatus: 'ready' };

export const NOT_READY_META: OrderMetricsMeta = {
  featureStatus: 'not_ready',
  featureCode: ORDER_METRICS_NOT_READY_CODE,
  message: ORDER_METRICS_NOT_READY_MESSAGE,
};

// ─── Detection ────────────────────────────────────────────────────────────

/**
 * PG 42P01 (undefined_table) 감지.
 * - node-postgres / TypeORM 모두 err.code 에 42P01 을 노출.
 * - 메시지 fallback: TypeORM 의 QueryFailedError 가 driverError 를 wrap 한 경우.
 *
 * 대상 테이블 (본 helper 의 적용 범위): ecommerce_orders /
 * ecommerce_order_items / ecommerce_payments — 이들 외 missing-table 은
 * 본 helper 가 not_ready 로 위장하지 않는다.
 */
export function isMissingOrderTable(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string; driverError?: { code?: string; message?: string } };
  const codeMatch = e.code === '42P01' || e.driverError?.code === '42P01';
  if (!codeMatch) return false;

  const msg = (e.message ?? '') + ' ' + (e.driverError?.message ?? '');
  return /(ecommerce_orders|ecommerce_order_items|ecommerce_payments)/i.test(msg);
}

// ─── Convenience wrappers ─────────────────────────────────────────────────

/**
 * raw query 를 실행하고, 42P01 (ecommerce_orders 류 부재) 에 한해 fallback 반환.
 * 다른 오류는 그대로 throw. 사용 가능하지만 controller layer 의 명시적
 * try/catch + meta 부착 패턴을 더 권장한다 (응답 meta 결합이 깔끔).
 *
 * @returns 성공 시 { ready: true, data }, 테이블 부재 시 { ready: false, data: fallback }
 */
export async function tryOrderQuery<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T,
): Promise<{ ready: boolean; data: T }> {
  try {
    const data = await fn();
    return { ready: true, data };
  } catch (err) {
    if (isMissingOrderTable(err)) {
      logger.warn(`[order-metrics-fallback] ${label}: order table not ready — returning safe fallback`);
      return { ready: false, data: fallback };
    }
    throw err;
  }
}
