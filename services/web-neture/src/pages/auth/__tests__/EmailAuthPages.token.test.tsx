/**
 * WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 — 메일 링크 1회용 토큰은 URL fragment(`#token=`)로 받는다.
 *
 *   - fragment 는 HTTP 요청에 실리지 않으므로 웹 서버 · 인프라 요청 로그에 토큰이 남지 않는다.
 *   - 화면은 fragment 에서 토큰을 읽어 메모리에 두고, **API 응답을 기다리지 않고** 주소에서 fragment 를 지운다.
 *   - query(`?token=`)는 읽지 않는다(호환 fallback 없음).
 *   - API 로는 기존대로 JSON body 로 보낸다(`verifyEmail(token)` · `resetPassword(token, pw)`).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const api = vi.hoisted(() => ({
  verifyEmail: vi.fn(),
  resetPassword: vi.fn(),
}));
vi.mock('../../../lib/apiClient', () => ({ authClient: api }));
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, isLoading: false }),
}));

import { VerifyEmailPage, ResetPasswordPage, readHashToken } from '../EmailAuthPages';

const TOKEN = 'AbC_def-1234567890xyzTOKEN';

/** 실제 주소창(window.location)에서 시작한다 — 메일 링크를 연 상태 */
function mount(path: string, entry: string, element: JSX.Element) {
  window.history.replaceState(null, '', entry);
  return render(
    <BrowserRouter>
      <Routes>
        <Route path={path} element={element} />
      </Routes>
    </BrowserRouter>,
  );
}

/** API 가 불린 순간의 주소창 fragment 를 기록한다 */
let hashAtCall: string[] = [];

beforeEach(() => {
  hashAtCall = [];
  api.verifyEmail.mockReset();
  api.resetPassword.mockReset();
});
afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('readHashToken', () => {
  it('fragment 의 token 만 읽는다', () => {
    expect(readHashToken(`#token=${TOKEN}`)).toBe(TOKEN);
    expect(readHashToken(`#token=${encodeURIComponent('a/b+c')}`)).toBe('a/b+c');
    expect(readHashToken('')).toBeNull();
    expect(readHashToken('#token=')).toBeNull();
    expect(readHashToken('#other=1')).toBeNull();
  });
});

describe('/verify-email', () => {
  it('hash token 을 읽어 body 로 보내고, 응답 전에 fragment 를 지운다', async () => {
    let resolve!: (v: unknown) => void;
    api.verifyEmail.mockImplementation(() => {
      hashAtCall.push(window.location.hash);
      return new Promise((r) => { resolve = r; });
    });

    mount('/verify-email', `/verify-email#token=${TOKEN}`, <VerifyEmailPage />);
    // 렌더 직후(응답 전) 주소창 · history 에 fragment 가 없다
    expect(window.location.hash).toBe('');
    expect(window.location.href).not.toContain(TOKEN);
    expect(window.location.pathname).toBe('/verify-email');

    await waitFor(() => expect(api.verifyEmail).toHaveBeenCalledWith(TOKEN));
    // API 를 부른 시점에도 이미 지워져 있다 — 응답을 기다려 지우지 않는다
    expect(hashAtCall).toEqual(['']);
    expect(api.verifyEmail).toHaveBeenCalledTimes(1);

    resolve({ message: '확인했습니다.' });
    expect(await screen.findByText('확인했습니다.')).toBeTruthy();
  });

  it('query `?token=` 은 읽지 않는다 (fallback 없음)', () => {
    mount('/verify-email', `/verify-email?token=${TOKEN}`, <VerifyEmailPage />);
    expect(api.verifyEmail).not.toHaveBeenCalled();
    expect(screen.getByText('확인 링크가 올바르지 않습니다.')).toBeTruthy();
  });

  it('token 이 없으면 API 를 부르지 않고 안내만 보인다', () => {
    mount('/verify-email', '/verify-email', <VerifyEmailPage />);
    expect(api.verifyEmail).not.toHaveBeenCalled();
    expect(screen.getByText('확인 링크가 올바르지 않습니다.')).toBeTruthy();
  });

  it('잘못된 token 이면 서버 실패를 그대로 안내한다 (fragment 는 이미 지워짐)', async () => {
    api.verifyEmail.mockRejectedValue(new Error('INVALID_OR_EXPIRED_TOKEN'));
    mount('/verify-email', '/verify-email#token=wrong', <VerifyEmailPage />);
    expect(window.location.hash).toBe('');
    await waitFor(() => expect(api.verifyEmail).toHaveBeenCalledWith('wrong'));
    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});

describe('/reset-password', () => {
  it('hash token 을 읽고 즉시 fragment 를 지운 뒤, 제출 시 body 로 보낸다', async () => {
    api.resetPassword.mockResolvedValue({ message: '비밀번호를 바꿨습니다.' });
    mount('/reset-password', `/reset-password#token=${TOKEN}`, <ResetPasswordPage />);

    // 제출 전(=API 호출 전)에 이미 주소창에서 fragment 가 지워져 있다 — 폼은 메모리의 토큰으로 뜬다
    expect(window.location.hash).toBe('');
    expect(window.location.href).not.toContain(TOKEN);
    expect(screen.getByTestId('reset-password-form')).toBeTruthy();

    fireEvent.change(screen.getByTestId('reset-password-new'), { target: { value: 'newpass99$' } });
    fireEvent.change(screen.getByTestId('reset-password-confirm'), { target: { value: 'newpass99$' } });
    fireEvent.submit(screen.getByTestId('reset-password-form'));

    await waitFor(() => expect(api.resetPassword).toHaveBeenCalledWith(TOKEN, 'newpass99$'));
    expect(api.resetPassword).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId('reset-password-done')).toBeTruthy();
  });

  it('query `?token=` 은 읽지 않는다 (fallback 없음)', () => {
    mount('/reset-password', `/reset-password?token=${TOKEN}`, <ResetPasswordPage />);
    expect(screen.queryByTestId('reset-password-form')).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('재설정 링크가 올바르지 않습니다');
  });

  it('token 이 없으면 폼 대신 안내만 보인다', () => {
    mount('/reset-password', '/reset-password', <ResetPasswordPage />);
    expect(screen.queryByTestId('reset-password-form')).toBeNull();
    expect(api.resetPassword).not.toHaveBeenCalled();
  });
});
