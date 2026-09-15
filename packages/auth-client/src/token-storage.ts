/**
 * Token Storage Utilities - SSOT for localStorage Token Management
 * =================================================================
 *
 * This is the ONLY authorized way to store/retrieve access tokens in O4O Platform.
 *
 * Standard Key: `o4o_accessToken`
 *
 * @see docs/architecture/auth-ssot-declaration.md
 * @see CLAUDE.md Section 2.6
 *
 * MIGRATION NOTE (WO-O4O-NETURE-AUTH-ERROR-CONTRACT-AND-LEGACY-TOKEN-RECOVERY-FIX-V1):
 * - 읽기는 표준 키(`o4o_accessToken` / `o4o_refreshToken`) 만 본다. 과거 키(accessToken · authToken · token ·
 *   refreshToken) 와 `admin-auth-storage` 의 **읽기 시점 자동 이관은 제거**했다.
 *   이유: 다른 탭의 clearAllTokens() 가 키를 순차 삭제하는 동안 storage 이벤트로 깨어난 탭이 getAccessToken() 을
 *   호출하면 아직 남은 legacy 저장소에서 토큰을 되살려 표준 키에 다시 써 넣어 로그아웃이 되돌려졌다.
 *   localStorage 전략 서비스(neture · k-cosmetics · kpa-branch · kpa-society · pharmacy-hub) 중 legacy 키를
 *   기록하는 곳은 없고(admin-dashboard 는 별도 origin · 별도 store), 이 fallback 의 유일한 공급원은
 *   updateAuthStorage() 가 스스로 쓴 `admin-auth-storage` 였다 — 즉 이관이 필요한 실제 소비처는 없다.
 * - 쓰기는 표준 키에만 한다. clearAllTokens() 는 legacy 키·`admin-auth-storage` 도 함께 지운다(정리 목적).
 *
 * ============================================================================
 * Phase 6-7: Cookie Auth Primary
 * ============================================================================
 *
 * IMPORTANT: These utilities should only be used with localStorage strategy.
 * For Cookie strategy (default), tokens are stored in httpOnly cookies and
 * these functions are not needed.
 *
 * Usage:
 * - AuthClient({ strategy: 'localStorage' }): Use these utilities
 * - AuthClient({ strategy: 'cookie' }): Do NOT use these utilities
 *
 * @see docs/architecture/auth-ssot-declaration.md (Phase 6-7)
 */

// Standard token keys - SINGLE SOURCE OF TRUTH
const TOKEN_KEY = 'o4o_accessToken';
const REFRESH_TOKEN_KEY = 'o4o_refreshToken';

// Legacy keys for backward-compatible reads only
const LEGACY_TOKEN_KEYS = ['accessToken', 'authToken', 'token'] as const;
const LEGACY_REFRESH_TOKEN_KEY = 'refreshToken';

/**
 * Get access token from localStorage
 * 표준 키만 읽는다 — 읽기는 저장소를 변경하지 않는다 (legacy 자동 이관 제거, 상단 MIGRATION NOTE 참조).
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY) || null;
}

/**
 * Set access token in localStorage
 * Only writes to standard key - NO duplicate storage
 */
export function setAccessToken(token: string): void {
  if (typeof window === 'undefined') return;

  // Write ONLY to standard key
  localStorage.setItem(TOKEN_KEY, token);

  // Remove legacy keys to prevent confusion (migration cleanup)
  for (const key of LEGACY_TOKEN_KEYS) {
    localStorage.removeItem(key);
  }
}

/**
 * Get refresh token from localStorage
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  // 표준 키만 읽는다 — legacy `refreshToken` 키 자동 이관 제거 (getAccessToken 과 동일한 이유)
  return localStorage.getItem(REFRESH_TOKEN_KEY) || null;
}

/**
 * Set refresh token in localStorage
 */
export function setRefreshToken(token: string): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(REFRESH_TOKEN_KEY, token);

  // Remove legacy key
  localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
}

/**
 * Clear all authentication tokens from all storage locations
 * Use this for logout
 */
export function clearAllTokens(): void {
  if (typeof window === 'undefined') return;

  // 인증 키만 개별 삭제한다 — localStorage.clear() 로 무관한 사용자 설정을 지우지 않는다.
  // 다른 탭은 TOKEN_KEY 삭제 storage 이벤트로 로그아웃을 인지하므로 표준 키를 먼저 지운다
  // (읽기가 legacy 저장소를 보지 않으므로 이후 순서는 로그인 상태에 영향을 주지 않는다).
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);

  // Remove all legacy keys
  for (const key of LEGACY_TOKEN_KEYS) {
    localStorage.removeItem(key);
  }
  localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
  localStorage.removeItem('admin-auth-storage');
  localStorage.removeItem('user');

  // Also clear any cookies if present
  if (typeof document !== 'undefined') {
    document.cookie = 'accessToken=; Max-Age=0; path=/';
    document.cookie = 'refreshToken=; Max-Age=0; path=/';
  }
}

/**
 * Update admin-auth-storage structure (for backward compatibility)
 */
export function updateAuthStorage(accessToken: string, refreshToken?: string, user?: any): void {
  if (typeof window === 'undefined') return;

  const authStorage = {
    state: {
      user,
      token: accessToken,
      accessToken: accessToken,
      refreshToken: refreshToken,
      isAuthenticated: true
    }
  };
  localStorage.setItem('admin-auth-storage', JSON.stringify(authStorage));
}

/**
 * Check if user has valid access token
 */
export function hasAccessToken(): boolean {
  return getAccessToken() !== null;
}

// Export constants for reference (read-only)
export const TOKEN_STORAGE_CONFIG = {
  standardKey: TOKEN_KEY,
  refreshKey: REFRESH_TOKEN_KEY,
  legacyKeys: LEGACY_TOKEN_KEYS,
} as const;

// ============================================================================
// High-level helpers (WO-O4O-AUTH-CLIENT-API-HARDENING-V1)
// ============================================================================

/**
 * Composite: store both tokens + update legacy auth storage
 * Use this instead of calling setAccessToken/setRefreshToken/updateAuthStorage individually.
 */
export function storeTokens(tokens: { accessToken: string; refreshToken?: string }): void {
  setAccessToken(tokens.accessToken);
  if (tokens.refreshToken) {
    setRefreshToken(tokens.refreshToken);
  }
  updateAuthStorage(tokens.accessToken, tokens.refreshToken);
}

/** Semantic alias for clearAllTokens */
export const clearStoredTokens = clearAllTokens;

/**
 * Check & restore stored tokens (for session init).
 * Returns null if no access token is stored.
 */
export function restoreStoredTokens(): { accessToken: string; refreshToken: string | null } | null {
  const accessToken = getAccessToken();
  if (!accessToken) return null;
  return { accessToken, refreshToken: getRefreshToken() };
}
