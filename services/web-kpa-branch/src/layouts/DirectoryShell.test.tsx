/**
 * WO-O4O-CROSS-SERVICE-PUBLIC-DESIGN-AND-BRAND-REFRESH-V1 — kpa.neture.co.kr `/` 셸 계약
 *
 * `/`(분회 찾기)에 헤더 · 푸터가 있다 — KPA 정체성(약사회 분회) · O4O 홈(로그인 무관) · 로그인 진입 · 첫 탐색.
 *
 * 실행: 저장소 루트에서 `npx vitest run --config services/web-kpa-branch/vitest.config.mjs`
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const auth = vi.hoisted(() => ({ isAuthenticated: false }));
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: auth.isAuthenticated, isLoading: false, logout: vi.fn() }),
}));
vi.mock('../lib/apiClient', () => ({ authClient: { api: { get: vi.fn(), post: vi.fn() } } }));

import DirectoryShell from './DirectoryShell';

const renderShell = () =>
  render(
    React.createElement(MemoryRouter, null, React.createElement(DirectoryShell, null, React.createElement('p', null, 'body'))),
  );

afterEach(() => {
  cleanup();
  auth.isAuthenticated = false;
});

describe('DirectoryShell', () => {
  it('비로그인 — KPA 정체성 · O4O 홈 · 로그인 · 첫 탐색 · 푸터', () => {
    renderShell();
    const header = screen.getByTestId('directory-header');
    expect(header.textContent).toContain('약사회 분회');
    expect(screen.getAllByTestId('o4o-home-button').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: '로그인' }).getAttribute('href')).toBe('/login');
    const nav = screen.getByRole('navigation', { name: '분회 서비스' });
    const hrefs = Array.from(nav.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/', '/join', '/me']);
    expect(screen.getByTestId('directory-footer')).toBeTruthy();
  });

  it('로그인 — O4O 홈은 그대로 보이고 로그인 링크 대신 로그아웃', () => {
    auth.isAuthenticated = true;
    renderShell();
    expect(screen.getAllByTestId('o4o-home-button').length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: '로그인' })).toBeNull();
  });
});
