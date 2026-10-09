/**
 * Service Handoff Page
 *
 * WO-O4O-SERVICE-HANDOFF-ARCHITECTURE-V1
 * Receives a handoff token from another O4O service and exchanges it
 * for authentication tokens on this domain (localStorage-based).
 *
 * WO-O4O-AUTH-REFRESH-TOKEN-FAMILY-CONTINUITY-AND-HANDOFF-STALE-TOKEN-GUARD-V1:
 *   `/handoff` 착지 origin 에 이전 세션의 낡은 토큰이 남아 있으면 부모 AuthProvider 의 세션 복구가
 *   그 토큰으로 `/auth/me` → 401 → `/auth/refresh` 를 쏘고, stale refresh 가 서버 family 를 null 로
 *   만들어 exchange 가 승계할 family 가 사라진다(출발 서비스 세션 즉시 소실). 그래서 exchange **전에**
 *   `useLayoutEffect` 로 저장 토큰을 선제 제거한다 — layout effect 는 모든 passive effect(AuthProvider
 *   의 `useEffect` 복구) 보다 먼저 실행된다. 이 순서가 성립하려면 이 페이지는 `lazy()` 가 아니라
 *   정적 import 로 마운트돼야 한다 (App.tsx).
 *
 * URL: /handoff?token={handoffToken}
 */

import { HandoffEntryPage, type HandoffFailure } from '@o4o/auth-react';
import { semiFranchiseAccessLink } from '../lib/semiFranchiseAccess';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

const ERROR_MESSAGES: Record<string, string> = {
  HANDOFF_TOKEN_INVALID: '이동 링크가 만료되었거나 이미 사용되었습니다. 다시 로그인해 주세요.',
  HANDOFF_TARGET_NO_MEMBERSHIP: '이 서비스에 가입되어 있지 않습니다.',
  HANDOFF_TARGET_WITHDRAWN: '탈퇴한 서비스는 이동할 수 없습니다.',
  HANDOFF_TARGET_NOT_ACTIVE: '이 서비스 이용이 아직 승인되지 않았거나 정지 상태입니다.',
  INVALID_USER: '계정을 확인할 수 없습니다. 다시 로그인해 주세요.',
};

function resolvePharmacyFailure(data: unknown): HandoffFailure | null {
  if (!data || typeof data !== 'object') return null;
  const response = data as { error?: unknown; serviceAccess?: { next?: string | null } };
  if (!response.serviceAccess || typeof response.error !== 'string') return null;
  return { message: response.error, link: semiFranchiseAccessLink(response.serviceAccess.next) ?? undefined };
}

export default function HandoffPage() {
  return <HandoffEntryPage
    apiBaseUrl={API_BASE_URL}
    errorMessages={ERROR_MESSAGES}
    resolveFailure={resolvePharmacyFailure}
    showSpinner={false}
    missingTokenMessage="핸드오프 토큰이 없습니다."
    networkErrorMessage="네트워크 오류가 발생했습니다."
  />;
}
