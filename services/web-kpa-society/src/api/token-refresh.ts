/**
 * Token Refresh Utility
 *
 * KPA ApiClient / Dashboard API 가 401 응답을 받았을 때
 * 토큰 갱신을 시도하고, 실패 시 인증 상태를 정리하는 공통 유틸리티.
 *
 * - 동시 호출 시 단일 Promise로 병합 (in-flight dedup)
 * - 갱신 성공 → 새 accessToken 반환
 * - 갱신 실패(서버 거부) → clearAllTokens + auth:token-cleared 이벤트
 * - 네트워크 오류 → 토큰 유지 (오프라인일 수 있음)
 */

import { getRefreshToken, clearAllTokens } from '@o4o/auth-client';

// Token storage keys (from @o4o/auth-client/token-storage SSOT)
const TOKEN_KEY = 'o4o_accessToken';
const REFRESH_TOKEN_KEY = 'o4o_refreshToken';

const AUTH_API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1`
  : '/api/v1';

let _refreshPromise: Promise<string | null> | null = null;

/**
 * 토큰 갱신 시도.
 * - 성공: 새 accessToken 문자열 반환
 * - 실패: null 반환 (+ 토큰 정리)
 */
export async function tryRefreshToken(): Promise<string | null> {
  // 진행 중인 갱신이 있으면 그 결과를 공유
  if (_refreshPromise) return _refreshPromise;

  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  _refreshPromise = (async () => {
    try {
      const res = await fetch(`${AUTH_API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken, includeLegacyTokens: true }),
      });

      if (!res.ok) {
        // 서버가 명시적으로 거부 → 토큰 무효화
        clearAllTokens();
        window.dispatchEvent(new Event('auth:token-cleared'));
        return null;
      }

      const data = await res.json();
      const { accessToken, refreshToken: newRefresh } = data;

      if (accessToken) {
        localStorage.setItem(TOKEN_KEY, accessToken);
        if (newRefresh) {
          localStorage.setItem(REFRESH_TOKEN_KEY, newRefresh);
        }
        return accessToken as string;
      }

      return null;
    } catch {
      // 네트워크 오류 → 토큰 유지 (오프라인일 수 있음)
      return null;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}
