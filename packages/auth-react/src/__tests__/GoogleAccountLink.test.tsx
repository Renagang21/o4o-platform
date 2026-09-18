/**
 * <GoogleAccountLink /> 회귀검증 — WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1 §8·§9·§11
 *
 * GIS 스크립트는 로드하지 않는다(`renderGoogleButton` mock). 보증하는 것은
 * "status → (미연결) 비밀번호 → GIS 버튼 → credential → linkGoogle(idToken, currentPassword) → 연결됨" 의 상태 전이,
 * Google-only 계정에는 비밀번호 UI 가 없다는 점, 실패 시 비밀번호가 state 에 남지 않는다는 점이다.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup, act } from '@testing-library/react';

const renderGoogleButton = vi.fn();
vi.mock('@o4o/auth-client', () => ({
  renderGoogleButton: (opts: unknown) => renderGoogleButton(opts),
}));

import { GoogleAccountLink } from '../GoogleAccountLink';

type Captured = { clientId: string; onCredential: (t: string) => void };
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

function axiosError(status: number, code: string, error: string) {
  return Object.assign(new Error(error), { response: { status, data: { success: false, error, code } } });
}

function mount(overrides: Partial<Parameters<typeof GoogleAccountLink>[0]> = {}) {
  const props = {
    getConfig: vi.fn(async () => ({ enabled: true, clientId: 'public-client-id' })),
    getStatus: vi.fn(async () => ({ linked: false, passwordSet: true })),
    linkGoogle: vi.fn(async () => ({ linked: true as const, alreadyLinked: false })),
    onLinked: vi.fn(),
    onError: vi.fn(),
    ...overrides,
  };
  render(<GoogleAccountLink {...props} />);
  return props;
}

async function goToGoogleStage(password = 'correct-pw') {
  fireEvent.click(await screen.findByRole('button', { name: 'Google 계정 연결' }));
  await screen.findByTestId('google-account-link-password');
  fireEvent.change(screen.getByLabelText('현재 비밀번호'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  await screen.findByTestId('google-account-link-google');
  await waitFor(() => expect(captured).not.toBeNull());
}

describe('GoogleAccountLink — 상태 표시', () => {
  it('status 가 null(미로그인·오류) 이면 아무것도 그리지 않는다', async () => {
    mount({ getStatus: vi.fn(async () => null) });
    await waitFor(() => expect(screen.queryByTestId('google-account-link')).toBeNull());
    expect(renderGoogleButton).not.toHaveBeenCalled();
  });

  it('이미 연결된 계정은 "연결됨 ✓" 만 보여준다', async () => {
    mount({ getStatus: vi.fn(async () => ({ linked: true, passwordSet: true })) });
    await screen.findByTestId('google-account-link-linked');
    expect(screen.queryByRole('button', { name: 'Google 계정 연결' })).toBeNull();
  });

  it('Google-only 계정(passwordSet=false)은 "연결됨 ✓" 만 — 비밀번호 입력 UI 없음 (§9)', async () => {
    mount({ getStatus: vi.fn(async () => ({ linked: true, passwordSet: false })) });
    await screen.findByTestId('google-account-link-linked');
    expect(screen.queryByLabelText('현재 비밀번호')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Google 계정 연결' })).toBeNull();
  });

  it('미연결 + password 보유 → "연결되지 않음" + [Google 계정 연결]', async () => {
    mount();
    await screen.findByRole('button', { name: 'Google 계정 연결' });
    expect(screen.getByText('연결되지 않음')).toBeTruthy();
    expect(renderGoogleButton).not.toHaveBeenCalled();
  });
});

describe('GoogleAccountLink — 연결 흐름', () => {
  it('비밀번호 입력 → 공개 clientId 로 GIS 버튼 → credential → linkGoogle(idToken, currentPassword) → 연결됨', async () => {
    const props = mount();
    await goToGoogleStage('correct-pw');

    expect(props.getConfig).toHaveBeenCalledTimes(1);
    expect(captured!.clientId).toBe('public-client-id');
    await act(async () => { captured!.onCredential('google-id-token'); });

    await screen.findByTestId('google-account-link-linked');
    expect(props.linkGoogle).toHaveBeenCalledWith('google-id-token', 'correct-pw');
    expect(props.onLinked).toHaveBeenCalledWith({ linked: true, alreadyLinked: false });
    expect(props.onError).not.toHaveBeenCalled();
  });

  it('비밀번호가 비어 있으면 GIS 를 열지 않는다', async () => {
    const props = mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Google 계정 연결' }));
    await screen.findByTestId('google-account-link-password');
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await screen.findByRole('alert');
    expect(props.getConfig).not.toHaveBeenCalled();
    expect(renderGoogleButton).not.toHaveBeenCalled();
  });

  it('allowlist 가 비어 있으면(enabled=false) "준비 중" — linkGoogle 호출 0', async () => {
    const props = mount({ getConfig: vi.fn(async () => ({ enabled: false, clientId: null })) });
    fireEvent.click(await screen.findByRole('button', { name: 'Google 계정 연결' }));
    fireEvent.change(await screen.findByLabelText('현재 비밀번호'), { target: { value: 'pw' } });
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await screen.findByTestId('google-account-link-disabled');
    expect(renderGoogleButton).not.toHaveBeenCalled();
    expect(props.linkGoogle).not.toHaveBeenCalled();
  });

  it('401 INVALID_PASSWORD → 오류 표시 + 비밀번호 재입력 단계(입력값은 비워진다)', async () => {
    const props = mount({
      linkGoogle: vi.fn(async () => { throw axiosError(401, 'INVALID_PASSWORD', '현재 비밀번호가 올바르지 않습니다.'); }),
    });
    await goToGoogleStage('wrong-pw');
    await act(async () => { captured!.onCredential('google-id-token'); });

    await screen.findByTestId('google-account-link-password');
    expect(screen.getByRole('alert').textContent).toContain('현재 비밀번호가 올바르지 않습니다.');
    expect((screen.getByLabelText('현재 비밀번호') as HTMLInputElement).value).toBe('');
    expect(props.onError).toHaveBeenCalledWith({ message: '현재 비밀번호가 올바르지 않습니다.', code: 'INVALID_PASSWORD' });
    expect(screen.queryByTestId('google-account-link-linked')).toBeNull();
  });

  it('409 GOOGLE_IDENTITY_IN_USE(다른 사용자의 Google 계정) → 오류 표시 + 처음 상태, 연결됨 표시 없음 (§11)', async () => {
    const props = mount({
      linkGoogle: vi.fn(async () => { throw axiosError(409, 'GOOGLE_IDENTITY_IN_USE', '이 Google 계정은 이미 다른 사용자에게 연결되어 있습니다.'); }),
    });
    await goToGoogleStage();
    await act(async () => { captured!.onCredential('google-id-token'); });

    await screen.findByRole('button', { name: 'Google 계정 연결' });
    expect(screen.getByRole('alert').textContent).toContain('이미 다른 사용자에게 연결');
    expect(props.onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'GOOGLE_IDENTITY_IN_USE' }));
    expect(screen.queryByTestId('google-account-link-linked')).toBeNull();
    expect(props.onLinked).not.toHaveBeenCalled();
  });

  it('멱등(alreadyLinked=true) 응답도 연결됨으로 표시한다', async () => {
    const props = mount({ linkGoogle: vi.fn(async () => ({ linked: true as const, alreadyLinked: true })) });
    await goToGoogleStage();
    await act(async () => { captured!.onCredential('google-id-token'); });
    await screen.findByTestId('google-account-link-linked');
    expect(props.onLinked).toHaveBeenCalledWith({ linked: true, alreadyLinked: true });
  });

  it('취소하면 비밀번호를 비우고 처음 상태로 돌아간다', async () => {
    mount();
    await goToGoogleStage('secret');
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    await screen.findByRole('button', { name: 'Google 계정 연결' });
    fireEvent.click(screen.getByRole('button', { name: 'Google 계정 연결' }));
    expect((await screen.findByLabelText('현재 비밀번호') as HTMLInputElement).value).toBe('');
  });
});
