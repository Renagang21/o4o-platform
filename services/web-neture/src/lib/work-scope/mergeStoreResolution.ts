/**
 * base WorkScope + 서버 매장 해석 → active WorkScope
 *
 * WO-O4O-WORK-SCOPE-STORE-RESOLUTION-V0 §11 · §16
 *
 * route 기반 resolver 를 **대체하지 않는다.** 구조는 다음과 같다:
 *
 *   route + auth        → base WorkScope        (resolveWorkScope, 기존 그대로)
 *   store workspace 면  → 서버 scope resolution
 *   merge               → active WorkScope      (이 파일)
 *
 * 반영 규칙(§16) — 어겨서는 안 되는 것:
 *   - 서버가 `resolved` 일 때만 organizationId/storeId 를 채운다.
 *   - `none` / `ambiguous` 에서는 둘 다 undefined 로 **유지**한다. 임의 fallback 금지.
 *   - base 가 이미 권한 문제로 막혀 있으면(server 호출 자체가 무의미) base 를 그대로 둔다.
 */

import type { StoreResolutionResult } from './storeResolutionApi';
import { STORE_SCOPED_WORKSPACES, type WorkScope } from './types';

/**
 * 서버 해석 결과를 base scope 에 합친다.
 *
 * @param base       route+auth 로 파생된 scope (변경하지 않는다 — 새 객체를 만든다)
 * @param resolution 서버 응답. `undefined` 면 아직 해석 전이라 base 를 그대로 둔다.
 */
export function mergeStoreResolution(
  base: WorkScope,
  resolution: StoreResolutionResult | undefined,
): WorkScope {
  if (!resolution) return base;

  // 서버가 다른 축을 답한 응답(경합 중 도착한 이전 요청 등)은 무시한다.
  if (resolution.workspace !== base.workspace || resolution.serviceKey !== base.serviceKey) {
    return base;
  }

  if (resolution.status === 'resolved' && resolution.organizationId && resolution.storeId) {
    return {
      ...base,
      status: 'resolved',
      reason: undefined,
      organizationId: resolution.organizationId,
      storeId: resolution.storeId,
    };
  }

  // none / ambiguous — 식별자는 비워 둔 채 서버 사유를 그대로 싣는다.
  return {
    ...base,
    status: resolution.status,
    reason: resolution.reason ?? base.reason,
    organizationId: undefined,
    storeId: undefined,
  };
}

/**
 * 서버 매장 해석을 호출해야 하는가.
 *
 * store 축이 아니거나 미인증이면 **호출하지 않는다** — 불필요한 요청도, 불필요한
 * 식별자 노출 시도도 만들지 않는다(§18 프런트 9·10·11).
 */
export function shouldResolveStore(base: WorkScope, isAuthenticated: boolean): boolean {
  return isAuthenticated && STORE_SCOPED_WORKSPACES.includes(base.workspace);
}
