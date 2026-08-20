/**
 * resolveNotificationTarget — 알림 클릭 시 이동할 내부 경로 해석 (공통 SSOT)
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-NOTIFICATIONS-COMMONIZATION-V1
 *
 * 이전 상태(중복 5벌):
 *   - KPA        lib/notificationRouting.ts        (내부 경로 가드 있음 + store.* fallback)
 *   - Neture     lib/notificationRouting.ts        (가드 없음)
 *   - GlycoPharm GlycoGlobalHeader 인라인          (가드 없음)
 *   - KCos       KCosGlobalHeader 인라인           (가드 없음)
 *   - PH         PharmacyHubGlobalHeader 인라인    (가드 없음)
 *
 * 본 함수는 그 5벌을 하나로 수렴한다. 서비스별 규칙(예: KPA 의 store.* fallback)은
 * `options.fallback` 으로 주입한다 — 이 파일 안에 서비스 route 나 serviceKey 분기를
 * 두지 않는다 (WO §9 · §12).
 *
 * 안전 계약: 내부 절대 경로(`/...`)만 반환한다.
 *   - `//evil.example` (protocol-relative) 차단
 *   - `https://…` 등 외부 URL 차단
 *   - 상대 경로(`foo`) 차단 — react-router navigate 가 현재 경로 기준으로 튀는 것을 막는다
 * fallback 이 돌려준 값에도 같은 검증을 적용한다.
 */

import type { NotificationItem } from './types.js';

export interface ResolveNotificationTargetOptions {
  /**
   * metadata.targetUrl 이 없거나 내부 경로가 아닐 때 호출되는 서비스별 규칙.
   * 반환값도 내부 절대 경로여야 하며, 아니면 무시된다.
   */
  fallback?: (notification: NotificationItem) => string | null | undefined;
}

/** 내부 절대 경로만 통과시킨다. 아니면 null. */
export function toInternalPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (v.length === 0) return null;
  if (!v.startsWith('/')) return null;
  // protocol-relative(`//host`) 및 백슬래시 변형(`/\host`) 차단
  if (v.startsWith('//') || v.startsWith('/\\')) return null;
  return v;
}

/**
 * 알림 → 내부 이동 경로. 없으면 null (이동하지 않음).
 *
 * 1순위: metadata.targetUrl (내부 절대 경로일 때만)
 * 2순위: options.fallback (서비스별 규칙 — 결과도 내부 절대 경로여야 함)
 */
export function resolveNotificationTarget(
  notification: NotificationItem,
  options: ResolveNotificationTargetOptions = {}
): string | null {
  const meta = notification.metadata as Record<string, unknown> | null | undefined;
  const fromMetadata = toInternalPath(meta?.targetUrl);
  if (fromMetadata) return fromMetadata;

  if (options.fallback) {
    return toInternalPath(options.fallback(notification));
  }
  return null;
}
