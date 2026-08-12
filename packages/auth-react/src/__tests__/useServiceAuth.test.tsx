/**
 * useServiceAuth 회귀검증
 *
 * WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-V1
 *
 * 5개 서비스 AuthContext 가 공유하게 된 계약을 고정한다.
 * **실제 계정 로그인 성공은 여기서 검증하지 않는다** — 그건 실 API 경로이며
 * 현재 Identity V2 credential 문제로 별도 추적 중이다(CHECK 참조).
 * 여기서 보증하는 것은 "authClient 가 이렇게 답하면 Core 가 이렇게 상태를 만든다" 뿐이다.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { AUTH_TOKEN_CLEARED_EVENT } from '@o4o/auth-utils';
import { useServiceAuth } from '../useServiceAuth';
import type { AuthClientLike } from '../types';

interface TestUser {
  id: string;
  email: string;
  roles: string[];
}

const API_USER = { id: 'u-1', email: 'tester@example.com', roles: ['neture:operator'] };

function toUser(apiUser: Record<string, unknown>): TestUser {
  return {
    id: String(apiUser.id),
    email: String(apiUser.email),
    roles: (apiUser.roles as string[]) ?? [],
  };
}

/** authClient 대역 — 실제 네트워크는 타지 않는다. */
function makeClient(overrides: Partial<AuthClientLike> = {}) {
  return {
    login: vi.fn(async () => ({ user: API_USER })),
    logout: vi.fn(async () => undefined),
    api: {
      get: vi.fn(async () => ({ data: { data: { user: API_USER } } })),
      post: vi.fn(async () => ({ data: {} })),
    },
    ...overrides,
  } as unknown as AuthClientLike & {
    login: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    api: { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };
  };
}

function setup(opts: { token?: string | null; client?: ReturnType<typeof makeClient>; onAuthenticated?: (u: TestUser) => void }) {
  const client = opts.client ?? makeClient();
  const getAccessToken = vi.fn(() => opts.token ?? null);
  const hook = renderHook(() =>
    useServiceAuth<TestUser>({
      serviceKey: 'neture',
      authClient: client,
      toUser,
      getAccessToken,
      onAuthenticated: opts.onAuthenticated,
    }),
  );
  return { hook, client, getAccessToken };
}

// globals:false 설정이라 자동 cleanup 이 등록되지 않는다 — 훅 마운트를 명시적으로 정리한다.
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('useServiceAuth — 세션 복구', () => {
  it('토큰이 없으면 /auth/me 를 호출하지 않고 즉시 로딩을 끝낸다 (불필요한 401 방지)', async () => {
    const { hook, client } = setup({ token: null });

    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
    expect(client.api.get).not.toHaveBeenCalled();
    expect(hook.result.current.user).toBeNull();
    expect(hook.result.current.isAuthenticated).toBe(false);
  });

  it('유효 토큰이 있으면 /auth/me 로 세션을 복구한다 (토큰 주입 검증 경로)', async () => {
    const { hook, client } = setup({ token: 'valid-token' });

    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
    expect(client.api.get).toHaveBeenCalledWith('/auth/me');
    expect(hook.result.current.user?.email).toBe('tester@example.com');
    expect(hook.result.current.isAuthenticated).toBe(true);
  });

  it('meEndpoint 로 세션 복구 경로를 바꿀 수 있다', async () => {
    const client = makeClient();
    const hook = renderHook(() =>
      useServiceAuth<TestUser>({
        serviceKey: 'kpa-society',
        authClient: client,
        toUser,
        getAccessToken: () => 'valid-token',
        meEndpoint: '/auth/session',
      }),
    );
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
    expect(client.api.get).toHaveBeenCalledWith('/auth/session');
  });

  it('/auth/me 가 실패하면 비로그인 상태로 진행한다 (예외를 밖으로 던지지 않는다)', async () => {
    const client = makeClient({
      api: {
        get: vi.fn(async () => {
          throw Object.assign(new Error('unauthorized'), { response: { status: 401 } });
        }),
        post: vi.fn(async () => ({ data: {} })),
      } as never,
    });
    const { hook } = setup({ token: 'expired-token', client });

    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
    expect(hook.result.current.user).toBeNull();
    expect(hook.result.current.isAuthenticated).toBe(false);
  });

  it('세션 복구 성공 시 onAuthenticated 가 불린다 (KPA me-context 계약)', async () => {
    const onAuthenticated = vi.fn();
    const { hook } = setup({ token: 'valid-token', onAuthenticated });

    await waitFor(() => expect(hook.result.current.isAuthenticated).toBe(true));
    expect(onAuthenticated).toHaveBeenCalledWith(expect.objectContaining({ id: 'u-1' }));
  });
});

