import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { KakaoContinue } from '../KakaoContinue';

afterEach(() => { cleanup(); vi.useRealTimers(); });
const handlers = () => ({ startKakaoLogin: vi.fn(), loginWithKakao: vi.fn(), signupWithKakao: vi.fn(), onSuccess: vi.fn() });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
function setup(getKakaoAuthConfig: () => Promise<{ enabled: boolean }>) {
  const methods = handlers();
  const view = render(<KakaoContinue client={{ getSignupTerms: async () => ({ policyDocumentId: '11111111-1111-4111-8111-111111111111', version: 1, title: 'Fixture agreement', termsHref: 'https://neture.co.kr/terms' }), getKakaoAuthConfig, startKakaoLogin: methods.startKakaoLogin }} {...methods} />);
  return { ...methods, ...view };
}

describe('Kakao configuration recovery', () => {
  it('shows pending configuration without starting authentication', async () => {
    const pending = deferred<{ enabled: boolean }>();
    const methods = setup(() => pending.promise);
    expect(screen.getByText('카카오 로그인을 불러오고 있습니다…')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '카카오로 계속하기' })).toBeNull();
    expect(methods.startKakaoLogin).not.toHaveBeenCalled();
    await act(async () => { pending.resolve({ enabled: true }); });
    expect(screen.getByRole('button', { name: '카카오로 계속하기' })).toBeTruthy();
  });

  it('reports transport failure and restores the button through a read-only retry', async () => {
    const getConfig = vi.fn().mockRejectedValueOnce(new Error('synthetic network failure')).mockResolvedValueOnce({ enabled: true });
    const methods = setup(getConfig);
    expect(await screen.findByText('카카오 로그인을 불러오지 못했습니다. 다시 시도해 주세요.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '카카오 로그인 다시 불러오기' }));
    expect(await screen.findByRole('button', { name: '카카오로 계속하기' })).toBeTruthy();
    expect(getConfig).toHaveBeenCalledTimes(2);
    expect(methods.startKakaoLogin).not.toHaveBeenCalled();
    expect(methods.loginWithKakao).not.toHaveBeenCalled();
    expect(methods.signupWithKakao).not.toHaveBeenCalled();
  });

  it('times out a stalled lookup and ignores its late result after retry', async () => {
    vi.useFakeTimers();
    const pending = deferred<{ enabled: boolean }>();
    const getConfig = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValueOnce({ enabled: true });
    setup(getConfig);
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(screen.getByText('카카오 로그인을 불러오지 못했습니다. 다시 시도해 주세요.')).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '카카오 로그인 다시 불러오기' })); });
    expect(screen.getByRole('button', { name: '카카오로 계속하기' })).toBeTruthy();
    await act(async () => { pending.resolve({ enabled: false }); });
    expect(screen.getByRole('button', { name: '카카오로 계속하기' })).toBeTruthy();
    expect(getConfig).toHaveBeenCalledTimes(2);
  });

  it('reports an invalid configuration response instead of treating it as disabled', async () => {
    setup(vi.fn().mockResolvedValue(undefined));
    expect(await screen.findByText('카카오 로그인을 불러오지 못했습니다. 다시 시도해 주세요.')).toBeTruthy();
    expect(screen.getByRole('button', { name: '카카오 로그인 다시 불러오기' })).toBeTruthy();
  });

  it('keeps an explicitly unconfigured provider hidden after the lookup resolves', async () => {
    const getConfig = vi.fn().mockResolvedValue({ enabled: false });
    setup(getConfig);
    await waitFor(() => expect(screen.queryByText('카카오 로그인을 불러오고 있습니다…')).toBeNull());
    expect(getConfig).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: '카카오로 계속하기' })).toBeNull();
    expect(screen.queryByRole('button', { name: '카카오 로그인 다시 불러오기' })).toBeNull();
  });

  it('cleans the lookup deadline on unmount', async () => {
    vi.useFakeTimers();
    const pending = deferred<{ enabled: boolean }>();
    const view = setup(() => pending.promise);
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
    await act(async () => { pending.resolve({ enabled: true }); });
  });
});
