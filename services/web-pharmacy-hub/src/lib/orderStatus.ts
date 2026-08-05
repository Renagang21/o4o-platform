/**
 * 주문 상태 표시 규칙 (단일 정의)
 *
 * WO-PHARMACY-HUB-STORE-HOME-DASHBOARD-V1 — OrdersPage 에만 있던 판정을 옮겨서
 * 홈 대시보드와 주문 목록이 같은 문구·같은 톤을 쓰게 한다(사본 금지).
 *
 * 표시 규칙은 기존과 동일하다: 서버가 내려준 `paymentStatus`/`supplierNotified` 를
 * 그대로 반영하고, 미결제 주문을 "접수됨"·"처리 중"처럼 표현하지 않는다 —
 * 결제 전에는 공급자가 볼 수 없다.
 */

export interface OrderStatusInput {
  status: string;
  paymentStatus: string;
  supplierNotified?: boolean;
}

export interface OrderStatusBadge {
  text: string;
  tone: string;
}

/** 주문 원장 상태 → 사용자 문구. 결제 여부를 우선해서 읽는다. */
export function orderStatusBadge(order: OrderStatusInput): OrderStatusBadge {
  if (order.status === 'cancelled') return { text: '취소됨', tone: 'bg-gray-100 text-gray-600' };
  if (order.paymentStatus === 'refunded') return { text: '환불됨', tone: 'bg-gray-100 text-gray-600' };
  if (order.paymentStatus === 'paid') {
    return order.supplierNotified
      ? { text: '공급자 전달 완료', tone: 'bg-emerald-50 text-emerald-700' }
      : { text: '결제 완료', tone: 'bg-emerald-50 text-emerald-700' };
  }
  if (order.paymentStatus === 'failed') return { text: '결제 실패', tone: 'bg-red-50 text-red-700' };
  return { text: '결제 대기', tone: 'bg-amber-50 text-amber-700' };
}

/** 금액 표기 — 서버가 준 값을 그대로 포맷만 한다(재계산 금지). */
export const won = (v: number) => `${Number(v).toLocaleString('ko-KR')}원`;
