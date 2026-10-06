/**
 * NetureCommerceRedirect — 옛 KPA HUB 주문 진입을 Neture 약국에게는 새 commerce 로 안내
 *
 * WO-NETURE-PHARMACY-PREDEPLOY-ACCESS-ALIGNMENT-V1
 *
 * 옛 이벤트 담기 · 장바구니 · 주문 작업대 · 발주 내역 route 를 감싼다. Neture 약국(`isNetureCommerceUser`)이면
 * 화면 대신 store.neture.co.kr 의 공급 옵션 · 장바구니 · 주문 내역 링크를 보이고, 그 밖(KPA 회원 · 미인증 · 운영자)은
 * children 을 그대로 렌더한다 — 기존 가드 · 화면 동작 불변.
 */

import { useNavigate } from 'react-router-dom';
import { MembershipStatusNotice, type MembershipStatusNoticeAction } from '@o4o/account-ui';
import { useAuth } from '../../contexts/AuthContext';
import { NETURE_COMMERCE_LINKS, isNetureCommerceUser } from '../../lib/netureCommerce';

export function NetureCommerceNotice() {
  const navigate = useNavigate();
  const actions: MembershipStatusNoticeAction[] = [
    ...(['supply', 'cart', 'orders'] as const).map((key, i) => ({
      key,
      label: NETURE_COMMERCE_LINKS[key].label,
      onClick: () => window.location.assign(NETURE_COMMERCE_LINKS[key].href),
      variant: i === 0 ? ('primary' as const) : ('secondary' as const),
    })),
    { key: 'home', label: '매장 HUB 로 돌아가기', onClick: () => navigate('/store-hub'), variant: 'secondary' },
  ];
  return (
    <MembershipStatusNotice
      icon="🛒"
      title="Neture 약국 주문은 내 매장에서 합니다"
      message="공급 상품 · 이벤트 담기, 장바구니, 주문 내역과 취소는 내 매장(store.neture.co.kr)의 약국 주문 화면에서 이용할 수 있습니다."
      actions={actions}
    />
  );
}

export function NetureCommerceRedirect({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (!isLoading && isNetureCommerceUser(user)) return <NetureCommerceNotice />;
  return <>{children}</>;
}
