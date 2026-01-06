/**
 * Token Storage Utilities for glycopharm-web
 * ============================================
 *
 * MIGRATION: This service is migrating to O4O Platform standard token storage.
 *
 * Standard Key: `o4o_accessToken`
 * Legacy Key: `glycopharm_token` (read-only for backward compatibility)
 *
 * @see docs/architecture/auth-ssot-declaration.md
 * @see CLAUDE.md Section 2.6
 */

// Standard token key - SINGLE SOURCE OF TRUTH
const TOKEN_KEY = 'o4o_accessToken';
const USER_KEY = 'glycopharm_user'; // Keep user data in service-specific key

// Legacy keys for backward-compatible reads only
const LEGACY_TOKEN_KEY = 'glycopharm_token';

/**
 * Get access token from localStorage
 * Reads from standard key first, falls back to legacy key for migration
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;

  // Try standard key first
  const standardToken = localStorage.getItem(TOKEN_KEY);
  if (standardToken) return standardToken;

  // Fallback to legacy key for backward compatibility
  const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY);
  if (legacyToken) {
    // Auto-migrate to standard key
    localStorage.setItem(TOKEN_KEY, legacyToken);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    return legacyToken;
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

  // Remove legacy key to prevent confusion
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

/**
 * Clear access token from localStorage
 */
export function clearAccessToken(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

/**
 * Get stored user data
 */
export function getStoredUser(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_KEY);
}

/**
 * Set user data
 */
export function setStoredUser(user: object): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Clear user data
 */
export function clearStoredUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_KEY);
}

/**
 * Clear all auth data
 */
export function clearAllAuthData(): void {
  clearAccessToken();
  clearStoredUser();
}

/**
 * Check if user has valid access token
 */
export function hasAccessToken(): boolean {
  return getAccessToken() !== null;
}
