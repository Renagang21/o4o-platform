import type { CSSProperties } from 'react';
import { getBuyerCheckoutStatusDisplay, BUYER_CHECKOUT_TONE_HEX } from '../../utils/buyerCheckoutStatus';

export interface BuyerOrderStatusBadgeProps {
  /** raw checkout order status (예: created/pending_payment/paid/cancelled/refunded) */
  status?: string | null;
  /** 서비스별 미세 조정용 추가 인라인 스타일 */
  style?: CSSProperties;
}

/**
 * BuyerOrderStatusBadge — buyer 주문 내역(구매/발주) 공통 상태 배지.
 *
 * WO-O4O-STORE-BUYER-ORDERS-COMMON-COMPONENT-EXTRACTION-V1:
 *   라벨/색(tone)은 공통 매핑(`buyerCheckoutStatus`)을 사용. 자체 inline-style 이라
 *   디자인 시스템(Tailwind/theme)에 비종속 → KPA/KCos 의 중복 inline 배지 렌더를 통합한다.
 *
 * 주의: GP `PharmacyOrders` 는 status+paymentStatus payment-aware `deriveState`
 *   (Tailwind + icon) 를 유지하므로 본 배지를 적용하지 않는다(의도된 예외).
 */
export function BuyerOrderStatusBadge({ status, style }: BuyerOrderStatusBadgeProps) {
  const display = getBuyerCheckoutStatusDisplay(status);
  const hex = BUYER_CHECKOUT_TONE_HEX[display.tone];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 500,
        color: hex.color,
        backgroundColor: hex.bg,
        ...style,
      }}
    >
      {display.label}
    </span>
  );
}
