import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const m = vi.hoisted(() => ({ auth: { isAuthenticated: false, isLoading: false }, open: vi.fn(), modalOpen: false }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => m.auth }));
vi.mock('../../contexts/LoginModalContext', () => ({ useLoginModal: () => ({ openLoginModal: m.open, isLoginModalOpen: m.modalOpen }) }));

import { CommunityLoginGate, communityGateDecision } from './CommunityLoginGate';

function LoginTarget() { const l = useLocation(); return <output>login from {(l.state as { from?: string } | null)?.from}</output>; }
const mount = (path: string, profile: 'community' | 'main' = 'community') => render(<MemoryRouter initialEntries={[path]}><Routes>
  <Route path="/login" element={<LoginTarget />} />
  <Route path="*" element={<CommunityLoginGate profile={profile}><p>회원 화면</p></CommunityLoginGate>} />
</Routes></MemoryRouter>);

beforeEach(() => { m.auth = { isAuthenticated: false, isLoading: false }; m.open.mockReset(); m.modalOpen = false; });
afterEach(cleanup);

describe('community is for logged-in members only (2026-11-14)', () => {
  it('decides per host, session and path', () => {
    const guest = { isAuthenticated: false, isLoading: false };
    expect(communityGateDecision('main', guest, '/communities/community/forum')).toBe('pass');
    expect(communityGateDecision('community', { isAuthenticated: true, isLoading: false }, '/')).toBe('pass');
    expect(communityGateDecision('community', { isAuthenticated: false, isLoading: true }, '/')).toBe('wait');
    expect(communityGateDecision('community', guest, '/')).toBe('landing');
    expect(communityGateDecision('community', guest, '/communities/community/forum')).toBe('login');
    for (const path of ['/terms', '/privacy', '/contact']) expect(communityGateDecision('community', guest, path)).toBe('pass');
  });
  it('the home shows only the introduction with login and signup, and opens the login window', () => {
    mount('/');
    expect(screen.queryByText('회원 화면')).toBeNull();
    expect(screen.getByRole('heading', { name: '커뮤니티' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '회원가입' }).getAttribute('href')).toBe('/signup');
    expect(m.open).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    expect(m.open).toHaveBeenCalledTimes(2);
  });
  it('does not reopen (and drop the return address of) a login window already opened by /login', () => {
    m.modalOpen = true;
    mount('/');
    expect(m.open).not.toHaveBeenCalled();
  });
  it('any other community page goes to login and comes back to the same page', () => {
    mount('/communities/community/forum/post/hello?b=1');
    expect(screen.getByRole('status').textContent).toBe('login from /communities/community/forum/post/hello?b=1');
  });
  it('logged-in members and other hosts see the page as before', () => {
    m.auth = { isAuthenticated: true, isLoading: false };
    mount('/communities/community/forum');
    expect(screen.getByText('회원 화면')).toBeTruthy();
    cleanup();
    m.auth = { isAuthenticated: false, isLoading: false };
    mount('/communities/community/forum', 'main');
    expect(screen.getByText('회원 화면')).toBeTruthy();
  });
});
