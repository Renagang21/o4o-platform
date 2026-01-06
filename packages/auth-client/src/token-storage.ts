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
 * MIGRATION NOTE:
 * - Legacy keys (accessToken, authToken, token) are read for backward compatibility
 * - All writes go to `o4o_accessToken` only
 * - Legacy keys will be removed in future versions
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
 * Reads from standard key first, falls back to legacy keys for migration
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;

  // Try standard key first
  const standardToken = localStorage.getItem(TOKEN_KEY);
  if (standardToken) return standardToken;

  // Fallback to legacy keys for backward compatibility
  for (const key of LEGACY_TOKEN_KEYS) {
    const legacyToken = localStorage.getItem(key);
    if (legacyToken) {
      // Auto-migrate to standard key
      localStorage.setItem(TOKEN_KEY, legacyToken);
      return legacyToken;
    }
  }

  // Also check admin-auth-storage for token
  const authStorage = localStorage.getItem('admin-auth-storage');
  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage);
      const token = parsed.state?.accessToken || parsed.state?.token;
      if (token) {
        // Auto-migrate to standard key
        localStorage.setItem(TOKEN_KEY, token);
        return token;
      }
    } catch {
      // Ignore parse errors
    }
  }

  return null;
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

  // Try standard key first
  const standardToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (standardToken) return standardToken;

  // Fallback to legacy key
  const legacyToken = localStorage.getItem(LEGACY_REFRESH_TOKEN_KEY);
  if (legacyToken) {
    // Auto-migrate to standard key
    localStorage.setItem(REFRESH_TOKEN_KEY, legacyToken);
    return legacyToken;
  }

  return null;
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

  // Remove standard keys
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
