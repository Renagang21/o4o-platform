/**
 * Task ownership — 요청자 ≠ 소유자 (read-only 판정)
 *
 * WO-O4O-PERSONAL-ASSISTANT-PHASE-A-TASK-FOUNDATION-V1
 * 정본: `docs/baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md` §3-2 · §9-2
 *
 * 판정 로직을 새로 만들지 않는다. home-chat 이 매장 문맥을 확정할 때 쓰는 기존 SSOT 를 그대로 쓴다:
 *   - `resolveWorkScopeStore`        membership → 매장 축 → serviceKey 스코프 후보 → 1개만 resolved
 *   - `getServiceMembershipStatusFromDb`  비-매장 축의 serviceKey 확인
 *
 * 규칙
 *   workspace = 매장 축 + 매장 확정(resolved)   → ORGANIZATION (그 조직)
 *   그 밖 — 매장 미확정 · ambiguous 포함        → USER
 *   serviceKey 는 서버가 active membership 을 확인한 canonical 값만. 아니면 null.
 *
 * 클라이언트 `workScope` 에서는 **축 힌트(workspace · serviceKey)만** 읽는다. 클라이언트가 보낸
 * `organizationId` · `storeId` 는 읽지 않는다 — 소유 조직은 언제나 membership 에서 나온다.
 * 매장을 확정하지 못한 요청을 USER 로 두는 것은 "확정할 수 없으면 개인 업무" 일 뿐이며 권한을 넓히지 않는다
 * (Phase A 의 Task 소유는 실행 권한에 쓰이지 않는다 — 실행 문맥은 기존 work-agent 그대로).
 */

import type { DataSource } from 'typeorm';
import { resolveCanonicalServiceKey } from '@o4o/security-core';
import { getServiceMembershipStatusFromDb } from '../../utils/service-membership.js';
import { resolveWorkScopeStore, STORE_SCOPED_WORKSPACES } from '../../utils/work-scope-store-resolution.js';
import type { TaskOwnership } from './assistant-task-store.js';

const USER_ONLY: TaskOwnership = { scope: 'USER', organizationId: null, serviceKey: null };

/** 클라이언트 workScope 에서 축 힌트만 꺼낸다. */
export function readWorkScopeHint(workScope: unknown): { workspace: string; serviceKey: string } {
  const s = workScope && typeof workScope === 'object' ? (workScope as Record<string, unknown>) : {};
  return {
    workspace: typeof s.workspace === 'string' ? s.workspace : 'home',
    serviceKey: typeof s.serviceKey === 'string' ? s.serviceKey : '',
  };
}

export async function resolveTaskOwnership(
  dataSource: DataSource,
  input: { userId: string; workScope?: unknown },
): Promise<TaskOwnership> {
  const hint = readWorkScopeHint(input.workScope);

  if (STORE_SCOPED_WORKSPACES.includes(hint.workspace)) {
    const r = await resolveWorkScopeStore(dataSource, {
      userId: input.userId,
      serviceKey: hint.serviceKey,
      workspace: hint.workspace,
    });
    if (r.status === 'resolved' && r.organizationId) {
      return { scope: 'ORGANIZATION', organizationId: r.organizationId, serviceKey: r.serviceKey || null };
    }
    // membership 단계를 통과한 경우에만(=매장이 0개 · 여럿 · 매장 축 없음) serviceKey 가 확인된 값이다.
    const membershipVerified = r.reason !== 'NO_SERVICE_MEMBERSHIP' && !!r.serviceKey;
    return { scope: 'USER', organizationId: null, serviceKey: membershipVerified ? r.serviceKey : null };
  }

  if (!hint.serviceKey) return USER_ONLY;
  const canonical = resolveCanonicalServiceKey(hint.serviceKey);
  const membership = await getServiceMembershipStatusFromDb(dataSource, input.userId, canonical);
  return { scope: 'USER', organizationId: null, serviceKey: membership === 'active' ? canonical : null };
}
