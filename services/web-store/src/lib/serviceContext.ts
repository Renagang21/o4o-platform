/**
 * Service Context — Unified Store Workspace 의 2차 축 (WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1 §8-4)
 *
 * 1차 축은 organizationId(선택된 매장)다. 그 매장이 등록한 서비스(enrollment)는 2차 축이며,
 * 백엔드 매장 API 는 여전히 서비스 mount(`/api/v1/kpa|cosmetics|pharmacy-hub/...`) 아래에 있으므로
 * 화면은 "지금 어느 서비스 문맥으로 호출하는가"만 정한다. 서비스 전환은 workspace 안의 문맥 전환이며 handoff 가 아니다.
 *
 *   - 공통 매장 업무(내 매장): 매장의 enrollment 중 canonical 우선순위(KPA → KCos → PH)로 **1개**를 공통 문맥으로 쓴다.
 *     (KPA 가 공통 기능의 reference implementation 이고 KCos 는 같은 o4o-store controller mount 를 쓴다.)
 *   - 서비스 업무(/work/:serviceKey): 그 서비스 문맥으로 호출한다.
 *
 * 모듈 전역 getter 를 두는 이유: KPA canonical 트리의 api 모듈들이 module-level 상수로 base URL 을 만들던 것을
 * 요청 시점 함수로 바꿨기 때문이다(React 밖에서도 읽을 수 있어야 한다). 값의 SSOT 는 StoreContext 가 set 한다.
 */

export type UnifiedServiceKey = 'kpa-society' | 'k-cosmetics' | 'pharmacy-hub';

/** canonical serviceKey → 백엔드 라우터 mount prefix (`/api/v1/<prefix>`) */
export const SERVICE_API_PREFIX: Readonly<Record<UnifiedServiceKey, string>> = Object.freeze({
  'kpa-society': 'kpa',
  'k-cosmetics': 'cosmetics',
  'pharmacy-hub': 'pharmacy-hub',
});

/** 일부 공통 API(콘텐츠 HUB · 미디어 · 구독)는 짧은 service 식별자를 쓴다 */
export const SERVICE_SHORT_KEY: Readonly<Record<UnifiedServiceKey, string>> = Object.freeze({
  'kpa-society': 'kpa',
  'k-cosmetics': 'cosmetics',
  'pharmacy-hub': 'pharmacy-hub',
});

export const SERVICE_LABEL: Readonly<Record<UnifiedServiceKey, string>> = Object.freeze({
  'kpa-society': 'KPA Society',
  'k-cosmetics': 'K-Cosmetics',
  'pharmacy-hub': 'PharmacyHub',
});

/** 공통 매장 업무의 문맥 우선순위 — KPA(reference) → KCos → PH */
export const COMMON_CONTEXT_PRIORITY: readonly UnifiedServiceKey[] = ['kpa-society', 'k-cosmetics', 'pharmacy-hub'];

export function isUnifiedServiceKey(v: unknown): v is UnifiedServiceKey {
  return v === 'kpa-society' || v === 'k-cosmetics' || v === 'pharmacy-hub';
}

export function pickCommonServiceContext(enrolled: readonly string[]): UnifiedServiceKey | null {
  for (const k of COMMON_CONTEXT_PRIORITY) if (enrolled.includes(k)) return k;
  return null;
}

/**
 * 서비스 지정 매장 화면(`/work/<serviceKey>/store/*`) — CHECK-O4O-URL-FIRST-CENSUS-V1 §21-13
 *
 * 각 서비스의 매장 경영자용 `/store` 를 store.neture.co.kr 로 옮길 때, 공통 `/store/*` 화면이 우선순위
 * (KPA → KCos → PH)가 아니라 **진입한 서비스**의 API 로 동작해야 한다. 진입 시 서비스를 세션에 고정하고,
 * 화면 안의 `/store/...` 링크로 이동해도 같은 서비스가 유지되게 한다(링크 수정 불요).
 * 고정값은 그 매장의 활성 서비스일 때만 쓰인다(StoreContext 가 검증) — 서버 권한 판정은 그대로다.
 */
export const SERVICE_SCOPE_STORAGE_KEY = 'o4o.store.serviceScope';

export function readServiceScope(): UnifiedServiceKey | null {
  try {
    const v = typeof window !== 'undefined' ? window.sessionStorage.getItem(SERVICE_SCOPE_STORAGE_KEY) : null;
    return isUnifiedServiceKey(v) ? v : null;
  } catch {
    return null;
  }
}

export function writeServiceScope(key: UnifiedServiceKey | null): void {
  try {
    if (typeof window === 'undefined') return;
    if (key) window.sessionStorage.setItem(SERVICE_SCOPE_STORAGE_KEY, key);
    else window.sessionStorage.removeItem(SERVICE_SCOPE_STORAGE_KEY);
  } catch {
    // storage 불가 — 이번 화면 문맥만 쓴다
  }
}

