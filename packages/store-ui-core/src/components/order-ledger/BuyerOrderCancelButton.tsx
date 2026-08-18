/**
 * BuyerOrderCancelButton — buyer 주문 결제 전 취소 버튼(공통 표현)
 *
 * WO-O4O-STORE-HUB-MAIN-INDEPENDENT-PRODUCTION-VERIFICATION-V1 §9
 * 취소 가능 여부 판정은 `isBuyerOrderCancellable`, 실행은 `useBuyerOrderCancel` 이 담당한다.
 * 이 컴포넌트는 표현만 가진다(서비스별 accent 없음 — 파괴적 액션은 공통 red).
 */

import type { MouseEvent } from 'react';
import { Loader2 } from 'lucide-react';

export interface BuyerOrderCancelButtonProps {
  orderId: string;
  onCancel: (orderId: string) => void;
  /** 현재 취소 진행 중인 주문 id (`useBuyerOrderCancel.cancelingId`) */
  cancelingId: string | null;
  label?: string;
  size?: 'sm' | 'md';
}

export function BuyerOrderCancelButton({
  orderId,
  onCancel,
  cancelingId,
  label = '주문 취소',
  size = 'sm',
}: BuyerOrderCancelButtonProps) {
  const busy = cancelingId === orderId;
  const disabled = cancelingId !== null;

  const handle = (e: MouseEvent<HTMLButtonElement>) => {
    // 행 클릭(상세 열기)과 겹치는 위치에 놓이므로 전파를 막는다.
    e.stopPropagation();
    onCancel(orderId);
  };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={disabled}
      className={
        'inline-flex items-center gap-1 rounded-lg border border-red-200 font-semibold text-red-600 ' +
        'hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed ' +
        (size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm')
      }
    >
      {busy && <Loader2 size={12} className="animate-spin" />}
      {busy ? '취소 중…' : label}
    </button>
  );
}
