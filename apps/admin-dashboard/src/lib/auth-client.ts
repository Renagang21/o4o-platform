import { authClient } from '@o4o/auth-client';

const getAuthApiUrl = () => {
  const baseUrl = (import.meta.env.VITE_API_URL || 'https://api.neture.co.kr').replace(/\/+$/, '');
  if (baseUrl.endsWith('/api/v1')) return baseUrl;
  if (baseUrl.endsWith('/api')) return `${baseUrl}/v1`;
  return `${baseUrl}/api/v1`;
};

// Existing screens import the package singleton directly. Reuse that cookie
// client rather than adding another owner with an independent session generation.
authClient.api.defaults.baseURL = getAuthApiUrl();
export { authClient as adminAuthClient };
