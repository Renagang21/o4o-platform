import { useEffect, useRef, useState } from 'react';
import { authClient } from '@o4o/auth-client';
import { BaseDetailDrawer } from '@o4o/ui';
import { centralMenusForRole, type CentralOperationMenu } from '@o4o/types';

export function CentralMenuSelection({ role, value, onChange, disabled = false, available = centralMenusForRole(role) }: {
  role: string; value: string[]; onChange(keys: string[]): void; disabled?: boolean; available?: readonly CentralOperationMenu[];
}) {
  return <fieldset disabled={disabled} className="my-4 rounded border p-4"><legend>위임할 운영 업무</legend>
    <p className="mb-2 text-sm text-slate-600">선택한 메뉴의 업무만 처리합니다. 다른 서비스와 독립 사업자의 권한은 포함하지 않습니다.</p>
    <div className="grid gap-2 md:grid-cols-2">{available.map(menu => <label key={menu.key} className="flex items-center gap-2">
      <input type="checkbox" checked={value.includes(menu.key)} onChange={event => onChange(event.target.checked ? [...value, menu.key] : value.filter(key => key !== menu.key))} />{menu.label}
    </label>)}</div>
    {value.length === 0 && <p className="mt-2 text-sm text-amber-800">선택된 업무가 없습니다. 업무 운영 화면에 진입할 수 없습니다.</p>}
  </fieldset>;
}
interface Grant { available: CentralOperationMenu[]; menuKeys: string[]; version: string | null }
export function CentralMenuGrantEditor({ userId, role, onClose, onSaved }: { userId: string; role: string; onClose(): void; onSaved(): void }) {
  const [grant, setGrant] = useState<Grant | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const writing = useRef(false);
  const mounted = useRef(false);
  const load = async () => {
    setGrant(null); setError('');
    try {
      const response = await authClient.api.get('/admin/service-operator-invitations/menu-grants', { params: { userId, role } });
      if (mounted.current) setGrant(response.data.data);
    } catch { if (mounted.current) setError('유효한 중앙 위임을 조회하지 못했습니다. 초대 수락·유효기간을 확인해 주세요.'); }
  };
  useEffect(() => { mounted.current = true; void load(); return () => { mounted.current = false; }; }, [userId, role]);
  async function save() {
    if (!grant || !reason.trim() || writing.current) return;
    writing.current = true; setBusy(true); setError('');
    try {
      const response = await authClient.api.patch('/admin/service-operator-invitations/menu-grants', { userId, role, menuKeys: grant.menuKeys, version: grant.version, reason });
      if (mounted.current) { setGrant({ ...grant, ...response.data.data }); onSaved(); onClose(); }
    } catch (failure) {
      if (mounted.current) setError((failure as { response?: { data?: { error?: string } } }).response?.data?.error ?? '업무 위임을 저장하지 못했습니다. 최신 설정을 다시 조회해 주세요.');
    } finally { writing.current = false; if (mounted.current) setBusy(false); }
  }
  return <BaseDetailDrawer open title="업무 운영 설정" onClose={() => { if (!writing.current) onClose(); }}>
    <p>{role}</p>{error && <p role="alert" className="my-3 text-red-700">{error}</p>}
    {!grant ? <button type="button" onClick={() => void load()}>다시 조회</button> : <>
      <CentralMenuSelection role={role} available={grant.available} value={grant.menuKeys} disabled={busy} onChange={menuKeys => setGrant({ ...grant, menuKeys })} />
      <label className="block">변경 사유<textarea className="my-2 block w-full rounded border p-2" maxLength={2000} disabled={busy} value={reason} onChange={event => setReason(event.target.value)} /></label>
      <button type="button" className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50" disabled={busy || !reason.trim()} onClick={() => void save()}>{busy ? '저장 중…' : '업무 위임 저장'}</button>
    </>}
  </BaseDetailDrawer>;
}
