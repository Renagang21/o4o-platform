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
 */

// Standard token key - SINGLE SOURCE OF TRUTH
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
 * Clear access token from localStorage
 * Removes both standard and legacy keys for complete cleanup
 */
export function clearAccessToken(): void {
  if (typeof window === 'undefined') return;

  // Remove standard key
  localStorage.removeItem(TOKEN_KEY);

  // Remove all legacy keys
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
 * Clear refresh token from localStorage
 */
export function clearRefreshToken(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
}

/**
 * Clear all authentication tokens
 * Use this for logout
 */
export function clearAllTokens(): void {
  clearAccessToken();
  clearRefreshToken();

  // Also clear admin-auth-storage for complete cleanup
  if (typeof window !== 'undefined') {
    localStorage.removeItem('admin-auth-storage');
    localStorage.removeItem('user');
  }
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
