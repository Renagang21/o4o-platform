/**
 * WO-O4O-NETURE-AUTH-ERROR-CONTRACT-AND-LEGACY-TOKEN-RECOVERY-FIX-V1 §3·§4
 *
 * localStorage 전략 AuthClient 의 401 interceptor:
 *   - access 만료 + refresh 유효 → refresh 후 재시도 (기존 동작 유지)
 *   - 403 은 인증 만료가 아니다 → refresh · 토큰 삭제 · 이벤트 없음
 *   - refresh 진행 중 로그아웃(같은 탭) → 늦게 도착한 refresh 응답으로 토큰을 되살리지 않는다
 *   - refresh 진행 중 다른 탭 로그아웃(storage 의 refresh token 삭제) → 동일
 *   - refresh 불가 → 기존 정책대로 토큰 삭제 + auth:token-cleared
 *
 * axios 네트워크는 adapter 로 대체한다 — 응답 시점을 테스트가 제어한다.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { AuthClient } from '../client';

type Deferred = { resolve: (r: Partial<AxiosResponse>) => void; reject: (e: unknown) => void };

function makeClient() {
  const client = new AuthClient('http://api.test', { strategy: 'localStorage' });
  const calls: string[] = [];
  const pending: Record<string, Deferred[]> = {};
  const handlers: Record<string, (config: AxiosRequestConfig) => Partial<AxiosResponse> | 'defer'> = {};

  const respond = (config: AxiosRequestConfig, r: Partial<AxiosResponse>): AxiosResponse => ({
    data: r.data,
    status: r.status ?? 200,
    statusText: '',
    headers: {},
    config: config as never,
    request: {},
  });

  client.api.defaults.adapter = async (config) => {
    const url = config.url ?? '';
    calls.push(`${(config.method ?? 'get').toUpperCase()} ${url}`);
    const handler = handlers[url];
    const result = handler ? handler(config) : { status: 200, data: { success: true, data: {} } };
    let r: Partial<AxiosResponse>;
    if (result === 'defer') {
      r = await new Promise<Partial<AxiosResponse>>((resolve, reject) => {
        (pending[url] ??= []).push({ resolve, reject });
      });
    } else {
      r = result;
    }
    const res = respond(config, r);
    if (res.status >= 400) {
      const err = new Error(`HTTP ${res.status}`) as Error & { response?: AxiosResponse; config?: unknown; isAxiosError?: boolean };
      err.response = res;
      err.config = config;
      err.isAxiosError = true;
      throw err;
    }
    return res;
  };

  return { client, calls, pending, handlers };
}

const okRefresh = (accessToken: string, refreshToken: string) => ({
  status: 200,
  data: { success: true, data: { accessToken, refreshToken } },
});

function loggedIn(access = 'old-access', refresh = 'old-refresh') {
  localStorage.setItem('o4o_accessToken', access);
  localStorage.setItem('o4o_refreshToken', refresh);
}

describe('AuthClient 401 interceptor — localStorage 전략', () => {
  let cleared = 0;
  const onCleared = () => { cleared += 1; };
  beforeEach(() => {
    localStorage.clear();
    cleared = 0;
    window.removeEventListener('auth:token-cleared', onCleared);
    window.addEventListener('auth:token-cleared', onCleared);
  });

  it('access 만료 + refresh 유효 → /auth/refresh 후 원 요청 재시도 · 새 토큰 저장', async () => {
    loggedIn();
    const { client, calls, handlers } = makeClient();
    let meCalls = 0;
    handlers['/auth/me'] = () => (meCalls++ === 0 ? { status: 401, data: { code: 'TOKEN_EXPIRED' } } : { status: 200, data: { success: true, data: { id: 'u1' } } });
    handlers['/auth/refresh'] = () => okRefresh('new-access', 'new-refresh');

    const res = await client.api.get('/auth/me');
    expect(res.status).toBe(200);
    expect(calls).toEqual(['GET /auth/me', 'POST /auth/refresh', 'GET /auth/me']);
    expect(localStorage.getItem('o4o_accessToken')).toBe('new-access');
    expect(localStorage.getItem('o4o_refreshToken')).toBe('new-refresh');
  });

  it('403 (NO_PARTNER 등 서비스 권한 오류) → refresh 없음 · 토큰 유지 · 이벤트 없음', async () => {
    loggedIn();
    const { client, calls, handlers } = makeClient();
    handlers['/neture/partner/commissions'] = () => ({ status: 403, data: { success: false, error: { code: 'NO_PARTNER' } } });

    await expect(client.api.get('/neture/partner/commissions')).rejects.toMatchObject({ response: { status: 403 } });
    expect(calls).toEqual(['GET /neture/partner/commissions']);
    expect(localStorage.getItem('o4o_accessToken')).toBe('old-access');
    expect(cleared).toBe(0);
  });

  it('refresh 불가(401) → 토큰 삭제 + auth:token-cleared (기존 정책)', async () => {
    loggedIn();
    const { client, handlers } = makeClient();
    handlers['/auth/me'] = () => ({ status: 401, data: {} });
    handlers['/auth/refresh'] = () => ({ status: 401, data: { code: 'TOKEN_EXPIRED' } });

    await expect(client.api.get('/auth/me')).rejects.toBeTruthy();
    expect(localStorage.getItem('o4o_accessToken')).toBeNull();
    expect(localStorage.getItem('o4o_refreshToken')).toBeNull();
    expect(cleared).toBe(1);
  });

  it('refresh 진행 중 같은 탭 logout() → 늦게 도착한 refresh 성공 응답을 저장하지 않는다', async () => {
    loggedIn();
    const { client, pending, handlers } = makeClient();
    handlers['/auth/me'] = () => ({ status: 401, data: {} });
    handlers['/auth/refresh'] = () => 'defer';
    handlers['/auth/logout'] = () => ({ status: 200, data: { success: true } });

    const inflight = client.api.get('/auth/me');
    await vi.waitFor(() => expect(pending['/auth/refresh']?.length).toBe(1));

    await client.logout();
    expect(localStorage.getItem('o4o_accessToken')).toBeNull();

    pending['/auth/refresh'][0].resolve(okRefresh('late-access', 'late-refresh'));
    await expect(inflight).rejects.toThrow(/session ended/);

    expect(localStorage.getItem('o4o_accessToken')).toBeNull();
    expect(localStorage.getItem('o4o_refreshToken')).toBeNull();
    expect(localStorage.getItem('admin-auth-storage')).toBeNull();
  });

  it('refresh 진행 중 다른 탭 로그아웃(storage 에서 토큰 삭제) → 늦은 응답으로 되살리지 않는다', async () => {
    loggedIn();
    const { client, pending, handlers } = makeClient();
    handlers['/auth/me'] = () => ({ status: 401, data: {} });
    handlers['/auth/refresh'] = () => 'defer';

    const inflight = client.api.get('/auth/me');
    await vi.waitFor(() => expect(pending['/auth/refresh']?.length).toBe(1));

    // 다른 탭의 clearAllTokens() — 이 탭의 AuthClient 인스턴스는 모른다 (세대 불변)
    localStorage.removeItem('o4o_accessToken');
    localStorage.removeItem('o4o_refreshToken');

    pending['/auth/refresh'][0].resolve(okRefresh('late-access', 'late-refresh'));
    await expect(inflight).rejects.toThrow(/session ended/);
    expect(localStorage.getItem('o4o_accessToken')).toBeNull();
  });

  it('refresh 진행 중 logout() → 대기 중이던 다른 요청도 원래 401 로 종료 (무한 대기 없음)', async () => {
    loggedIn();
    const { client, pending, handlers, calls } = makeClient();
    handlers['/auth/me'] = () => ({ status: 401, data: {} });
    handlers['/neture/supplier/me'] = () => ({ status: 401, data: {} });
    handlers['/auth/refresh'] = () => 'defer';
    handlers['/auth/logout'] = () => ({ status: 200, data: { success: true } });

    const first = client.api.get('/auth/me');
    await vi.waitFor(() => expect(pending['/auth/refresh']?.length).toBe(1));
    const second = client.api.get('/neture/supplier/me');
    await vi.waitFor(() => expect(calls.filter((c) => c === 'GET /neture/supplier/me').length).toBe(1));

    await client.logout();
    await expect(second).rejects.toMatchObject({ response: { status: 401 } });

    pending['/auth/refresh'][0].resolve(okRefresh('late-access', 'late-refresh'));
    await expect(first).rejects.toThrow(/session ended/);
    expect(localStorage.getItem('o4o_accessToken')).toBeNull();
  });

  it('refresh 진행 중 로그아웃 후 refresh 가 실패해도 이벤트를 다시 내지 않는다', async () => {
    loggedIn();
    const { client, pending, handlers } = makeClient();
    handlers['/auth/me'] = () => ({ status: 401, data: {} });
    handlers['/auth/refresh'] = () => 'defer';
    handlers['/auth/logout'] = () => ({ status: 200, data: { success: true } });

    const inflight = client.api.get('/auth/me');
    await vi.waitFor(() => expect(pending['/auth/refresh']?.length).toBe(1));
    await client.logout();

    pending['/auth/refresh'][0].resolve({ status: 401, data: { code: 'TOKEN_EXPIRED' } });
    await expect(inflight).rejects.toBeTruthy();
    expect(cleared).toBe(0);
  });
});
