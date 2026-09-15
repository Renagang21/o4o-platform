/**
 * WO-O4O-NETURE-AUTH-ERROR-CONTRACT-AND-LEGACY-TOKEN-RECOVERY-FIX-V1 §4
 *
 * 토큰 읽기는 저장소를 바꾸지 않는다 — legacy 저장소(accessToken · authToken · token · refreshToken ·
 * admin-auth-storage) 에서 표준 키로 되살리지 않는다. 로그아웃 정리는 인증 키만 지운다.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  clearAllTokens,
  updateAuthStorage,
} from '../token-storage';

describe('token-storage — 읽기는 순수', () => {
  beforeEach(() => localStorage.clear());

  it('표준 키가 있으면 그것을 돌려준다', () => {
    localStorage.setItem('o4o_accessToken', 'std');
    localStorage.setItem('accessToken', 'legacy');
    expect(getAccessToken()).toBe('std');
  });

  it.each(['accessToken', 'authToken', 'token'])('legacy 키 %s 만 있으면 null · 표준 키에 되살리지 않는다', (key) => {
    localStorage.setItem(key, 'legacy');
    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem('o4o_accessToken')).toBeNull();
  });

  it('admin-auth-storage 만 남아 있으면 null · 되살리지 않는다 (다른 탭 clearAllTokens 순차 삭제 경합)', () => {
    updateAuthStorage('from-admin-storage', 'rt');
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(localStorage.getItem('o4o_accessToken')).toBeNull();
    expect(localStorage.getItem('o4o_refreshToken')).toBeNull();
  });

  it('legacy refreshToken 키만 있으면 null · 되살리지 않는다', () => {
    localStorage.setItem('refreshToken', 'legacy-rt');
    expect(getRefreshToken()).toBeNull();
    expect(localStorage.getItem('o4o_refreshToken')).toBeNull();
  });

  it('로그아웃 후 legacy 저장소에 토큰이 남아도 로그인으로 보지 않는다', () => {
    setAccessToken('a');
    localStorage.setItem('o4o_refreshToken', 'r');
    updateAuthStorage('a', 'r');
    clearAllTokens();
    // 어떤 경로로든 legacy 값이 다시 생겨도(다른 앱·구버전 탭) 표준 키가 없으면 비로그인
    localStorage.setItem('admin-auth-storage', JSON.stringify({ state: { accessToken: 'stale' } }));
    localStorage.setItem('token', 'stale');
    expect(getAccessToken()).toBeNull();
  });
});

describe('clearAllTokens — 인증 키만 지운다', () => {
  beforeEach(() => localStorage.clear());

  it('표준·legacy·admin-auth-storage·user 는 지우고 무관한 설정은 남긴다 (localStorage.clear() 아님)', () => {
    localStorage.setItem('o4o_accessToken', 'a');
    localStorage.setItem('o4o_refreshToken', 'r');
    localStorage.setItem('accessToken', 'l1');
    localStorage.setItem('authToken', 'l2');
    localStorage.setItem('token', 'l3');
    localStorage.setItem('refreshToken', 'l4');
    localStorage.setItem('user', '{}');
    updateAuthStorage('a', 'r');
    localStorage.setItem('neture:theme', 'dark');
    localStorage.setItem('o4o-work-agent:last-target', 'x');

    clearAllTokens();

    for (const k of ['o4o_accessToken', 'o4o_refreshToken', 'accessToken', 'authToken', 'token', 'refreshToken', 'user', 'admin-auth-storage']) {
      expect(localStorage.getItem(k)).toBeNull();
    }
    expect(localStorage.getItem('neture:theme')).toBe('dark');
    expect(localStorage.getItem('o4o-work-agent:last-target')).toBe('x');
  });
});
