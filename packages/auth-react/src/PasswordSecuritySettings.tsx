import { useEffect, useState } from 'react';
import type { AuthClient } from '@o4o/auth-client';
import { checkPasswordPolicy } from '@o4o/auth-utils';
import { PasswordInput } from './email/PasswordInput';
import { PasswordPolicyHints } from './email/PasswordPolicyHints';

export interface PasswordSecuritySettingsProps {
  client: Pick<AuthClient, 'getPasswordStatus' | 'setPassword'>;
  onSessionEnded?: () => void;
  notify?: { success: (message: string) => void };
}

/** Account-level password management; Demo/admin restrictions also apply on the server. */
export function PasswordSecuritySettings({ client, onSessionEnded, notify }: PasswordSecuritySettingsProps) {
  const [status, setStatus] = useState<{ hasPassword: boolean; canManage: boolean } | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void client.getPasswordStatus().then((value) => { if (active) setStatus(value); })
      .catch(() => { if (active) setError('비밀번호 설정을 불러오지 못했습니다. 다시 시도해 주세요.'); });
    return () => { active = false; };
  }, [client]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!status?.canManage || busy) return;
    if (newPassword !== confirmation) { setError('새 비밀번호가 서로 일치하지 않습니다.'); return; }
    if (checkPasswordPolicy(newPassword).length) { setError('비밀번호 조건을 확인해 주세요.'); return; }
    if (status.hasPassword && !currentPassword) { setError('현재 비밀번호를 입력해 주세요.'); return; }
    setBusy(true); setError('');
    try {
      await client.setPassword({ ...(status.hasPassword && { currentPassword }), newPassword });
      setCurrentPassword(''); setNewPassword(''); setConfirmation('');
      notify?.success('비밀번호를 저장했습니다. 새 비밀번호로 다시 로그인해 주세요.');
      onSessionEnded?.();
    } catch (failure) {
      const code = (failure as { response?: { data?: { code?: string } } }).response?.data?.code;
      setError(code === 'CURRENT_PASSWORD_MISMATCH' ? '현재 비밀번호가 올바르지 않습니다.' :
        code === 'DEMO_ACCOUNT_FORBIDDEN' ? 'Demo 계정은 비밀번호를 변경할 수 없습니다.' :
        '비밀번호를 저장하지 못했습니다. 입력 내용을 확인하고 다시 시도해 주세요.');
    } finally { setBusy(false); }
  };
  return (
    <section className="mb-6 rounded-xl border border-gray-200 p-4" aria-label="비밀번호 설정">
      <h2 className="mb-2 text-lg font-semibold">{status?.hasPassword ? '비밀번호 변경' : '비밀번호 설정'}</h2>
      {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
      {!status && !error && <p>설정을 불러오는 중입니다.</p>}
      {status && !status.canManage && <p className="text-sm text-gray-600">이 계정에서는 비밀번호 설정을 변경할 수 없습니다.</p>}
      {status?.canManage && (
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <p className="text-sm text-gray-600">저장하면 모든 서비스의 기존 세션이 종료됩니다. 다시 로그인해 주세요.</p>
          {status.hasPassword && <PasswordInput label="현재 비밀번호" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" disabled={busy} />}
          <PasswordInput label="새 비밀번호" value={newPassword} onChange={setNewPassword} autoComplete="new-password" disabled={busy} />
          <PasswordPolicyHints password={newPassword} />
          <PasswordInput label="새 비밀번호 확인" value={confirmation} onChange={setConfirmation} autoComplete="new-password" disabled={busy} />
          <button type="submit" disabled={busy} className="rounded-lg bg-gray-900 px-4 py-2 text-white disabled:opacity-50">{busy ? '저장 중...' : '비밀번호 저장'}</button>
        </form>
      )}
    </section>
  );
}
