import { clearAllTokens, getRefreshToken, storeTokens } from './token-storage.js';

type Tokens = { accessToken?: string; refreshToken?: string };
type RefreshRequest = (refreshToken: string) => Promise<unknown>;
const pending = new Map<string, { refreshToken: string; promise: Promise<string | null> }>();

/** One refresh per origin/API, shared by AuthClient and service fetch wrappers. */
export function refreshStoredSession(apiBase: string, request?: RefreshRequest): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return Promise.resolve(null);
  const existing = pending.get(apiBase);
  if (existing?.refreshToken === refreshToken) return existing.promise;
  const entry = { refreshToken, promise: Promise.resolve<string | null>(null) };
  entry.promise = (async () => {
    try {
      const data = request ? await request(refreshToken) : await requestWithFetch(apiBase, refreshToken);
      if (getRefreshToken() !== refreshToken) return null; // logout, another tab, or a newer login
      const result = data as { data?: { tokens?: Tokens } & Tokens; tokens?: Tokens } & Tokens;
      const tokens = result?.data?.tokens ?? result?.data ?? result?.tokens ?? result;
      if (!tokens?.accessToken || !tokens.refreshToken) return null;
      storeTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      return tokens.accessToken;
    } catch (error) {
      const failure = error as { status?: number; response?: { status?: number } };
      const status = failure.status ?? failure.response?.status;
      // Network and server failures are retryable; an old request cannot clear a newer login.
      if ((status === 401 || status === 403) && getRefreshToken() === refreshToken) {
        clearAllTokens();
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('auth:token-cleared'));
      }
      return null;
    } finally {
      if (pending.get(apiBase) === entry) pending.delete(apiBase);
    }
  })();
  pending.set(apiBase, entry);
  return entry.promise;
}

async function requestWithFetch(apiBase: string, refreshToken: string): Promise<unknown> {
  const response = await fetch(`${apiBase}/auth/refresh`, {
    method: 'POST', credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken, includeLegacyTokens: true }),
  });
  if (!response.ok) throw Object.assign(new Error('Refresh failed'), { status: response.status });
  return response.json();
}
