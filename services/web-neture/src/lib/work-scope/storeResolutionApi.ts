/**
 * Work Scope — 매장 scope 서버 해석 클라이언트
 *
 * WO-O4O-WORK-SCOPE-STORE-RESOLUTION-V0
 *
 * 프런트는 `organizationId` / `storeId` 를 **추측하지 않는다.** 서버가 기존
 * membership · store-organization resolver 로 확정한 값만 받아 쓴다.
 *
 * 사용자 id 를 보내지 않는다 — 서버가 세션에서 판단한다(§14).
 */

import { api } from '../apiClient';
import type { WorkScopeReason, WorkScopeStatus, Workspace } from './types';

/** 서버 응답 `data` 형상. `apps/api-server/src/utils/work-scope-store-resolution.ts` 와 1:1. */
export interface StoreResolutionResult {
  status: WorkScopeStatus;
  serviceKey: string;
  workspace: string;
  organizationId: string | null;
  storeId: string | null;
  reason: WorkScopeReason | null;
}

/**
 * 현재 사용자의 매장 scope 를 서버에 묻는다.
 *
 * 실패(네트워크·5xx)는 던지지 않고 **안전한 미해석**으로 접는다 — scope 해석 실패가
 * 화면을 깨뜨리면 안 되고, 무엇보다 실패를 "매장 있음"으로 오해하면 안 된다.
 */
export async function fetchStoreResolution(
  serviceKey: string,
  workspace: Workspace,
): Promise<StoreResolutionResult> {
  const res = await api.get('/work-scope/store-resolution', {
    params: { serviceKey, workspace },
  });

  const data = res?.data?.data as StoreResolutionResult | undefined;
  if (!data || typeof data.status !== 'string') {
    return {
      status: 'none',
      serviceKey,
      workspace,
      organizationId: null,
      storeId: null,
      reason: 'STORE_IDENTITY_SERVER_ONLY',
    };
  }
  return data;
}
