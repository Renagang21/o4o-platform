/**
 * <LoginMethods /> — WO-O4O-CROSS-SERVICE-LOGIN-ENTRY-AND-RETURN-FLOW-FIX-V1
 *
 * - 이메일 로그인 성공 → onSuccess(user)
 * - 계정 링크 기본값 = 계정 센터(Neture) 정식 화면(절대 주소)
 * - Google 기본 안내는 Google 버튼이 보일 때만
 * - Google 로그인 성공 → 같은 onSuccess(user)
 * GIS 스크립트는 로드하지 않는다(`renderGoogleButton` mock).
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';

let onCredential: ((t: string) => void) | null = null;
vi.mock('@o4o/auth-client', () => ({
  renderGoogleButton: async (opts: { onCredential: (t: string) => void }) => {
    onCredential = opts.onCredential;
    return () => undefined;
  },
}));

import { LoginMethods, O4O_ACCOUNT_LINKS, DEFAULT_GOOGLE_HINT } from '../LoginMethods';

const USER = { id: 'u-1' };

function mount(enabled: boolean) {
  const props = {
    loginWithEmail: vi.fn(async () => ({ success: true, user: USER })),
    api: { resendVerificationEmail: vi.fn(async () => ({ message: 'ok' })) },
    google: {
      getConfig: vi.fn(async () => ({ enabled, clientId: enabled ? 'public-client-id' : null })),
      loginWithGoogle: vi.fn(async () => ({ success: true, user: USER })),
      signupWithGoogle: vi.fn(async () => ({ success: true, user: USER })),
    },
    onSuccess: vi.fn(),
  };
  render(<LoginMethods {...props} />);
  return props;
}

beforeEach(() => { onCredential = null; });
afterEach(() => cleanup());

describe('LoginMethods', () => {
  it('이메일 로그인 성공 → onSuccess(user)', async () => {
    const p = mount(false);
    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'abcd123!' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    await waitFor(() => expect(p.onSuccess).toHaveBeenCalledWith(USER));
    expect(p.loginWithEmail).toHaveBeenCalledWith('a@b.co', 'abcd123!');
  });

  it('계정 링크 기본값은 Neture 정식 화면', () => {
    mount(false);
    expect(screen.getByText('회원가입').getAttribute('href')).toBe(O4O_ACCOUNT_LINKS.signup);
    expect(screen.getByText('아이디 찾기').getAttribute('href')).toBe(O4O_ACCOUNT_LINKS.findId);
    expect(screen.getByText('비밀번호 찾기').getAttribute('href')).toBe(O4O_ACCOUNT_LINKS.forgotPassword);
    expect(O4O_ACCOUNT_LINKS.signup).toBe('https://neture.co.kr/signup');
  });

  it('Google 준비 중이면 기본 안내 없음, 버튼이 보이면 안내 표시', async () => {
    mount(false);
    await screen.findByTestId('google-continue-disabled');
    expect(screen.queryByText(DEFAULT_GOOGLE_HINT)).toBeNull();
    cleanup();

    mount(true);
    await screen.findByTestId('google-continue-button');
    expect(screen.getByText(DEFAULT_GOOGLE_HINT)).toBeTruthy();
  });

  it('Google 로그인 성공 → 같은 onSuccess(user)', async () => {
    const p = mount(true);
    await waitFor(() => expect(onCredential).not.toBeNull());
    await act(async () => { onCredential!('id-token'); });
    await waitFor(() => expect(p.onSuccess).toHaveBeenCalledWith(USER));
  });
});
