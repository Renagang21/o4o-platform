import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { AUTH_TOKEN_CLEARED_EVENT } from '@o4o/auth-utils';
import { useServiceAuth } from '../useServiceAuth';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const user = (id: string, pendingPolicyAcceptances: unknown[] = []) => ({ id, pendingPolicyAcceptances });
const me = (id: string, pending: unknown[] = []) => ({ data: { data: { user: user(id, pending) } } });
const policy = (id: string) => ({ serviceKey: 'neture', documentType: 'terms', policyDocumentId: id, version: 1, title: 'Fixture' });
function setup(token: string | null = null, strict = false) {
  const client = {
    loginWithGoogle: vi.fn(async (): Promise<unknown> => ({ user: user('current') })),
    signupWithGoogle: vi.fn(async () => ({ user: user('current') })),
    logout: vi.fn(async (): Promise<unknown> => undefined),
    api: {
      get: vi.fn(async (): Promise<{ data: unknown }> => me('initial')),
      post: vi.fn(async (): Promise<{ data: unknown }> => ({ data: {} })),
    },
  };
  const onAuthenticated = vi.fn();
  const hook = renderHook(() => useServiceAuth({
    serviceKey: 'neture', authClient: client, getAccessToken: () => token,
    toUser: (value) => ({ id: String(value.id) }), onAuthenticated,
  }), strict ? { wrapper: StrictMode } : undefined);
  return { hook, client, onAuthenticated, setToken: (value: string | null) => { token = value; } };
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('authentication request lifetimes', () => {
  it('an earlier refresh cannot finish the loading state of a pending login', async () => {
    const h = setup();
    const restore = deferred<{ data: unknown }>();
    const login = deferred<unknown>();
    h.setToken('fixture-token'); h.client.api.get.mockReturnValueOnce(restore.promise);
    h.client.loginWithGoogle.mockReturnValueOnce(login.promise);
    let refreshing!: Promise<void>, signingIn!: ReturnType<typeof h.hook.result.current.loginWithGoogle>;
    act(() => { refreshing = h.hook.result.current.refresh(); signingIn = h.hook.result.current.loginWithGoogle('fixture-proof'); });
    await act(async () => { restore.resolve(me('old')); await refreshing; });
    expect(h.hook.result.current.isLoading).toBe(true);
    expect(h.hook.result.current.user).toBeNull();
    await act(async () => { login.resolve({ user: user('current') }); await signingIn; });
    expect(h.hook.result.current.user?.id).toBe('current');
    expect(h.hook.result.current.isLoading).toBe(false);
  });

  it('a superseded login does not finish loading for the newest login', async () => {
    const h = setup(); const first = deferred<unknown>(), last = deferred<unknown>();
    h.client.loginWithGoogle.mockReturnValueOnce(first.promise).mockReturnValueOnce(last.promise);
    let a!: ReturnType<typeof h.hook.result.current.loginWithGoogle>, b!: typeof a;
    act(() => { a = h.hook.result.current.loginWithGoogle('first'); b = h.hook.result.current.loginWithGoogle('last'); });
    await act(async () => { first.resolve({ user: user('old') }); expect((await a).success).toBe(false); });
    expect(h.hook.result.current.isLoading).toBe(true);
    await act(async () => { last.resolve({ user: user('current') }); await b; });
    expect(h.hook.result.current.user?.id).toBe('current');
    expect(h.onAuthenticated).toHaveBeenCalledTimes(1);
  });

  it('a late logout response cannot clear a newer logged-in user or policy', async () => {
    const h = setup(); const ending = deferred<unknown>(); h.client.logout.mockReturnValueOnce(ending.promise);
    h.client.loginWithGoogle.mockResolvedValueOnce({ user: user('current', [policy('current-policy')]) });
    let logout!: Promise<void>;
    act(() => { logout = h.hook.result.current.logout(); });
    await act(async () => { await h.hook.result.current.loginWithGoogle('fixture'); });
    await act(async () => { ending.resolve(undefined); await logout; });
    expect(h.hook.result.current.user?.id).toBe('current');
    expect(h.hook.result.current.pendingPolicyAcceptances).toEqual([policy('current-policy')]);
  });

  it.each(['logout', 'token-clear'] as const)('%s immediately ends an invalidated pending login', async (action) => {
    const h = setup(); const login = deferred<unknown>(); h.client.loginWithGoogle.mockReturnValueOnce(login.promise);
    let pending!: ReturnType<typeof h.hook.result.current.loginWithGoogle>;
    act(() => { pending = h.hook.result.current.loginWithGoogle('fixture'); });
    await act(async () => {
      if (action === 'logout') await h.hook.result.current.logout();
      else window.dispatchEvent(new Event(AUTH_TOKEN_CLEARED_EVENT));
    });
    expect(h.hook.result.current.isLoading).toBe(false);
    await act(async () => { login.resolve({ user: user('old') }); expect((await pending).success).toBe(false); });
    expect(h.hook.result.current.user).toBeNull();
  });

  it('out-of-order refreshes retain the latest request user and pending policies', async () => {
    const h = setup('fixture-token');
    await waitFor(() => expect(h.hook.result.current.user?.id).toBe('initial'));
    const first = deferred<{ data: unknown }>(), last = deferred<{ data: unknown }>();
    h.client.api.get.mockReturnValueOnce(first.promise).mockReturnValueOnce(last.promise);
    let a!: Promise<void>, b!: Promise<void>;
    act(() => { a = h.hook.result.current.refresh(); b = h.hook.result.current.refresh(); });
    await act(async () => { last.resolve(me('current', [policy('current-policy')])); await b; });
    await act(async () => { first.resolve(me('old', [policy('old-policy')])); await a; });
    expect(h.hook.result.current.user?.id).toBe('current');
    expect(h.hook.result.current.pendingPolicyAcceptances).toEqual([policy('current-policy')]);
  });

  it('an unmounted login never invokes the consumer authentication callback', async () => {
    const h = setup(); const login = deferred<unknown>(); h.client.loginWithGoogle.mockReturnValueOnce(login.promise);
    let pending!: ReturnType<typeof h.hook.result.current.loginWithGoogle>;
    act(() => { pending = h.hook.result.current.loginWithGoogle('fixture'); });
    h.hook.unmount();
    await act(async () => { login.resolve({ user: user('old') }); await pending; });
    expect(h.onAuthenticated).not.toHaveBeenCalled();
  });

  it('a previous session policy submission cannot continue or replace the next session', async () => {
    const h = setup('fixture-token'); const post = deferred<{ data: unknown }>();
    h.client.api.get.mockResolvedValue(me('initial', [policy('old-one'), policy('old-two')]));
    await act(async () => { await h.hook.result.current.refresh(); });
    await waitFor(() => expect(h.hook.result.current.pendingPolicyAcceptances).toHaveLength(2));
    h.client.api.post.mockReturnValueOnce(post.promise);
    h.client.loginWithGoogle.mockResolvedValueOnce({ user: user('current', [policy('current-policy')]) });
    let accepting!: ReturnType<typeof h.hook.result.current.acceptPendingPolicies>;
    act(() => { accepting = h.hook.result.current.acceptPendingPolicies(); });
    await act(async () => { await h.hook.result.current.loginWithGoogle('fixture'); });
    await act(async () => { post.resolve({ data: { data: { pending: [policy('old-two')] } } }); await accepting; });
    expect(h.client.api.post).toHaveBeenCalledTimes(1);
    expect(h.hook.result.current.user?.id).toBe('current');
    expect(h.hook.result.current.pendingPolicyAcceptances).toEqual([policy('current-policy')]);
  });

  it.each(['before-login', 'after-login'] as const)('a refresh begun during login cannot adopt an old identity (%s)', async (order) => {
    const h = setup(); const login = deferred<unknown>(), read = deferred<{ data: unknown }>();
    h.setToken('fixture-token'); h.client.loginWithGoogle.mockReturnValueOnce(login.promise);
    h.client.api.get.mockReturnValueOnce(read.promise);
    let signingIn!: ReturnType<typeof h.hook.result.current.loginWithGoogle>, refreshing!: Promise<void>;
    act(() => { signingIn = h.hook.result.current.loginWithGoogle('fixture'); refreshing = h.hook.result.current.refresh(); });
    if (order === 'before-login') {
      await act(async () => { read.resolve(me('old')); await refreshing; });
      expect(h.hook.result.current.isLoading).toBe(true);
      expect(h.hook.result.current.user).toBeNull();
    }
    await act(async () => { login.resolve({ user: user('current') }); await signingIn; });
    if (order === 'after-login') await act(async () => { read.resolve(me('old')); await refreshing; });
    expect(h.hook.result.current.user?.id).toBe('current');
    expect(h.onAuthenticated).toHaveBeenCalledTimes(1);
  });

  it('a superseded login failure returns cancellation instead of an old server error', async () => {
    const h = setup(); const first = deferred<unknown>();
    h.client.loginWithGoogle.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ user: user('current') });
    let pending!: ReturnType<typeof h.hook.result.current.loginWithGoogle>;
    act(() => { pending = h.hook.result.current.loginWithGoogle('old'); });
    await act(async () => { await h.hook.result.current.loginWithGoogle('current'); });
    await act(async () => {
      first.reject({ response: { status: 403, data: { code: 'ACCOUNT_NOT_ACTIVE' } } });
      expect(await pending).toMatchObject({ success: false, error: '로그인이 취소되었습니다. 다시 시도해 주세요.' });
    });
    expect(h.hook.result.current.user?.id).toBe('current');
  });

  it('StrictMode restores once without accepting the abandoned mount response', async () => {
    const h = setup('fixture-token', true);
    await waitFor(() => expect(h.hook.result.current.user?.id).toBe('initial'));
    expect(h.client.api.get).toHaveBeenCalledTimes(2);
    expect(h.onAuthenticated).toHaveBeenCalledTimes(1);
    expect(h.hook.result.current.isLoading).toBe(false);
  });

  it('an older policy response cannot undo the latest completion in the same session', async () => {
    const h = setup('fixture-token');
    h.client.api.get.mockResolvedValue(me('initial', [policy('pending')]));
    await act(async () => { await h.hook.result.current.refresh(); });
    await waitFor(() => expect(h.hook.result.current.pendingPolicyAcceptances).toHaveLength(1));
    const first = deferred<{ data: unknown }>(), last = deferred<{ data: unknown }>();
    h.client.api.post.mockReturnValueOnce(first.promise).mockReturnValueOnce(last.promise);
    let a!: ReturnType<typeof h.hook.result.current.acceptPendingPolicies>, b!: typeof a;
    act(() => { a = h.hook.result.current.acceptPendingPolicies(); b = h.hook.result.current.acceptPendingPolicies(); });
    h.client.api.get.mockResolvedValue(me('initial'));
    await act(async () => { last.resolve({ data: { data: { pending: [] } } }); expect((await b).success).toBe(true); });
    await act(async () => { first.resolve({ data: { data: { pending: [policy('old')] } } }); expect((await a).success).toBe(false); });
    expect(h.hook.result.current.pendingPolicyAcceptances).toEqual([]);
  });
});
