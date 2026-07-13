/**
 * notificationRouting — 알림 클릭 시 이동 경로 해석 (SSOT)
 *
 * WO-O4O-KPA-MOBILE-BOTTOM-UTILITY-NAV-ROUTE-COVERAGE-FIX-V1
 *
 * KpaGlobalHeader(데스크톱 NotificationBell)와 MobileBottomNav(모바일 알림 시트)가
 * 동일한 클릭 라우팅을 재사용하도록 순수 함수로 추출.
 * 기존 KpaGlobalHeader.handleNotificationClick 로직과 동치.
 */

import type { NotificationItem } from '@o4o/account-ui';

/**
 * 알림 → 내부 이동 경로. 없으면 null (이동하지 않음).
 * 1순위: metadata.targetUrl 내부 path (외부 URL `//`,`http` 차단)
 * 2·3순위: store.* 알림 fallback (타블렛/상담 → 타블렛 화면, 그 외 store → 매장 홈)
 */
export function resolveNotificationTarget(n: NotificationItem): string | null {
  const target = (n.metadata as Record<string, unknown> | undefined)?.targetUrl;
  if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')) {
    return target;
  }
  const type = String(n.type || '');
  if (type === 'store.consultation_requested' || type.startsWith('store.tablet')) {
    return '/store/commerce/tablet-displays';
  }
  if (type.startsWith('store.')) {
    return '/store';
  }
  return null;
}
