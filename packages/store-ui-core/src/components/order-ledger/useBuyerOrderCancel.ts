/**
 * useBuyerOrderCancel — buyer 주문 결제 전 취소 공통 훅
 *
 * WO-O4O-STORE-HUB-MAIN-INDEPENDENT-PRODUCTION-VERIFICATION-V1 §9
 *
 * 배경: `WO-O4O-STORE-HUB-EVENT-OFFER-ORDER-VISIBILITY-AND-CANCELLATION-V1` 에서
 *   결제 전 취소 계약(`POST .../cancel`)은 KPA · GlycoPharm · K-Cosmetics 백엔드에
 *   모두 추가됐지만 **매장 화면에는 노출되지 않았다**. Pharmacy-Hub 만 UI 버튼을 가진
 *   상태여서, 매장이 스스로 되돌릴 수 없는 흐름 단절이 남아 있었다.
 *
 * 계약(3 서비스 공통):
 *   - `created` · `pending_payment` 만 취소 가능. `paid` 는 취소가 아니라 환불 영역이다.
 *   - 이미 취소된 주문은 **멱등 성공**(`alreadyCancelled=true`) — 오류로 표시하지 않는다.
 *   - 이벤트 오퍼 주문이면 서버가 예약 재고를 복원하고 `releasedListings` 로 알려준다.
 *
 * 서비스가 소유하는 것은 호출 경로뿐이다(`cancelOrder`). 확인 문구 · 진행 상태 ·
 * 멱등 처리 · 재조회 트리거는 이 훅이 공통으로 가진다.
 */

import { useCallback, useState } from 'react';

/** 서버 응답(성공) 형상 — 3 서비스 공통 `cancelStoreOrderBeforePayment` 계약 */
export interface BuyerOrderCancelResult {
  ok?: boolean;
  orderId: string;
  status: string;
  alreadyCancelled: boolean;
  releasedListings?: Array<{ listingId: string; quantity: number }>;
}

/** 취소 가능 상태 — 서버 `CANCELLABLE_STATUSES` 와 같은 판정 */
export function isBuyerOrderCancellable(order: {
  status: string;
  paymentStatus?: string;
}): boolean {
  if (order.paymentStatus === 'paid') return false;
  return order.status === 'created' || order.status === 'pending_payment';
}

export interface UseBuyerOrderCancelOptions {
  /** 서비스별 취소 호출. 성공 시 서버 data 를 그대로 반환한다. */
  cancelOrder: (orderId: string, reason: string) => Promise<BuyerOrderCancelResult>;
  /** 취소 성공 후 목록/상세 재조회 */
  onCancelled: () => void | Promise<void>;
  /** 확인 창 문구 (미지정 시 기본 문구) */
  confirmMessage?: string;
  /** 결과 안내 (미지정 시 무시 — 서비스 toast 를 강제하지 않는다) */
  notify?: (message: string, kind: 'success' | 'error') => void;
  /** 서버에 남길 취소 사유 */
  reason?: string;
}

export function useBuyerOrderCancel({
  cancelOrder,
  onCancelled,
  confirmMessage = '이 주문을 취소하시겠습니까? 결제 전 주문만 취소할 수 있습니다.',
  notify,
  reason = '매장 요청 취소',
}: UseBuyerOrderCancelOptions) {
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const cancel = useCallback(
    async (orderId: string) => {
      if (!orderId || cancelingId) return;
      if (typeof window !== 'undefined' && !window.confirm(confirmMessage)) return;

      setCancelingId(orderId);
      setCancelError(null);
      try {
        const result = await cancelOrder(orderId, reason);
        notify?.(
          result?.alreadyCancelled ? '이미 취소된 주문입니다.' : '주문이 취소되었습니다.',
          'success',
        );
        await onCancelled();
      } catch (e) {
        const message =
          (e as { message?: string })?.message || '주문 취소에 실패했습니다. 잠시 후 다시 시도해 주세요.';
        setCancelError(message);
        notify?.(message, 'error');
      } finally {
        setCancelingId(null);
      }
    },
    [cancelOrder, cancelingId, confirmMessage, notify, onCancelled, reason],
  );

  return { cancel, cancelingId, cancelError };
}
