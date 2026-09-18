/**
 * <GoogleContinue /> 회귀검증 — WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1 (WO-2D)
 *
 * GIS 스크립트는 로드하지 않는다(`renderGoogleButton` mock). 보증하는 것은
 * "config → 버튼 → credential → login → (미등록) 동의 → signup" 의 상태 전이와
 * 동의 없이는 signup 이 호출되지 않는다는 점이다.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup, act } from '@testing-library/react';

const renderGoogleButton = vi.fn();
vi.mock('@o4o/auth-client', () => ({
  renderGoogleButton: (opts: unknown) => renderGoogleButton(opts),
}));

import { GoogleContinue } from '../GoogleContinue';

type Captured = { onCredential: (t: string) => void };
let captured: Captured | null = null;

beforeEach(() => {
  captured = null;
  renderGoogleButton.mockImplementation(async (opts: Captured) => {
    captured = opts;
    return () => undefined;
  });
});
afterEach(() => {
  cleanup();
  renderGoogleButton.mockReset();
});

const USER = { id: 'u-1' };

function mount(overrides: Partial<Parameters<typeof GoogleContinue>[0]> = {}) {
  const props = {
    getConfig: vi.fn(async () => ({ enabled: true, clientId: 'public-client-id' })),
    loginWithGoogle: vi.fn(async () => ({ success: true, user: USER })),
    signupWithGoogle: vi.fn(async () => ({ success: true, user: USER })),
    onSuccess: vi.fn(),
    onError: vi.fn(),
    ...overrides,
  };
  render(<GoogleContinue {...props} />);
  return props;
}

describe('GoogleContinue — 준비 상태', () => {
  it('allowlist 가 비어 있으면(enabled=false) 버튼 대신 "준비 중" 을 보여주고 GIS 를 로드하지 않는다', async () => {
    mount({ getConfig: vi.fn(async () => ({ enabled: false, clientId: null })) });
    await screen.findByTestId('google-continue-disabled');
    expect(renderGoogleButton).not.toHaveBeenCalled();
  });

  it('config 조회 실패도 "준비 중" 으로 안전하게 떨어진다', async () => {
    mount({ getConfig: vi.fn(async () => { throw new Error('network'); }) });
    await screen.findByTestId('google-continue-disabled');
  });

  it('enabled 면 공개 clientId 로 GIS 버튼을 렌더한다', async () => {
    mount();
    await waitFor(() => expect(renderGoogleButton).toHaveBeenCalledTimes(1));
    expect(renderGoogleButton.mock.calls[0][0]).toMatchObject({ clientId: 'public-client-id' });
  });
});

describe('GoogleContinue — 로그인 · 가입 전이', () => {
  it('등록된 sub: credential → loginWithGoogle → onSuccess(isNewUser=false)', async () => {
    const p = mount();
    await waitFor(() => expect(captured).not.toBeNull());
    await act(async () => { captured!.onCredential('id-token'); });

    await waitFor(() => expect(p.onSuccess).toHaveBeenCalledWith({ user: USER, isNewUser: false }));
    expect(p.loginWithGoogle).toHaveBeenCalledWith('id-token');
    expect(p.signupWithGoogle).not.toHaveBeenCalled();
  });

  it('미등록 sub: GOOGLE_SIGNUP_REQUIRED → 동의 화면 → 필수 2항목 없이는 signup 호출 0', async () => {
    const p = mount({
      loginWithGoogle: vi.fn(async () => ({ success: false, code: 'GOOGLE_SIGNUP_REQUIRED', status: 404, error: 'x' })),
    });
    await waitFor(() => expect(captured).not.toBeNull());
    await act(async () => { captured!.onCredential('id-token'); });

    await screen.findByTestId('google-continue-consent');
    fireEvent.click(screen.getByText('동의하고 계정 만들기'));
    await screen.findByRole('alert');
    expect(p.signupWithGoogle).not.toHaveBeenCalled();
    expect(p.onSuccess).not.toHaveBeenCalled();
  });

  it('미등록 sub: 약관+개인정보 동의 → signupWithGoogle(idToken, consents) → onSuccess(isNewUser=true)', async () => {
    const p = mount({
      loginWithGoogle: vi.fn(async () => ({ success: false, code: 'GOOGLE_SIGNUP_REQUIRED', status: 404, error: 'x' })),
    });
    await waitFor(() => expect(captured).not.toBeNull());
    await act(async () => { captured!.onCredential('id-token'); });
    await screen.findByTestId('google-continue-consent');

    const boxes = screen.getAllByRole('checkbox');
    fireEvent.click(boxes[0]); // 이용약관
    fireEvent.click(boxes[1]); // 개인정보
    fireEvent.click(screen.getByText('동의하고 계정 만들기'));

    await waitFor(() => expect(p.onSuccess).toHaveBeenCalledWith({ user: USER, isNewUser: true }));
    expect(p.signupWithGoogle).toHaveBeenCalledWith('id-token', { terms: true, privacy: true, marketing: false });
  });

  it('signup 이 EMAIL_IN_USE 로 실패하면 onError 에 code 를 전달하고 동의 화면에 머문다 (자동 연결 없음)', async () => {
    const p = mount({
      loginWithGoogle: vi.fn(async () => ({ success: false, code: 'GOOGLE_SIGNUP_REQUIRED', status: 404, error: 'x' })),
      signupWithGoogle: vi.fn(async () => ({ success: false, code: 'EMAIL_IN_USE', status: 409, error: '이미 사용 중' })),
    });
    await waitFor(() => expect(captured).not.toBeNull());
    await act(async () => { captured!.onCredential('id-token'); });
    await screen.findByTestId('google-continue-consent');
    const boxes = screen.getAllByRole('checkbox');
    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[1]);
    fireEvent.click(screen.getByText('동의하고 계정 만들기'));

    await waitFor(() => expect(p.onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'EMAIL_IN_USE' })));
    expect(screen.getByTestId('google-continue-consent')).toBeTruthy();
    expect(p.onSuccess).not.toHaveBeenCalled();
  });

  it('차단 계정(ACCOUNT_NOT_ACTIVE)은 onError 로 accountStatus 를 전달하고 버튼으로 되돌아간다', async () => {
    const p = mount({
      loginWithGoogle: vi.fn(async () => ({ success: false, code: 'ACCOUNT_NOT_ACTIVE', accountStatus: 'suspended', status: 403, error: '정지' })),
    });
    await waitFor(() => expect(captured).not.toBeNull());
    await act(async () => { captured!.onCredential('id-token'); });

    await waitFor(() => expect(p.onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'ACCOUNT_NOT_ACTIVE', accountStatus: 'suspended' })));
    await waitFor(() => expect(renderGoogleButton).toHaveBeenCalledTimes(2));
    expect(p.signupWithGoogle).not.toHaveBeenCalled();
  });
});
