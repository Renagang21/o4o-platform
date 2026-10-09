import { AuthClient } from '@o4o/auth-client';

const getAuthApiUrl = () => {
  const baseUrl = (import.meta.env.VITE_API_URL || 'https://api.neture.co.kr').replace(/\/+$/, '');
  if (baseUrl.endsWith('/api/v1')) return baseUrl;
  if (baseUrl.endsWith('/api')) return `${baseUrl}/v1`;
  return `${baseUrl}/api/v1`;
};

/** AuthProvider and business API retries share the same cookie/session generation. */
export const adminAuthClient = new AuthClient(getAuthApiUrl(), { strategy: 'cookie' });
