/**
 * notificationRouting — 알림 클릭 시 이동 경로 해석 (Neture)
 *
 * WO-O4O-NETURE-MOBILE-NAV-PROFILE-UTILITY-AND-WORKSPACE-ACCESS-STANDARDIZE-V1
 * WO-O4O-CROSS-SERVICE-MYPAGE-NOTIFICATIONS-COMMONIZATION-V1:
 *   구현을 @o4o/account-ui 의 공통 resolveNotificationTarget 으로 이관했다.
 *   이전 구현은 `metadata.targetUrl` 을 검증 없이 그대로 navigate 에 넘겨
 *   `//host` 같은 protocol-relative 값이 외부로 나갈 수 있었다 — 공통 가드가
 *   내부 절대 경로만 통과시킨다. Neture 고유 fallback 은 없다.
 *
 * NetureGlobalHeader(데스크톱 NotificationBell)와 NetureBottomNav(모바일 알림 시트)가
 * 동일한 클릭 라우팅을 재사용한다.
 */

import { resolveNotificationTarget as resolveCommon } from '@o4o/account-ui';
import type { NotificationItem } from '@o4o/account-ui';

/** 알림 → 내부 이동 경로. metadata.targetUrl 이 내부 경로면 사용, 없으면 null. */
export function resolveNetureNotificationTarget(n: NotificationItem): string | null {
  return resolveCommon(n);
}