describe('useServiceAuth — login 반환 계약', () => {
  it('성공 시 success:true 와 변환된 user 를 돌려주고 throw 하지 않는다', async () => {
    const { hook, client } = setup({ token: null });
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));

    let result!: Awaited<ReturnType<typeof hook.result.current.login>>;
    await act(async () => {
      result = await hook.result.current.login('tester@example.com', 'pw');
    });

    expect(result.success).toBe(true);
    expect(result.user?.email).toBe('tester@example.com');
    expect(result.error).toBeUndefined();
    expect(hook.result.current.isAuthenticated).toBe(true);
    // serviceKey 가 반드시 실려 나간다 — backend 가 service_memberships 를 검증하는 근거.
    expect(client.login).toHaveBeenCalledWith({
      email: 'tester@example.com',
      password: 'pw',
      serviceKey: 'neture',
    });
  });

  it('응답에 user 가 없으면 success:false 로 떨어진다', async () => {
    const client = makeClient({ login: vi.fn(async () => ({})) as never });
    const { hook } = setup({ token: null, client });
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));

    let result!: Awaited<ReturnType<typeof hook.result.current.login>>;
    await act(async () => {
      result = await hook.result.current.login('a@b.c', 'pw');
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('로그인 응답이 올바르지 않습니다.');
    expect(hook.result.current.isAuthenticated).toBe(false);
  });
});

describe('useServiceAuth — 로그인 실패와 오류 코드 전달', () => {
  it('SERVICE_NOT_MEMBER 를 code 로 그대로 올려보낸다 (서비스별 가입 안내 UX 분기 근거)', async () => {
    const client = makeClient({
      login: vi.fn(async () => {
        throw { response: { status: 401, data: { code: 'SERVICE_NOT_MEMBER' } } };
      }) as never,
    });
    const { hook } = setup({ token: null, client });
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));

    let result!: Awaited<ReturnType<typeof hook.result.current.login>>;
    await act(async () => {
      result = await hook.result.current.login('a@b.c', 'pw');
    });

    expect(result.success).toBe(false);
    expect(result.code).toBe('SERVICE_NOT_MEMBER');
    expect(result.status).toBe(401);
    expect(result.error).toContain('가입');
    expect(hook.result.current.isAuthenticated).toBe(false);
  });

  it('INVALID_CREDENTIALS 는 비밀번호 오류 문구로 매핑된다', async () => {
    const client = makeClient({
      login: vi.fn(async () => {
        throw { response: { status: 401, data: { code: 'INVALID_CREDENTIALS' } } };
      }) as never,
    });
    const { hook } = setup({ token: null, client });
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));

    let result!: Awaited<ReturnType<typeof hook.result.current.login>>;
    await act(async () => {
      result = await hook.result.current.login('a@b.c', 'wrong');
    });

    expect(result.code).toBe('INVALID_CREDENTIALS');
    expect(result.error).toBe('비밀번호가 올바르지 않습니다.');
  });

  it('code 없이 429 면 rate-limit 문구로 떨어진다 (status 기반 분기 보존)', async () => {
    const client = makeClient({
      login: vi.fn(async () => {
        throw { response: { status: 429, data: {} } };
      }) as never,
    });
    const { hook } = setup({ token: null, client });
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));

    let result!: Awaited<ReturnType<typeof hook.result.current.login>>;
    await act(async () => {
      result = await hook.result.current.login('a@b.c', 'pw');
    });

    expect(result.status).toBe(429);
    expect(result.error).toContain('너무 많습니다');
  });

  it('네트워크 오류는 서버 연결 실패 문구로 구분된다', async () => {
    const client = makeClient({
      login: vi.fn(async () => {
        throw Object.assign(new Error('net'), { code: 'ERR_NETWORK' });
      }) as never,
    });
    const { hook } = setup({ token: null, client });
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));

    let result!: Awaited<ReturnType<typeof hook.result.current.login>>;
    await act(async () => {
      result = await hook.result.current.login('a@b.c', 'pw');
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('서버에 연결할 수 없습니다');
  });
});

