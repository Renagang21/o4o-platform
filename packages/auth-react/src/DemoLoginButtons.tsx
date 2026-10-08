import { useRef, useState } from 'react';
import { PUBLIC_DEMO_ACCOUNTS } from '@o4o/auth-utils';
import type { AuthLoginResult } from './types';

export interface DemoLoginButtonsProps<TUser> {
  loginWithEmail: (email: string, password: string) => Promise<AuthLoginResult<TUser>>;
  onSuccess: (user: TUser) => void;
  onFailure?: (result: AuthLoginResult<TUser>) => void;
}

/** Uses ordinary authentication; never grants roles or bypasses service guards. */
export function DemoLoginButtons<TUser>({ loginWithEmail, onSuccess, onFailure }: DemoLoginButtonsProps<TUser>) {
  const lock = useRef(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const login = async (account: typeof PUBLIC_DEMO_ACCOUNTS[number]) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(account.type);
    setError(null);
    try {
      const result = await loginWithEmail(account.email, account.password);
      if (result.success && result.user) onSuccess(result.user);
      else {
        setError(result.error || '테스트 계정으로 로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        onFailure?.(result);
      }
    } catch {
      setError('테스트 계정으로 로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      lock.current = false;
      setBusy(null);
    }
  };
  return <section aria-label="테스트 계정 체험" data-testid="demo-login-buttons">
    <p style={{ fontSize: 13, color: '#6b7280' }}>테스트 계정으로 서비스를 체험할 수 있습니다.</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {PUBLIC_DEMO_ACCOUNTS.map((account) => <button key={account.type} type="button"
        disabled={busy !== null} onClick={() => void login(account)}
        style={{ flex: 1, padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, cursor: busy ? 'wait' : 'pointer' }}>
        {busy === account.type ? '로그인 중…' : account.label}
      </button>)}
    </div>
    {error && <p role="alert" style={{ color: '#b91c1c', fontSize: 13 }}>{error}</p>}
  </section>;
}
