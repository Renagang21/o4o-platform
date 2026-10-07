/**
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 — Neture 로그인 모달 구성
 *
 *   - 이메일 · 비밀번호 · 로그인 버튼 + Google 로 계속하기
 *   - 아래 회원가입 · 아이디 찾기 · 비밀번호 찾기 → 모달 닫고 해당 페이지로
 *   - "같은 버튼으로 … 계정이 만들어집니다" 는 Google 한정 문구 — Google 버튼이 보일 때만(준비 중이면 숨김)
 *   - 헤더 부제는 호스트별 — 대표 호스트는 "O4O 통합 업무 공간" (WO-O4O-LOGIN-MODAL-GOOGLE-HINT-AND-HEADER-V1)
 *   - 이메일 로그인 성공 → 모달 닫힘
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const loginWithEmail = vi.fn(async () => ({ success: true, user: { id: 'u1' } }));
const getGoogleAuthConfig = vi.fn(async (): Promise<{ enabled: boolean; clientId: string | null }> => ({ enabled: false, clientId: null }));
vi.mock('../../contexts', () => ({
  useAuth: () => ({
    loginWithEmail,
    loginWithGoogle: vi.fn(),
    signupWithGoogle: vi.fn(),
    getGoogleAuthConfig,
  }),
}));
// GIS 스크립트는 로드하지 않는다.
vi.mock('@o4o/auth-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@o4o/auth-client')>()),
  renderGoogleButton: vi.fn(async () => () => undefined),
}));
vi.mock('../../lib/apiClient', () => ({ authClient: { resendVerificationEmail: vi.fn() } }));

import LoginModal from '../LoginModal';

function mount(onClose = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<LoginModal isOpen onClose={onClose} />} />
        <Route path="/signup" element={<div data-testid="signup-page" />} />
        <Route path="/find-id" element={<div data-testid="find-id-page" />} />
        <Route path="/forgot-password" element={<div data-testid="forgot-page" />} />
      </Routes>
    </MemoryRouter>,
  );
  return onClose;
}

afterEach(() => cleanup());

describe('LoginModal — 이메일 로그인', () => {
  it('이메일 · 비밀번호 · 로그인 + 계정 도움말 링크 + 대표 호스트 부제', () => {
    mount();
    expect(screen.getByLabelText('이메일')).toBeTruthy();
    expect(screen.getByLabelText('비밀번호')).toBeTruthy();
    expect(screen.getByRole('button', { name: '로그인' })).toBeTruthy();
    expect(screen.getByText('회원가입')).toBeTruthy();
    expect(screen.getByText('아이디 찾기')).toBeTruthy();
    expect(screen.getByText('비밀번호 찾기')).toBeTruthy();
    expect(screen.getByText('O4O 통합 업무 공간')).toBeTruthy();
    expect(screen.queryByText('공급자 연결 서비스')).toBeNull();
  });

  it('Google 준비 중이면 Google 한정 안내를 보여주지 않는다', async () => {
    mount();
    await screen.findByTestId('google-continue-disabled');
    expect(screen.queryByText(/Google 로 처음이신가요/)).toBeNull();
  });

  it('Google 버튼이 보이면 그 아래 Google 한정 안내를 보여준다', async () => {
    getGoogleAuthConfig.mockResolvedValueOnce({ enabled: true, clientId: 'public-client-id' });
    mount();
    await screen.findByTestId('google-continue-button');
    expect(screen.getByText(/Google 로 처음이신가요\? 같은 Google 버튼으로/)).toBeTruthy();
  });

  it('회원가입 링크 → 모달 닫고 /signup', () => {
    const onClose = mount();
    fireEvent.click(screen.getByText('회원가입'));
    expect(onClose).toHaveBeenCalled();
    expect(screen.getByTestId('signup-page')).toBeTruthy();
  });

  it('이메일 로그인 성공 → 모달 닫힘', async () => {
    const onClose = mount();
    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'abcd123!' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(loginWithEmail).toHaveBeenCalledWith('a@b.co', 'abcd123!');
  });
});
