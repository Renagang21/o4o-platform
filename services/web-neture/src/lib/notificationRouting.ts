/**
 * notificationRouting — 알림 클릭 시 이동 경로 해석 (SSOT)
 *
 * WO-O4O-NETURE-MOBILE-NAV-PROFILE-UTILITY-AND-WORKSPACE-ACCESS-STANDARDIZE-V1
 *
 * NetureGlobalHeader(데스크톱 NotificationBell)와 NetureBottomNav(모바일 알림 시트)가
 * 동일한 클릭 라우팅을 재사용하도록 순수 함수로 추출.
 * 기존 NetureGlobalHeader.handleNotificationClick 로직과 동치(metadata.targetUrl).
 */

import type { NotificationItem } from '@o4o/account-ui';

/** 알림 → 내부 이동 경로. metadata.targetUrl 이 있으면 사용, 없으면 null. */
export function resolveNetureNotificationTarget(n: NotificationItem): string | null {
  const target = (n.metadata as Record<string, unknown> | undefined)?.targetUrl;
  if (typeof target === 'string' && target.length > 0) {
    return target;
  }
  return null;
}
