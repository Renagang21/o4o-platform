/**
 * Neture 약국 commerce 경계 — pharmacy.neture.co.kr(kpa-society) 화면용
 *
 * WO-NETURE-PHARMACY-PREDEPLOY-ACCESS-ALIGNMENT-V1
 *
 * Neture 승인 약국(kpa-society membership 없음 · `neture:store_owner`)의 주문은 내 매장(store.neture.co.kr, web-store)의
 * 새 Neture commerce 에서 한다. 이 앱의 옛 KPA HUB 장바구니 · 이벤트 담기 · 주문 작업대 · 발주 내역은 backend 가
 * kpa-society active membership 을 요구하므로(store-cart · kpa-checkout) 권한을 넓히지 않고 새 경로로 안내한다.
 * KPA 회원(kpa-society active)은 판정 대상이 아니다 — 옛 경로 그대로.
 */

import { getServiceMembershipStatus, isPlatformSuperAdmin, type UserLike } from './membershipGate';

export const NETURE_STORE_OWNER_ROLE = 'neture:store_owner';

const STORE_ORIGIN = 'https://store.neture.co.kr';

/** web-store `PHARMACY_STORE_PATHS` (services/web-store/src/pages/neture-pharmacy/shared.tsx) 의 절대 URL. */
export const NETURE_COMMERCE_LINKS = {
  supply: { label: '공급 옵션 · 이벤트', href: `${STORE_ORIGIN}/store/pharmacy/supply` },
  cart: { label: '장바구니', href: `${STORE_ORIGIN}/store/pharmacy/cart` },
  orders: { label: '주문 내역 · 취소', href: `${STORE_ORIGIN}/store/pharmacy/orders` },
} as const;

/** 이 앱 안의 안내 화면 경로 (매장 HUB 사이드바 · 옛 진입 대체). */
export const NETURE_COMMERCE_NOTICE_PATH = '/store-hub/neture-commerce';

type CommerceUserLike = (UserLike & {
  roles?: string[];
  memberships?: { serviceKey: string; status: string }[] | null;
  isStoreOwner?: boolean;
}) | null | undefined;

/**
 * 옛 KPA 장바구니 · 발주를 쓸 수 없는 Neture 약국 사용자인가.
 * 기준은 backend 차단 조건과 같다 — kpa-society membership 이 active 가 아니면(없음 · 정지 · 탈퇴 포함) 옛 경로는 막힌다.
 */
export function isNetureCommerceUser(user: CommerceUserLike): boolean {
  if (!user || isPlatformSuperAdmin(user)) return false;
  if (getServiceMembershipStatus(user) === 'active') return false;
  if ((user.roles ?? []).includes(NETURE_STORE_OWNER_ROLE)) return true;
  const netureActive = (user.memberships ?? []).some((m) => m.serviceKey === 'neture' && m.status === 'active');
  return netureActive && !!user.isStoreOwner;
}
