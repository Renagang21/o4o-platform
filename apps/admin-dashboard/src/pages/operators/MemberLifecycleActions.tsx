import { useState } from 'react';
import { authClient } from '@o4o/auth-client';
import type { MemberDetail } from './member-workspace-model';

/** Access termination leaves business records intact. Sale changes their owner link. */
export default function MemberLifecycleActions({ detail, actorId, busy, perform }: Readonly<{
  detail: MemberDetail; actorId: string; busy: boolean; perform: (work: () => Promise<unknown>) => Promise<void>;
}>) {
  const [action, setAction] = useState<'stop' | 'transfer' | 'close' | null>(null);
  const [reason, setReason] = useState('');
  const [email, setEmail] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const pharmacies = detail.pharmacies.filter(pharmacy => ['active','suspended','terminated'].includes(pharmacy.status));
  const choices = action === 'transfer' ? pharmacies.filter(pharmacy => pharmacy.status === 'active') : pharmacies;
  if (!detail.permissions.edit || actorId === detail.member.userId) return null;
  const choose = (next: 'stop' | 'transfer' | 'close') => { setAction(next); setReason(''); setEmail(''); setConfirmed(false); setOrganizationId((next==='transfer' ? pharmacies.filter(pharmacy=>pharmacy.status==='active') : pharmacies)[0]?.organizationId ?? ''); };
  return <section className="rounded border bg-white p-4 space-y-3" aria-label="회원 이용 관리">
    <h4 className="font-semibold">이용 관리</h4>
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={busy} onClick={() => choose('stop')}>이용 정지·직원 이용 해지</button>
      {detail.permissions.manageAccount && pharmacies.some(pharmacy=>pharmacy.status==='active') && <button type="button" disabled={busy} onClick={() => choose('transfer')}>약국 매도·경영자 이전</button>}
      {detail.permissions.manageAccount && pharmacies.length > 0 && <button type="button" disabled={busy} onClick={() => choose('close')}>약국 완전폐업·자료삭제</button>}
    </div>
    {action && <form className="space-y-3" onSubmit={event => {
      event.preventDefault();
      if (busy || !reason.trim() || !confirmed) return;
      const base = `/qualifications/pharmacist/members/${encodeURIComponent(detail.member.userId)}`;
      void perform(() => action === 'stop'
        ? authClient.api.post(`${base}/stop-access`, { reason: reason.trim(), version: detail.member.version })
        : action === 'close' ? authClient.api.post(`${base}/pharmacies/${encodeURIComponent(organizationId)}/close`, {reason:reason.trim(),closureConfirmed:true})
        : authClient.api.post(`${base}/pharmacies/${encodeURIComponent(organizationId)}/transfer`, { reason: reason.trim(), nextOwnerEmail: email.trim(), transferConfirmed: true }));
    }}>
      <p>{action === 'stop' ? 'Neture 이용을 정지하고 직원 소속을 해지합니다. 개인 계정과 사업체 자료는 유지됩니다.' : action === 'close' ? '완전폐업한 약국의 모든 소속과 이용을 종료하고 기존 약국 자료·파일 파기 절차를 실행합니다. 매도한 약국에는 사용하지 마세요. 실패한 경우 같은 버튼으로 재시도할 수 있습니다. 회원 계정은 별도로 삭제합니다.' : '약국 자료를 유지하고 새 경영자에게 관리 권한을 이전합니다. 이전 경영자의 해당 약국 접근은 해제됩니다. 새 경영자의 사업자 정보는 이전 후 확인·정정해 주세요.'}</p>
      {action !== 'stop' && <>
        <label className="block">이전할 약국<select className="block w-full rounded border p-2" value={organizationId} disabled={busy} onChange={event => setOrganizationId(event.target.value)}>{choices.map(pharmacy => <option key={pharmacy.organizationId} value={pharmacy.organizationId}>{pharmacy.name}</option>)}</select></label>
        {action === 'transfer' && <label className="block">새 경영자 가입 이메일<input type="email" required className="block w-full rounded border p-2" value={email} disabled={busy} onChange={event => setEmail(event.target.value)} /></label>}
      </>}
      <label className="block">이용 관리 사유<textarea required className="block w-full rounded border p-2" maxLength={2000} disabled={busy} value={reason} onChange={event => setReason(event.target.value)} /></label>
      <label className="flex items-start gap-2"><input type="checkbox" disabled={busy} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />{action === 'transfer' ? '약국 매도와 자료 이전에 대해 양측의 확인을 받았습니다.' : action === 'close' ? '매도가 아닌 완전폐업이며 약국 자료 삭제를 확인했습니다.' : '이용 정지와 직원 소속 해지를 확인했습니다.'}</label>
      <button type="submit" disabled={busy || !confirmed || !reason.trim() || (action !== 'stop' && !organizationId) || (action === 'transfer' && !email.trim())}>{action === 'stop' ? '이용 정지·해지 실행' : action === 'close' ? '완전폐업·자료삭제 실행' : '경영자 이전 실행'}</button>
      <button type="button" disabled={busy} onClick={() => setAction(null)}>취소</button>
    </form>}
  </section>;
}
