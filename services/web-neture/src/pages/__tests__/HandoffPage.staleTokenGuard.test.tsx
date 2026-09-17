/**
 * WO-O4O-AUTH-REFRESH-TOKEN-FAMILY-CONTINUITY-AND-HANDOFF-STALE-TOKEN-GUARD-V1
 *
 * `/handoff` 착지 시 낡은 토큰이 부모 AuthProvider 의 세션 복구(`/auth/me` → refresh) 를
 * 일으키기 **전에** 제거되는 실행 순서를 고정한다.
 *
 * 실제 `AuthProvider`(→ `@o4o/auth-react` useServiceAuth) · 실제 `@o4o/auth-client` 저장소 헬퍼 ·
 * 실제 `HandoffPage` 를 쓴다. 네트워크만 대역이다(`lib/apiClient` 의 authClient · `fetch`).
 *
 * 증명하는 것:
 *   1. stale 토큰이 있어도 `/auth/me` 가 단 한 번도 나가지 않는다 (useLayoutEffect 가 useEffect 보다 먼저)
 *   2. exchange 요청이 나가는 시점에 저장소는 이미 비어 있다
 *   3. exchange 성공 후 새 토큰이 저장되고 guard 가 다시 지우지 않는다 → returnTo 로 이동
 *   4. exchange 실패 시 stale 토큰은 되살아나지 않는다
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';

const { apiGet } = vi.hoisted(() => ({
  apiGet: vi.fn(async () => ({ data: { data: { user: { id: 'u', email: 'x@y' } } } })),
}));
vi.mock('../../lib/apiClient', () => ({
  API_BASE_URL: 'https://api.test',
  authClient: { api: { get: apiGet, post: vi.fn() }, login: vi.fn(), logout: vi.fn() },
}));

import { AuthProvider } from '../../contexts/AuthContext';
import HandoffPage from '../HandoffPage';

const AT = 'o4o_accessToken';
const RT = 'o4o_refreshToken';

function seedStaleTokens() {
  localStorage.setItem(AT, 'stale-access');
  localStorage.setItem(RT, 'stale-refresh');
}

describe('HandoffPage stale-token guard 실행 순서', () => {
  const replace = vi.fn();
  let fetchMock: ReturnType<typeof vi.fn>;
  let storageAtExchange: { at: string | null; rt: string | null } | null;

  beforeEach(() => {
    localStorage.clear();
    apiGet.mockClear();
    replace.mockClear();
    storageAtExchange = null;
    // jsdom 의 location 은 대체 불가 → 필요한 필드만 가진 객체로 바꾼다.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { search: '?token=h-1&returnTo=/store', replace, href: 'https://neture.test/handoff' },
    });
    fetchMock = vi.fn(async () => {
      storageAtExchange = { at: localStorage.getItem(AT), rt: localStorage.getItem(RT) };
      return {
        ok: true,
        json: async () => ({ success: true, data: { tokens: { accessToken: 'new-access', refreshToken: 'new-refresh' } } }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('stale 토큰 존재 → /auth/me 0회 · exchange 시점 저장소 비어 있음 · 새 토큰 저장 후 returnTo', async () => {
    seedStaleTokens();

    render(
      <AuthProvider>
        <HandoffPage />
      </AuthProvider>,
    );

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/store'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain('/api/v1/auth/handoff/exchange');
    expect(storageAtExchange).toEqual({ at: null, rt: null });
    expect(apiGet).not.toHaveBeenCalled();
    expect(localStorage.getItem(AT)).toBe('new-access');
    expect(localStorage.getItem(RT)).toBe('new-refresh');
  });

  it('exchange 실패 → stale 토큰은 되살아나지 않고 /auth/me 도 나가지 않는다', async () => {
    seedStaleTokens();
    fetchMock.mockImplementationOnce(async () => ({
      ok: false,
      json: async () => ({ success: false, code: 'HANDOFF_TOKEN_INVALID' }),
    }));

    const { findByText } = render(
      <AuthProvider>
        <HandoffPage />
      </AuthProvider>,
    );

    await findByText(/이동 링크가 만료되었거나/);
    expect(localStorage.getItem(AT)).toBeNull();
    expect(localStorage.getItem(RT)).toBeNull();
    expect(apiGet).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
