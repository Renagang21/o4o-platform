import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { adminAuthClient } from '../lib/auth-client';
import { unifiedApi } from '../api/unified-client';

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));

describe('whole-platform admin cookie authentication', () => {
  beforeEach(() => localStorage.clear());

  it.each([200, 503])('cookie refresh %s uses the provider client and preserves cache on transient failure', async status => {
    const cache = JSON.stringify({ state: { user: { id: 'synthetic-admin' } } });
    localStorage.setItem('admin-auth-storage', cache);
    // Stale tokens from older clients must not override the current cookie.
    localStorage.setItem('o4o_accessToken', 'stale-bearer');
    const calls: string[] = [];
    let refreshed = false;
    const adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
      calls.push(config.url!);
      expect(config.headers.Authorization).toBeUndefined();
      const refresh = config.url === '/auth/refresh';
      const code = refresh ? status : refreshed ? 200 : 401;
      const response: AxiosResponse = { config, status: code, statusText: '', headers: {},
        data: { success: code === 200, data: refresh ? { expiresIn: 900 } : { items: [] } } };
      if (code >= 400) throw new AxiosError('fixture failure', undefined, config, undefined, response);
      if (refresh) refreshed = true;
      return response;
    };
    unifiedApi.raw.defaults.adapter = adapter;
    adminAuthClient.api.defaults.adapter = adapter;
    const cleared = vi.fn(); window.addEventListener('auth:token-cleared', cleared);
    try {
      const request = unifiedApi.raw.get('/v1/platform/apps');
      if (status === 200) await expect(request).resolves.toMatchObject({ status: 200 });
      else await expect(request).rejects.toMatchObject({ response: { status: 503 } });
      expect(calls.filter(url => url === '/auth/refresh')).toHaveLength(1);
      expect(localStorage.getItem('admin-auth-storage')).toBe(cache);
      expect(cleared).not.toHaveBeenCalled();
    } finally { window.removeEventListener('auth:token-cleared', cleared); }
  });
});
