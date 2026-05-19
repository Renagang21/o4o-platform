/**
 * Auth Runtime Event Name Constants
 *
 * WO-O4O-AUTH-RUNTIME-ORCHESTRATION-STABILIZATION-V1:
 * auth:token-cleared 이벤트는 @o4o/auth-client 내부(token-refresh)에서 발행하며
 * KPA AuthContext에서 이미 구독 중. 이벤트 이름을 공통 상수로 추출하여
 * 서비스별 하드코딩을 제거한다.
 *
 * 사용:
 *   window.addEventListener(AUTH_TOKEN_CLEARED_EVENT, () => setUser(null));
 *   window.removeEventListener(AUTH_TOKEN_CLEARED_EVENT, handler);
 */

/**
 * token refresh 실패 시 auth-client가 dispatchEvent로 발행하는 이벤트 이름.
 * 구독 시 user 상태를 null로 초기화하여 stale auth 상태를 정리해야 한다.
 */
export const AUTH_TOKEN_CLEARED_EVENT = 'auth:token-cleared' as const;
