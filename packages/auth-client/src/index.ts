// Authentication client exports
export * from './types.js';
export * from './client.js';
// WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1: CookieAuthClient(/auth/cookie/login · register) 는 은퇴했다.
export * from './sso-client.js';
// Google Identity Services loader (WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1)
export * from './google-identity.js';

// Token storage utilities (for localStorage strategy)
export {
  getAccessToken, getRefreshToken, clearAllTokens,
  setAccessToken, setRefreshToken, updateAuthStorage,
  storeTokens, clearStoredTokens, restoreStoredTokens,
  hasAccessToken, TOKEN_STORAGE_CONFIG,
} from './token-storage.js';

// RBAC utilities
export * from './rbac.js';

// React hooks
export * from './hooks.js';