/**
 * WO-O4O-NETURE-MAIN-ACCOUNT-AND-SUPPLIER-PARTNER-SERVICE-SEPARATION-V1 §4·§8
 *
 * 다른 탭 로그아웃(storage 이벤트) · bfcache 복원(pageshow persisted) 시 인증 상태 재정렬.
 * 토큰 삭제 이벤트는 storage 를 다시 읽지 않는다 — 다른 탭의 clearAllTokens() 와 경합하면
 * getAccessToken() 의 legacy(admin-auth-storage) 자동 이관이 로그아웃을 되돌리기 때문.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';

const core = {
  user: null as unknown,
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  logoutAll: vi.fn(),
  refresh: vi.fn(async () => {}),
  setUser: vi.fn(),
};
vi.mock('@o4o/auth-react', () => ({
  useServiceAuth: () => core,
  useRoleSelection: () => ({ switchRole: vi.fn(), updateUser: vi.fn(), hasMultipleRoles: false }),
}));
vi.mock('@o4o/auth-client', () => ({ getAccessToken: vi.fn(() => null) }));
vi.mock('@o4o/auth-utils', () => ({ buildPlatformUser: (u: unknown) => u }));
vi.mock('../../lib/apiClient', () => ({ authClient: { api: { get: vi.fn(), post: vi.fn() } } }));

import { AuthProvider } from '../AuthContext';

const storageEvent = (key: string | null, newValue: string | null) =>
  new StorageEvent('storage', { key, newValue, storageArea: window.localStorage });

describe('AuthContext cross-tab · bfcache', () => {
  beforeEach(() => {
    core.refresh.mockClear();
    core.setUser.mockClear();
    render(<AuthProvider><div /></AuthProvider>);
  });
  afterEach(() => cleanup());

  it('다른 탭에서 o4o_accessToken 삭제 → storage 재조회 없이 즉시 비로그인', () => {
    act(() => { window.dispatchEvent(storageEvent('o4o_accessToken', null)); });
    expect(core.setUser).toHaveBeenCalledWith(null);
    expect(core.refresh).not.toHaveBeenCalled();
  });

  it('다른 탭에서 로그인(토큰 기록) → refresh 로 /auth/me 재확인', () => {
    act(() => { window.dispatchEvent(storageEvent('o4o_accessToken', 'new-token')); });
    expect(core.refresh).toHaveBeenCalledTimes(1);
    expect(core.setUser).not.toHaveBeenCalled();
  });

  it('localStorage.clear() (key=null) → 비로그인', () => {
    act(() => { window.dispatchEvent(storageEvent(null, null)); });
    expect(core.setUser).toHaveBeenCalledWith(null);
  });

  it('다른 키(admin-auth-storage · o4o_refreshToken) 변경은 무시', () => {
    act(() => {
      window.dispatchEvent(storageEvent('admin-auth-storage', null));
      window.dispatchEvent(storageEvent('o4o_refreshToken', null));
    });
    expect(core.setUser).not.toHaveBeenCalled();
    expect(core.refresh).not.toHaveBeenCalled();
  });

  it('bfcache 복원(pageshow persisted) → refresh · 일반 로드는 무시', () => {
    act(() => { window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); });
    expect(core.refresh).toHaveBeenCalledTimes(1);
    act(() => { window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false })); });
    expect(core.refresh).toHaveBeenCalledTimes(1);
  });
});
