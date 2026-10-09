import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn(async () => null) }));
vi.mock('@o4o/auth-client', () => ({ refreshStoredSession: refresh }));
beforeEach(() => { vi.resetModules(); refresh.mockClear(); });
afterEach(() => vi.unstubAllEnvs());

describe.each(['store', 'pharmacy'])('%s refresh endpoint configuration', service => {
  const load = () => service === 'store'
    ? import('../../../../services/web-store/src/api/token-refresh')
    : import('../../../../services/web-kpa-society/src/api/token-refresh');

  it('keeps same-origin /api/v1 when no API base is configured', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    await (await load()).tryRefreshToken();
    expect(refresh).toHaveBeenCalledWith('/api/v1');
  });

  it('uses the configured API base', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://synthetic.example.test');
    await (await load()).tryRefreshToken();
    expect(refresh).toHaveBeenCalledWith('https://synthetic.example.test/api/v1');
  });
});
