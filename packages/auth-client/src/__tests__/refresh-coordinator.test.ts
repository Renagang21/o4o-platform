import { beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshStoredSession } from '../refresh-coordinator';
import { getAccessToken, getRefreshToken, storeTokens, clearAllTokens } from '../token-storage';

function deferred() {
  let resolve!: (value: unknown) => void; let reject!: (error: unknown) => void;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const response = (access = 'rotated-access', refresh = 'rotated-refresh') => ({ data: { accessToken: access, refreshToken: refresh } });
beforeEach(() => { localStorage.clear(); storeTokens({ accessToken: 'old-access', refreshToken: 'old-refresh' }); });

describe('shared refresh coordinator', () => {
  it('deduplicates AuthClient and fetch callers for the same origin/API', async () => {
    const network = deferred(); const axios = vi.fn(() => network.promise); const fetcher = vi.fn(() => network.promise);
    const a = refreshStoredSession('/shared-api', axios); const b = refreshStoredSession('/shared-api', fetcher);
    expect(a).toBe(b); expect(axios).toHaveBeenCalledTimes(1); expect(fetcher).not.toHaveBeenCalled();
    network.resolve(response()); expect(await a).toBe('rotated-access'); expect(getRefreshToken()).toBe('rotated-refresh');
  });
  it('a late refresh cannot restore a logged-out browser', async () => {
    const network = deferred(); const pending = refreshStoredSession('/logout-api', () => network.promise);
    clearAllTokens(); network.resolve(response()); expect(await pending).toBeNull(); expect(getAccessToken()).toBeNull();
  });
  it('a new login starts a separate refresh and is not overwritten by the old response', async () => {
    const old = deferred(); const newer = deferred();
    const a = refreshStoredSession('/identity-api', () => old.promise);
    storeTokens({ accessToken: 'new-login-access', refreshToken: 'new-login-refresh' });
    const b = refreshStoredSession('/identity-api', () => newer.promise);
    old.resolve(response('stale-access', 'stale-refresh')); expect(await a).toBeNull();
    expect(getAccessToken()).toBe('new-login-access');
    newer.resolve(response()); expect(await b).toBe('rotated-access');
  });
  it('an old 401 cannot clear a newer login', async () => {
    const old = deferred(); const a = refreshStoredSession('/stale-error-api', () => old.promise);
    storeTokens({ accessToken: 'new-login-access', refreshToken: 'new-login-refresh' });
    old.reject({ response: { status: 401 } }); expect(await a).toBeNull(); expect(getRefreshToken()).toBe('new-login-refresh');
  });
  it.each([undefined, 500, 503])('retryable network/server failure %s preserves the session', async (status) => {
    await expect(refreshStoredSession('/retryable-api', async () => { throw { status }; })).resolves.toBeNull();
    expect(getRefreshToken()).toBe('old-refresh');
  });
  it('a definitive current-session 401 clears tokens once', async () => {
    const listener = vi.fn(); window.addEventListener('auth:token-cleared', listener);
    try {
      await refreshStoredSession('/invalid-api', async () => { throw { status: 401 }; });
      expect(getAccessToken()).toBeNull(); expect(getRefreshToken()).toBeNull(); expect(listener).toHaveBeenCalledTimes(1);
    } finally { window.removeEventListener('auth:token-cleared', listener); }
  });
  it('fetch transport omits cookies and sends the captured refresh token', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(response()), { status: 200 }));
    try {
      await expect(refreshStoredSession('https://fixture.invalid/api/v1')).resolves.toBe('rotated-access');
      expect(fetcher).toHaveBeenCalledWith('https://fixture.invalid/api/v1/auth/refresh', expect.objectContaining({ credentials: 'omit', body: JSON.stringify({ refreshToken: 'old-refresh', includeLegacyTokens: true }) }));
    } finally { fetcher.mockRestore(); }
  });
});
