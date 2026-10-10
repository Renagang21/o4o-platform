const TERMS = { policyDocumentId: '11111111-1111-4111-8111-111111111111', version: 1, title: 'Fixture agreement', termsHref: 'https://neture.co.kr/terms' };
/**
 * 이메일·비밀번호 공통 UI + useServiceAuth.loginWithEmail 회귀검증
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1
 *
 * 실 API 는 타지 않는다. "서버가 이렇게 답하면 화면이 이렇게 보인다" 만 고정한다.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, renderHook, act } from '@testing-library/react';
import { StrictMode } from 'react';
import {
  PasswordInput,
  EmailLoginForm,
  EmailSignupForm,
  VerifyEmailView,
  ResetPasswordForm,
  FindLoginIdForm,
  ForgotPasswordForm,
} from '../email';
import { useServiceAuth } from '../useServiceAuth';
import type { AuthClientLike } from '../types';

afterEach(() => cleanup());

function axiosError(status: number, data: Record<string, unknown>) {
  return Object.assign(new Error('Request failed'), { response: { status, data } });
}

const GOOD_PASSWORD = 'abcd123!';

describe('PasswordInput', () => {
  it('보기/숨기기 토글로 type 이 바뀐다', () => {
    render(<PasswordInput label="비밀번호" value="x" onChange={() => {}} autoComplete="current-password" testId="pw" />);
    const input = screen.getByTestId('pw') as HTMLInputElement;
    expect(input.type).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 보기' }));
    expect(input.type).toBe('text');
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 숨기기' }));
    expect(input.type).toBe('password');
  });
});

describe('EmailLoginForm', () => {
  it('로그인 성공 → onSuccess', async () => {
    const onLogin = vi.fn(async () => ({ success: true, user: { id: 'u1' } }));
    const onSuccess = vi.fn();
    render(<EmailLoginForm onLogin={onLogin} onSuccess={onSuccess} api={{ resendVerificationEmail: vi.fn() }} />);
    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: ' a@b.co ' } });
    fireEvent.change(screen.getByTestId('email-login-password'), { target: { value: GOOD_PASSWORD } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onLogin).toHaveBeenCalledWith('a@b.co', GOOD_PASSWORD);
  });

  it('EMAIL_NOT_VERIFIED → 문구 + 재발송 버튼', async () => {
    const onLogin = vi.fn(async () => ({ success: false, error: '이메일 확인이 필요합니다.', code: 'EMAIL_NOT_VERIFIED' }));
    const resend = vi.fn(async () => ({ message: '보냈습니다' }));
    render(<EmailLoginForm onLogin={onLogin} api={{ resendVerificationEmail: resend }} />);
    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByTestId('email-login-password'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    await screen.findByText('이메일 확인이 필요합니다.');
    fireEvent.click(screen.getByRole('button', { name: '확인 메일 다시 보내기' }));
    await screen.findByText('보냈습니다');
    expect(resend).toHaveBeenCalledWith('a@b.co');
  });

  it('회원가입 · 아이디 찾기 · 비밀번호 찾기 링크 + onNavigate', () => {
    const onNavigate = vi.fn();
    render(
      <EmailLoginForm
        onLogin={vi.fn()}
        api={{ resendVerificationEmail: vi.fn() }}
        links={{ signup: '/signup', findId: '/find-id', forgotPassword: '/forgot-password', onNavigate }}
      />,
    );
    fireEvent.click(screen.getByText('회원가입'));
    fireEvent.click(screen.getByText('아이디 찾기'));
    fireEvent.click(screen.getByText('비밀번호 찾기'));
    expect(onNavigate.mock.calls.map((c) => c[0])).toEqual(['/signup', '/find-id', '/forgot-password']);
  });
});

describe('EmailSignupForm', () => {
  function fill(overrides: Partial<Record<'email' | 'name' | 'phone' | 'pw' | 'confirm', string>> = {}) {
    fireEvent.change(screen.getByLabelText('이메일 (로그인 아이디)'), { target: { value: overrides.email ?? 'new@x.com' } });
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: overrides.name ?? '홍길동' } });
    fireEvent.change(screen.getByLabelText('휴대전화'), { target: { value: overrides.phone ?? '010-1234-5678' } });
    fireEvent.change(screen.getByTestId('email-signup-password'), { target: { value: overrides.pw ?? GOOD_PASSWORD } });
    fireEvent.change(screen.getByTestId('email-signup-confirm'), { target: { value: overrides.confirm ?? GOOD_PASSWORD } });
  }
  const submit = () => screen.getByRole('button', { name: '가입하고 확인 메일 받기' }) as HTMLButtonElement;

  it('필수 약관 전까지 제출 불가 → 동의 후 가입 → 확인 메일 안내', async () => {
    const signup = vi.fn(async () => ({ maskedEmail: 'n**@x.com', mailSent: true }));
    render(
      <EmailSignupForm api={{ getSignupTerms: async () => TERMS, signupWithEmail: signup, resendVerificationEmail: vi.fn() }} termsHref="/terms" privacyHref="/privacy" links={{ login: '/login' }} />,
    );
    await screen.findByRole('link', { name: '내용 보기 · 버전 1' });
    fill();
    expect(submit().disabled).toBe(true);
    const boxes = screen.getAllByRole('checkbox');
    fireEvent.click(boxes[0]);
    expect(submit().disabled).toBe(true);
    fireEvent.click(boxes[1]);
    expect(submit().disabled).toBe(false);
    fireEvent.click(submit());
    await screen.findByTestId('email-sent-notice');
    expect(screen.getByText('n**@x.com')).toBeTruthy();
    expect(screen.getByText('로그인하러 가기')).toBeTruthy();
    expect(signup).toHaveBeenCalledWith({
      email: 'new@x.com',
      name: '홍길동',
      phone: '01012345678',
      password: GOOD_PASSWORD,
      consents: { terms: true, privacy: true, marketing: false, termsPolicy: { policyDocumentId: TERMS.policyDocumentId, version: TERMS.version } },
    });
  });

  it('정책 위반 · 확인 불일치 → 안내 + 제출 불가', async () => {
    render(<EmailSignupForm api={{ getSignupTerms: async () => TERMS, signupWithEmail: vi.fn(), resendVerificationEmail: vi.fn() }} termsHref="/t" privacyHref="/p" />);
    await screen.findByRole('link', { name: '내용 보기 · 버전 1' });
    fill({ pw: 'abcd1234', confirm: 'abcd1235' });
    screen.getAllByRole('checkbox').slice(0, 2).forEach((b) => fireEvent.click(b));
    expect(screen.getByText(/특수기호 포함/).textContent).toContain('✕');
    expect(screen.getByTestId('password-confirm-hint').textContent).toContain('일치하지 않습니다');
    expect(submit().disabled).toBe(true);
  });

  it('한글은 특수기호가 아니고 72바이트 초과는 제출 불가', async () => {
    render(<EmailSignupForm api={{ getSignupTerms: async () => TERMS, signupWithEmail: vi.fn(), resendVerificationEmail: vi.fn() }} termsHref="/t" privacyHref="/p" />);
    screen.getAllByRole('checkbox').slice(0, 2).forEach((b) => fireEvent.click(b));
    await screen.findByRole('link', { name: '내용 보기 · 버전 1' });
    fill({ pw: 'abcdef1가', confirm: 'abcdef1가' });
    expect(screen.getByText(/특수기호 포함/).textContent).toContain('✕');
    expect(submit().disabled).toBe(true);
    const tooLong = 'a1!' + '가'.repeat(24);
    await screen.findByRole('link', { name: '내용 보기 · 버전 1' });
    fill({ pw: tooLong, confirm: tooLong });
    expect(screen.getByText(/72바이트 이하/).textContent).toContain('✕');
    expect(submit().disabled).toBe(true);
  });

  it('대소문자 요구 없음 — 소문자만으로 통과', async () => {
    render(<EmailSignupForm api={{ getSignupTerms: async () => TERMS, signupWithEmail: vi.fn(), resendVerificationEmail: vi.fn() }} termsHref="/t" privacyHref="/p" />);
    await screen.findByRole('link', { name: '내용 보기 · 버전 1' });
    fill({ pw: 'abcd123!', confirm: 'abcd123!' });
    screen.getAllByRole('checkbox').slice(0, 2).forEach((b) => fireEvent.click(b));
    expect(submit().disabled).toBe(false);
  });

  it('중복 이메일 → 서버 안내 문구 그대로', async () => {
    const msg = '이미 가입된 이메일입니다. 처음 가입한 방법(Google 또는 이메일)으로 로그인해 주세요.';
    const signup = vi.fn(async () => {
      throw axiosError(409, { success: false, error: msg, code: 'EMAIL_IN_USE' });
    });
    render(<EmailSignupForm api={{ getSignupTerms: async () => TERMS, signupWithEmail: signup, resendVerificationEmail: vi.fn() }} termsHref="/t" privacyHref="/p" />);
    await screen.findByRole('link', { name: '내용 보기 · 버전 1' });
    fill();
    screen.getAllByRole('checkbox').slice(0, 2).forEach((b) => fireEvent.click(b));
    fireEvent.click(submit());
    await screen.findByText(msg);
    expect(screen.queryByTestId('email-sent-notice')).toBeNull();
  });
});

describe('VerifyEmailView', () => {
  it('StrictMode 에서도 토큰을 한 번만 제출한다', async () => {
    const verify = vi.fn(async () => ({ message: '확인 완료' }));
    render(
      <StrictMode>
        <VerifyEmailView api={{ verifyEmail: verify }} token="tok" links={{ login: '/login' }} />
      </StrictMode>,
    );
    await screen.findByText('확인 완료');
    expect(verify).toHaveBeenCalledTimes(1);
    expect(screen.getByText('로그인하러 가기')).toBeTruthy();
  });

  it('만료 토큰 → 서버 문구', async () => {
    const verify = vi.fn(async () => {
      throw axiosError(400, { success: false, error: '링크가 만료되었습니다.', code: 'INVALID_OR_EXPIRED_TOKEN' });
    });
    render(<VerifyEmailView api={{ verifyEmail: verify }} token="old" />);
    await screen.findByText('링크가 만료되었습니다.');
  });
});

describe('ResetPasswordForm · ForgotPasswordForm · FindLoginIdForm', () => {
  it('재설정: 새 비밀번호 + 확인 → 완료 안내', async () => {
    const reset = vi.fn(async () => ({ message: '바꿨습니다' }));
    render(<ResetPasswordForm api={{ resetPassword: reset }} token="t1" links={{ login: '/login' }} />);
    fireEvent.change(screen.getByTestId('reset-password-new'), { target: { value: GOOD_PASSWORD } });
    fireEvent.change(screen.getByTestId('reset-password-confirm'), { target: { value: GOOD_PASSWORD } });
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 바꾸기' }));
    await screen.findByText('바꿨습니다');
    expect(reset).toHaveBeenCalledWith('t1', GOOD_PASSWORD);
  });

  it('비밀번호 찾기: 서버 일반 안내를 보인다', async () => {
    const forgot = vi.fn(async () => ({ message: '가입된 이메일이면 보냈습니다' }));
    render(<ForgotPasswordForm api={{ requestPasswordReset: forgot }} />);
    fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'a@b.co' } });
    fireEvent.click(screen.getByRole('button', { name: '재설정 메일 받기' }));
    await screen.findByText('가입된 이메일이면 보냈습니다');
  });

  it('아이디 찾기: 가린 이메일 힌트', async () => {
    const find = vi.fn(async () => ({ found: true, maskedEmail: 'h***@x.com', message: '일부입니다' }));
    render(<FindLoginIdForm api={{ findLoginId: find }} />);
    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '홍길동' } });
    fireEvent.change(screen.getByLabelText('휴대전화'), { target: { value: '010 1234 5678' } });
    fireEvent.click(screen.getByRole('button', { name: '아이디 찾기' }));
    await screen.findByText('h***@x.com');
    expect(find).toHaveBeenCalledWith('홍길동', '01012345678');
  });
});

describe('useServiceAuth.loginWithEmail', () => {
  const API_USER = { id: 'u-1', email: 'a@b.co', roles: [] };
  function client(loginWithEmail?: AuthClientLike['loginWithEmail']) {
    return {
      loginWithGoogle: vi.fn(),
      signupWithGoogle: vi.fn(),
      getGoogleAuthConfig: vi.fn(),
      loginWithEmail,
      logout: vi.fn(),
      api: { get: vi.fn(async () => { throw new Error('no session'); }), post: vi.fn() },
    } as unknown as AuthClientLike;
  }
  function setup(c: AuthClientLike) {
    return renderHook(() =>
      useServiceAuth({ serviceKey: 'neture', authClient: c, toUser: (u) => u, getAccessToken: () => null }),
    );
  }

  it('성공 → user 채택 (serviceKey 를 본문에 넣지 않는다)', async () => {
    const login = vi.fn(async () => ({ user: API_USER }));
    const { result } = setup(client(login));
    let r: any;
    await act(async () => { r = await result.current.loginWithEmail('a@b.co', GOOD_PASSWORD); });
    expect(r.success).toBe(true);
    expect(login).toHaveBeenCalledWith('a@b.co', GOOD_PASSWORD);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('실패 → 서버 문구 · code 전달', async () => {
    const login = vi.fn(async () => {
      throw axiosError(401, { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.', code: 'INVALID_CREDENTIALS' });
    });
    const { result } = setup(client(login));
    let r: any;
    await act(async () => { r = await result.current.loginWithEmail('a@b.co', 'bad'); });
    expect(r).toMatchObject({ success: false, code: 'INVALID_CREDENTIALS', error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('authClient 에 loginWithEmail 이 없으면 실패 result', async () => {
    const { result } = setup(client(undefined));
    let r: any;
    await act(async () => { r = await result.current.loginWithEmail('a@b.co', 'x'); });
    expect(r.success).toBe(false);
  });
});
