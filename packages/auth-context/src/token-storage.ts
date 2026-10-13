/** Compatibility import path; auth-client owns all localStorage token operations. */
export {
  getAccessToken, getRefreshToken, setAccessToken, setRefreshToken,
  clearAllTokens, hasAccessToken, TOKEN_STORAGE_CONFIG,
} from '@o4o/auth-client';