describe('useServiceAuth — 토큰 정리 · 로그아웃', () => {
  it('토큰 갱신 실패 이벤트를 받으면 stale user 를 정리한다', async () => {
    const { hook } = setup({ token: 'valid-token' });
    await waitFor(() => expect(hook.result.current.isAuthenticated).toBe(true));

    act(() => {
      window.dispatchEvent(new Event(AUTH_TOKEN_CLEARED_EVENT));
    });

    await waitFor(() => expect(hook.result.current.isAuthenticated).toBe(false));
    expect(hook.result.current.user).toBeNull();
  });

  it('logout 은 authClient.logout 호출 후 로컬 상태를 비운다', async () => {
    const { hook, client } = setup({ token: 'valid-token' });
    await waitFor(() => expect(hook.result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await hook.result.current.logout();
    });

    expect(client.logout).toHaveBeenCalled();
    expect(hook.result.current.user).toBeNull();
    expect(hook.result.current.isAuthenticated).toBe(false);
  });

  it('서버 로그아웃이 실패해도 로컬 상태는 반드시 정리한다', async () => {
    const client = makeClient({
      logout: vi.fn(async () => {
        throw new Error('server down');
      }) as never,
    });
    const { hook } = setup({ token: 'valid-token', client });
    await waitFor(() => expect(hook.result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await hook.result.current.logout();
    });

    expect(hook.result.current.user).toBeNull();
  });

  it('logoutAll 은 지정 엔드포인트로 POST 한다', async () => {
    const { hook, client } = setup({ token: 'valid-token' });
    await waitFor(() => expect(hook.result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await hook.result.current.logoutAll();
    });

    expect(client.api.post).toHaveBeenCalledWith('/auth/logout-all');
  });
});

/**
 * WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-FULL-CLOSE-V1
 * Neture / K-Cosmetics / GlycoPharm 이 각자 들고 있던 "서버 호출만 하고 로컬 세션은 유지"
 * 구현을 설정 1개로 흡수했다. 두 방향 모두 고정한다.
 */
describe('useServiceAuth — clearSessionOnLogoutAll', () => {
  function setupWithFlag(clearSessionOnLogoutAll?: boolean) {
    const client = makeClient();
    const hook = renderHook(() =>
      useServiceAuth<TestUser>({
        serviceKey: 'neture',
        authClient: client,
        toUser,
        getAccessToken: () => 'valid-token',
        clearSessionOnLogoutAll,
      }),
    );
    return { hook, client };
  }

  it('기본값(true)은 로컬 세션까지 비운다', async () => {
    const { hook } = setupWithFlag();
    await waitFor(() => expect(hook.result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await hook.result.current.logoutAll();
    });

    expect(hook.result.current.user).toBeNull();
  });

  it('false 면 서버 호출만 하고 로컬 세션은 유지한다', async () => {
    const { hook, client } = setupWithFlag(false);
    await waitFor(() => expect(hook.result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await hook.result.current.logoutAll();
    });

    expect(client.api.post).toHaveBeenCalledWith('/auth/logout-all');
    expect(hook.result.current.user).not.toBeNull();
    expect(hook.result.current.isAuthenticated).toBe(true);
  });
});

