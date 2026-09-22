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

let activeServiceKey: UnifiedServiceKey | null = null;

/** StoreContext 만 호출한다 (매장 선택 · 서비스 업무 진입 시). */
export function setActiveServiceContext(key: UnifiedServiceKey | null): void {
  activeServiceKey = key;
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
