/**
 * Service Handoff Page
 *
 * WO-O4O-SERVICE-HANDOFF-ARCHITECTURE-V1
 * WO-O4O-NETURE-UNIFIED-ENTRY-UI-PHASE1-V1 (수신 정합):
 *   - 이 앱은 `@o4o/auth-client` localStorage 전략이므로 exchange 응답 body 의
 *     `data.tokens.{accessToken,refreshToken}` 를 SSOT key 로 저장한다 (쿠키만으로는 세션 복원 불가).
 *   - `returnTo`(상대 경로) 가 있으면 교환 후 그 화면으로, 없으면 홈으로 이동한다.
 *   - exchange 는 공개 endpoint 라 `fetch` 로 직접 호출한다 — authClient 인터셉터가
 *     401(만료·무효 토큰)을 refresh 시도로 오해해 기존 세션을 지우는 일을 막는다.
 *   - 토큰 값은 어떤 로그·화면에도 남기지 않는다.
 *   - WO-O4O-AUTH-REFRESH-TOKEN-FAMILY-CONTINUITY-AND-HANDOFF-STALE-TOKEN-GUARD-V1:
 *     `/handoff` 착지 origin 에 이전 세션의 낡은 토큰이 남아 있으면 부모 AuthProvider 의 세션 복구가
 *     그 토큰으로 `/auth/me` → 401 → `/auth/refresh` 를 쏘고, stale refresh 가 서버 family 를 null 로
 *     만들어 exchange 가 승계할 family 가 사라진다(출발 서비스 세션 즉시 소실). 그래서 exchange **전에**
 *     `useLayoutEffect` 로 저장 토큰을 선제 제거한다 — layout effect 는 모든 passive effect(AuthProvider
 *     의 `useEffect` 복구) 보다 먼저 실행되므로 낡은 토큰으로 `/auth/me` 가 나가지 않는다.
 *
 * URL: /handoff?token={handoffToken}[&returnTo=/relative/path]
 */

import { HandoffEntryPage } from '@o4o/auth-react';
import { API_BASE_URL } from '../lib/apiClient';

const ERROR_MESSAGES: Record<string, string> = {
  HANDOFF_TOKEN_INVALID: '이동 링크가 만료되었거나 이미 사용되었습니다. 다시 로그인해 주세요.',
  HANDOFF_TARGET_NO_MEMBERSHIP: '이 서비스에 가입되어 있지 않습니다.',
  HANDOFF_TARGET_WITHDRAWN: '탈퇴한 서비스는 이동할 수 없습니다.',
  HANDOFF_TARGET_NOT_ACTIVE: '이 서비스 이용이 아직 승인되지 않았거나 정지 상태입니다.',
  INVALID_USER: '계정을 확인할 수 없습니다. 다시 로그인해 주세요.',
  // WO-O4O-REPRESENTATIVE-ENTRY-RETURN-HANDOFF-AND-HOME-NAVIGATION-V1
  HANDOFF_SESSION_REVOKED: '로그인 세션이 종료되었습니다. 다시 로그인해 주세요.',
  ACCOUNT_NOT_ACTIVE: '이용할 수 없는 계정 상태입니다.',
};

export default function HandoffPage() {
  return <HandoffEntryPage apiBaseUrl={API_BASE_URL} errorMessages={ERROR_MESSAGES} />;
}
