/**
 * notificationRouting — 알림 클릭 시 이동 경로 해석 (KPA 확장)
 *
 * WO-O4O-KPA-MOBILE-BOTTOM-UTILITY-NAV-ROUTE-COVERAGE-FIX-V1
 * WO-O4O-CROSS-SERVICE-MYPAGE-NOTIFICATIONS-COMMONIZATION-V1:
 *   공통 규칙(metadata.targetUrl + 내부 경로 가드)은 @o4o/account-ui 의
 *   resolveNotificationTarget 으로 이관했다. 이 파일에는 KPA 고유 fallback
 *   (store.* 알림 → 매장 화면)만 남는다 — 공통 View 안에 서비스 route 를
 *   두지 않는다는 계약(WO §12) 때문에 fallback 은 여기서 주입한다.
 *
 * KpaGlobalHeader(데스크톱 NotificationBell)와 MobileBottomNav(모바일 알림 시트)가
 * 동일한 클릭 라우팅을 재사용한다.
 */

import { resolveNotificationTarget as resolveCommon } from '@o4o/account-ui';
import type { NotificationItem } from '@o4o/account-ui';

/** KPA 고유 fallback — metadata.targetUrl 이 없는 store.* 알림의 목적지. */
function kpaFallback(n: NotificationItem): string | null {
  const type = String(n.type || '');
  if (type === 'store.consultation_requested' || type.startsWith('store.tablet')) {
    return '/store/commerce/tablet-displays';
  }
  if (type.startsWith('store.')) {
    return '/store';
  }
  return null;
}

/**
 * 알림 → 내부 이동 경로. 없으면 null (이동하지 않음).
 * 1순위: metadata.targetUrl 내부 path (외부 URL `//`, `http` 는 공통 가드가 차단)
 * 2순위: store.* 알림 fallback
 */
export function resolveNotificationTarget(n: NotificationItem): string | null {
  return resolveCommon(n, { fallback: kpaFallback });
}
