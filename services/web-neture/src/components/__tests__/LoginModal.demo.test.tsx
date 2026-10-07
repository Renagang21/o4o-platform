/**
 * WO-O4O-DEMO-LOGIN-ENTRY-AND-EXPERIENCE-UX-V1 — 로그인 모달 '체험하기'
 *
 *   - Demo 버튼 2개 · credential 화면 비노출 · 입력칸을 채우지 않는다
 *   - 기존 loginWithEmail 재사용 · 중복 클릭 1회
 *   - 공급자 → /supplier/dashboard · 매장 경영자 → 홈 매장 버튼과 같은 handoff URL 로 이동
 *   - 실패 문구: 인증 · 권한 · 서버 · (로그인 성공 후) 매장 이동 실패
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

type LoginResult = { success: boolean; user?: unknown; code?: string; status?: number; error?: string };
const loginWithEmail = vi.fn<(e: string, p: string) => Promise<LoginResult>>();
vi.mock('../../contexts', () => ({
  useAuth: () => ({
    loginWithEmail,
    loginWithGoogle: vi.fn(),
    signupWithGoogle: vi.fn(),
    getGoogleAuthConfig: vi.fn(async () => ({ enabled: false, clientId: null })),
  }),
}));
vi.mock('../../lib/apiClient', () => ({ authClient: { resendVerificationEmail: vi.fn() }, api: {} }));
const resolveSingleStoreWorkspaceUrl = vi.fn<(u: unknown) => Promise<string>>();
vi.mock('../../lib/home-entry', () => ({
  resolveSingleStoreWorkspaceUrl: (u: unknown) => resolveSingleStoreWorkspaceUrl(u),
}));

import LoginModal from '../LoginModal';
import { DEMO_ACCOUNTS } from '../../lib/demoAccounts';

const assign = vi.fn();

function mount(onClose = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<LoginModal isOpen onClose={onClose} />} />
        <Route path="/supplier/dashboard" element={<div data-testid="supplier-dashboard" />} />
      </Routes>
    </MemoryRouter>,
  );
  return onClose;
}

beforeEach(() => {
  loginWithEmail.mockReset();
  resolveSingleStoreWorkspaceUrl.mockReset();
  assign.mockReset();
  vi.stubGlobal('location', { ...window.location, assign });
  sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const store = DEMO_ACCOUNTS.find((d) => d.type === 'STORE_OWNER')!;
const supplier = DEMO_ACCOUNTS.find((d) => d.type === 'SUPPLIER')!;

describe('LoginModal — 체험하기', () => {
  it('Demo 버튼 2개 · credential 비노출 · 입력칸 비어 있음', () => {
    mount();
    expect(screen.getByRole('heading', { name: '체험하기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '매장 경영자 Demo 체험' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '공급자 Demo 체험' })).toBeTruthy();
    const text = document.body.textContent ?? '';
    for (const d of DEMO_ACCOUNTS) {
      expect(text).not.toContain(d.email);
      expect(text).not.toContain(d.password);
    }
    expect((screen.getByLabelText('이메일') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('비밀번호') as HTMLInputElement).value).toBe('');
  });

  it('공급자 Demo → loginWithEmail 1회 → /supplier/dashboard · 모달 닫힘', async () => {
    loginWithEmail.mockResolvedValue({ success: true, user: { id: 's1' } });
    const onClose = mount();
    const btn = screen.getByRole('button', { name: '공급자 Demo 체험' });
    fireEvent.click(btn);
    fireEvent.click(btn); // 중복 클릭
    await waitFor(() => expect(screen.getByTestId('supplier-dashboard')).toBeTruthy());
    expect(loginWithEmail).toHaveBeenCalledTimes(1);
    expect(loginWithEmail).toHaveBeenCalledWith(supplier.email, supplier.password);
    expect(onClose).toHaveBeenCalled();
    expect(sessionStorage.getItem('neture_login_explicit_nav')).toBe('1');
  });

  it('매장 경영자 Demo → 로그인 → 같은 handoff URL 로 이동', async () => {
    const user = { id: 'o1' };
    loginWithEmail.mockResolvedValue({ success: true, user });
    resolveSingleStoreWorkspaceUrl.mockResolvedValue('https://pharmacy.neture.co.kr/auth/handoff?code=x');
    mount();
    fireEvent.click(screen.getByRole('button', { name: '매장 경영자 Demo 체험' }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://pharmacy.neture.co.kr/auth/handoff?code=x'));
    expect(loginWithEmail).toHaveBeenCalledWith(store.email, store.password);
    expect(resolveSingleStoreWorkspaceUrl).toHaveBeenCalledWith(user);
    // 이동 중에는 두 버튼 모두 잠긴다
    expect((screen.getByRole('button', { name: '공급자 Demo 체험' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('매장 이동 실패 → 로그인 실패와 구분된 안내 · 버튼 복구', async () => {
    loginWithEmail.mockResolvedValue({ success: true, user: { id: 'o1' } });
    resolveSingleStoreWorkspaceUrl.mockRejectedValue(new Error('x'));
    mount();
    fireEvent.click(screen.getByRole('button', { name: '매장 경영자 Demo 체험' }));
    expect(await screen.findByText(/매장 Demo 화면으로 이동하지 못했습니다/)).toBeTruthy();
    expect(assign).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: '매장 경영자 Demo 체험' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it.each([
    [{ success: false, status: 401, code: 'INVALID_CREDENTIALS' }, 'Demo 체험 계정 로그인이 실패했습니다.'],
    [{ success: false, status: 403, code: 'SERVICE_NOT_MEMBER' }, 'Demo 계정의 체험 권한을 확인할 수 없습니다.'],
    [{ success: false, status: 500 }, '현재 Demo 체험을 시작할 수 없습니다.'],
    [{ success: false, error: '서버에 연결할 수 없습니다.' }, '현재 Demo 체험을 시작할 수 없습니다.'],
  ])('로그인 실패 %j → 안내 문구', async (result, message) => {
    loginWithEmail.mockResolvedValue(result);
    mount();
    fireEvent.click(screen.getByRole('button', { name: '공급자 Demo 체험' }));
    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.queryByTestId('supplier-dashboard')).toBeNull();
    expect(sessionStorage.getItem('neture_login_explicit_nav')).toBeNull();
  });
});
