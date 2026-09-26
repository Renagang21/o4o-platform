// @vitest-environment jsdom
/**
 * 관리자 세션 사용자 교체 방지 — CHECK-O4O-URL-FIRST-CENSUS-V1 §19-1 · §21-2
 *
 * 쿠키 세션(`.neture.co.kr`)은 다른 경로에서 다른 사용자로 바뀔 수 있다. AuthProvider 는
 * 캐시된 사용자와 `/auth/status` 사용자가 다르면:
 *   - 새 사용자를 조용히 채택하지 않는다 (user = null → 보호 화면 해제)
 *   - 재채택 금지 표식을 남겨 새로고침 후에도 서버 세션을 채택하지 않는다
 *   - 서버 logout 을 호출하지 않는다 (쿠키 주인의 refresh family 를 끊지 않도록)
 *   - 명시적 로그인 성공에서만 표식을 지운다
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor, act } from '@testing-library/react';
import { AuthProvider, SESSION_CONFLICT_STORAGE_KEY } from '../AuthProvider';
import { useAuth } from '../AuthContext';

const CACHE_KEY = 'admin-auth-storage';
const A = { id: 'user-a', email: 'a@test', status: 'active', roles: ['platform:super_admin'] };
const B = { id: 'user-b', email: 'b@test', status: 'active', roles: ['kpa:store_owner'] };

function statusOf(user: unknown) {
  return { data: { success: true, data: { authenticated: true, user } } };
}

function makeClient() {
  return {
    api: { get: vi.fn() },
    logout: vi.fn(),
    logoutAll: vi.fn(),
    loginWithGoogle: vi.fn(),
    getGoogleAuthConfig: vi.fn(async () => ({ enabled: true, clientId: 'x' })),
    checkSession: vi.fn(),
  };
}

let seen: ReturnType<typeof useAuth> | null = null;
function Probe() {
  seen = useAuth();
  return null;
}

function renderWith(client: ReturnType<typeof makeClient>) {
  return render(
    <AuthProvider ssoClient={client as any} strategy="cookie">
      <Probe />
    </AuthProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  seen = null;
});
afterEach(() => {
  cleanup();
});

describe('AuthProvider — 세션 사용자 교체', () => {
  it('캐시 A · 서버 B → 채택하지 않고 화면을 비우며 표식을 남긴다 · logout 호출 0', async () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ state: { user: A, isAuthenticated: true } }));
    const client = makeClient();
    client.api.get.mockResolvedValue(statusOf(B));

    renderWith(client);

    await waitFor(() => expect(seen?.sessionConflict).toBe(true));
    expect(seen?.user).toBeNull();
    expect(seen?.isAuthenticated).toBe(false);
    expect(localStorage.getItem(SESSION_CONFLICT_STORAGE_KEY)).not.toBeNull();
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
    expect(client.logout).not.toHaveBeenCalled();
    expect(client.logoutAll).not.toHaveBeenCalled();
  });

  it('표식이 남아 있으면 새로고침 후 캐시가 없어도 서버 세션 사용자를 채택하지 않는다', async () => {
    localStorage.setItem(SESSION_CONFLICT_STORAGE_KEY, JSON.stringify({ detectedAt: 'x' }));
    const client = makeClient();
    client.api.get.mockResolvedValue(statusOf(B));

    renderWith(client);

    await waitFor(() => expect(seen?.isLoading).toBe(false));
    expect(seen?.user).toBeNull();
    expect(seen?.sessionConflict).toBe(true);
    expect(client.logout).not.toHaveBeenCalled();
  });

  it('캐시 A · 서버 A → 그대로 유지(회귀 0)', async () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ state: { user: A, isAuthenticated: true } }));
    const client = makeClient();
    client.api.get.mockResolvedValue(statusOf(A));

    renderWith(client);

    await waitFor(() => expect(client.api.get).toHaveBeenCalled());
    expect(seen?.user?.id).toBe('user-a');
    expect(seen?.sessionConflict).toBe(false);
  });

  it('캐시 없음 · 표식 없음 · 서버 A → 채택(기존 세션 복원 회귀 0)', async () => {
    const client = makeClient();
    client.api.get.mockResolvedValue(statusOf(A));

    renderWith(client);

    await waitFor(() => expect(seen?.user?.id).toBe('user-a'));
    expect(seen?.sessionConflict).toBe(false);
  });

  it('명시적 Google 로그인 성공이 표식을 지운다', async () => {
    localStorage.setItem(SESSION_CONFLICT_STORAGE_KEY, JSON.stringify({ detectedAt: 'x' }));
    const client = makeClient();
    client.api.get.mockResolvedValue(statusOf(B));
    client.loginWithGoogle.mockResolvedValue({ data: { user: A } });

    renderWith(client);
    await waitFor(() => expect(seen?.isLoading).toBe(false));
    expect(seen?.sessionConflict).toBe(true);

    await act(async () => {
      await seen!.loginWithGoogle('id-token');
    });

    expect(seen?.user?.id).toBe('user-a');
    expect(seen?.sessionConflict).toBe(false);
    expect(localStorage.getItem(SESSION_CONFLICT_STORAGE_KEY)).toBeNull();
  });

  it('세션 도중 창 포커스 때 서버 사용자가 바뀌어 있으면 화면을 비운다', async () => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ state: { user: A, isAuthenticated: true } }));
    const client = makeClient();
    client.api.get.mockResolvedValueOnce(statusOf(A));

    renderWith(client);
    await waitFor(() => expect(client.api.get).toHaveBeenCalledTimes(1));
    expect(seen?.user?.id).toBe('user-a');

    client.api.get.mockResolvedValueOnce(statusOf(B));
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    await waitFor(() => expect(seen?.sessionConflict).toBe(true));
    expect(seen?.user).toBeNull();
    expect(client.logout).not.toHaveBeenCalled();
  });
});