/**
 * 서비스 지정 매장 화면이 mount 된 서비스 — App.tsx 의 `/work/<key>/store` route 와 같은 목록이어야 한다.
 * 이 서비스로 고정된 상태에서 화면 안 `/store/...` 링크(약 69개)를 따라가면 `/work/<key>/store/...` 로
 * 바꿔 URL 에서 서비스가 드러나게 한다(§21-14). KPA(§21-13) · K-Cosmetics(§21-15).
 */
export const SERVICE_SCOPED_STORE_KEYS: readonly UnifiedServiceKey[] = ['kpa-society', 'k-cosmetics'];

/** `/store...` → `/work/<key>/store...` (고정 서비스에 mount 가 있을 때만, 아니면 null) */
export function toServiceScopedStorePath(scoped: UnifiedServiceKey | null, pathWithQuery: string): string | null {
  if (!scoped || !SERVICE_SCOPED_STORE_KEYS.includes(scoped)) return null;
  if (!(pathWithQuery === '/store' || /^\/store[/?#]/.test(pathWithQuery))) return null;
  return `/work/${scoped}${pathWithQuery}`;
}

/** 고정 서비스가 이 매장의 활성 서비스일 때만 그것을, 아니면 공통 우선순위 문맥을 쓴다. */
export function resolveEffectiveServiceKey(
  scoped: UnifiedServiceKey | null,
  workServiceKeys: readonly UnifiedServiceKey[],
): UnifiedServiceKey | null {
  if (scoped && workServiceKeys.includes(scoped)) return scoped;
  return pickCommonServiceContext(workServiceKeys);
}

/**
 * 매장 경영자 전용 화면 권한 — 각 서비스 앱의 owner-only 가드와 같은 규칙.
 *   KPA `PharmacyOwnerOnlyGuard` = `kpa:store_owner` 또는 플랫폼 역할(`kpa:admin` · `kpa:operator` · `platform:super_admin`).
 */
export function isServiceStoreOwner(roles: readonly string[] | undefined, serviceKey: UnifiedServiceKey): boolean {
  const short = SERVICE_SHORT_KEY[serviceKey];
  const allowed = [`${short}:store_owner`, `${short}:admin`, `${short}:operator`, 'platform:super_admin'];
  return (roles ?? []).some((r) => allowed.includes(r));
}

let activeServiceKey: UnifiedServiceKey | null = null;

/** StoreContext 만 호출한다 (매장 선택 · 서비스 업무 진입 시). */
export function setActiveServiceContext(key: UnifiedServiceKey | null): void {
  activeServiceKey = key;
}

/**
 * 서비스별 공개 웹 origin — 소비자용 공개 경로(`/qr/:slug` · `/tablet/*`)는 store.neture.co.kr 이
 * 아니라 **각 서비스 앱**이 서빙한다. 복사 · 미리보기 URL 을 `window.location.origin`(store 호스트)으로
 * 만들면 열리지 않는 주소가 된다(CHECK-O4O-URL-FIRST-CENSUS-V1 §7-6).
 * 서버의 QR 이미지 · 인쇄 URL(`qrPublicOrigin`)과 같은 호스트를 가리킨다.
 */
export const SERVICE_PUBLIC_ORIGIN: Readonly<Record<UnifiedServiceKey, string>> = Object.freeze({
  'kpa-society': 'https://kpa-society.co.kr',
  'k-cosmetics': 'https://k-cosmetics.site',
  'pharmacy-hub': 'https://pharmacyhub.co.kr',
});

export function getActiveServicePublicOrigin(): string {
  return SERVICE_PUBLIC_ORIGIN[getActiveServiceKey()];
}

export function getActiveServiceKey(): UnifiedServiceKey {
  // 문맥이 없으면 canonical reference(KPA) 로 둔다 — 백엔드가 enrollment 로 다시 거른다(403 → 화면 안내).
  return activeServiceKey ?? 'kpa-society';
}

export function getActiveServicePrefix(): string {
  return SERVICE_API_PREFIX[getActiveServiceKey()];
}

export function getActiveServiceShortKey(): string {
  return SERVICE_SHORT_KEY[getActiveServiceKey()];
}

import { API_BASE_URL as RAW_API_BASE } from './apiClient';

/** `${VITE_API_BASE_URL}/api/v1` (KPA 의 CORE_API_BASE_URL 과 동일한 규칙) */
export function apiV1Base(): string {
  return `${RAW_API_BASE}/api/v1`;
}

/** `${VITE_API_BASE_URL}/api/v1/<active service prefix>` — KPA 의 `/api/v1/kpa` 자리 */
export function apiV1Service(): string {
  return `${apiV1Base()}/${getActiveServicePrefix()}`;
}
