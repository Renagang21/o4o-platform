import { useEffect, useState } from 'react';
import { api } from '../../lib/apiClient';

type Envelope<T> = { success: boolean; data: T };
type Store = { organizationId: string; organizationName: string; memberRole: string };
type Invitation = { organizationId: string; organizationName: string; status: 'invited' | 'accepted' };
type Member = { userId: string; email: string; name: string | null; role: string; status: 'invited' | 'accepted' | 'active' };
const statusLabel = { invited: '수락 대기', accepted: '경영자 승인 대기', active: '이용 중' };
const failure = (e: unknown) => {
  const value = e as { response?: { data?: { error?: unknown } } };
  return typeof value.response?.data?.error === 'string' ? value.response.data.error : '요청을 처리하지 못했습니다. 다시 시도해 주세요.';
};

/** Individual My Home manages invitations; store authority is rechecked by the server. */
export function MyHomeStoreMembers({ accountId, onChanged }: { accountId: string; onChanged?: () => void }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [selected, setSelected] = useState('');
  const [members, setMembers] = useState<Member[] | null>(null);
  const [owner, setOwner] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    Promise.all([
      api.get('/work-scope/accessible-stores'), api.get('/store/invitations'),
    ]).then(([storeResponse, invitationResponse]: [{ data: Envelope<{ stores: Store[] }> }, { data: Envelope<Invitation[]> }]) => {
      if (cancelled) return;
      const list: Store[] = storeResponse.data.data?.stores ?? [];
      setStores(list); setInvitations(invitationResponse.data.data ?? []);
      setSelected(previous => list.some(s => s.organizationId === previous) ? previous : list[0]?.organizationId ?? '');
    }).catch((e: unknown) => { if (!cancelled) setError(failure(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [accountId, tick]);
  useEffect(() => {
    let cancelled = false;
    setMembers(null); setOwner(false);
    if (!selected) return;
    const config = { headers: { 'X-Store-Organization-Id': selected }, params: { serviceKey: 'kpa' } };
    api.get('/store/membership', config).then(async (response: { data: Envelope<{ level: string; organizationId: string }> }) => {
      if (cancelled || response.data.data?.organizationId !== selected) return;
      if (response.data.data.level !== 'owner') return;
      setOwner(true);
      const result = await api.get('/store/members', config);
      if (!cancelled && result.data.data?.organizationId === selected) setMembers(result.data.data.members);
    }).catch((e: unknown) => { if (!cancelled) { setOwner(false); setMembers(null); setError(failure(e)); } });
    return () => { cancelled = true; };
  }, [accountId, selected, tick]);

  const mutate = async (path: string, body: unknown = {}, remove = false) => {
    if (busy) return;
    setBusy(true); setError(null); setNotice(null);
    // Capture the selected store for this entire operation. Changing selection cannot redirect it.
    const config = { headers: { 'X-Store-Organization-Id': selected }, params: { serviceKey: 'kpa' } };
    try {
      if (remove) await api.delete(path, config);
      else await api.post(path, body, config);
      setNotice('처리했습니다. 최종 승인된 직원만 내 매장 업무를 이용할 수 있습니다.');
      setEmail(''); setTick(t => t + 1); onChanged?.();
    } catch (e) { setError(failure(e)); }
    finally { setBusy(false); }
  };
  return <section aria-labelledby="store-members-title" className="rounded-2xl border border-slate-200 bg-white p-5">
    <h2 id="store-members-title" className="font-semibold text-slate-900">매장 직원 및 초대</h2>
    <p className="mt-1 text-sm text-slate-600">경영자 초대 → 직원 수락 → 경영자 최종 승인 후 내 매장 업무 전체를 이용합니다.</p>
    {error && <p role="alert" className="mt-3 text-red-700">{error} <button type="button" onClick={() => setTick(t => t + 1)} disabled={busy}>다시 시도</button></p>}
    {notice && <p role="status" className="mt-3 text-blue-700">{notice}</p>}
    {loading ? <p className="mt-3">매장과 초대를 확인하는 중…</p> : <>
      <h3 className="mt-4 font-medium">내가 받은 초대</h3>
      {!invitations.length && <p className="mt-2 text-sm text-slate-500">받은 초대가 없습니다.</p>}
      <ul className="mt-2 space-y-3">{invitations.map(i => <li key={i.organizationId} className="flex flex-wrap items-center gap-3">
        <span>{i.organizationName || '이름 없는 매장'} · {statusLabel[i.status]}</span>
        {i.status === 'invited' && <button type="button" disabled={busy} className="text-blue-700 underline" onClick={() => void mutate(`/store/invitations/${encodeURIComponent(i.organizationId)}/accept`)}>초대 수락</button>}
        <button type="button" disabled={busy} className="text-slate-600 underline" onClick={() => void mutate(`/store/invitations/${encodeURIComponent(i.organizationId)}/decline`)}>{i.status === 'accepted' ? '수락 취소' : '거절'}</button>
      </li>)}</ul>
      {!!stores.length && <div className="mt-5">
        <label className="flex flex-wrap items-center gap-2">내 매장
          <select value={selected} disabled={busy} onChange={e => { setSelected(e.target.value); setError(null); setNotice(null); }} className="max-w-full rounded border border-slate-300 p-2">
            {stores.map(s => <option key={s.organizationId} value={s.organizationId}>{s.organizationName || '이름 없는 매장'}</option>)}
          </select>
        </label>
        <p className="mt-2 text-sm text-slate-600">내 업무 바로가기에서 내 매장으로 이동할 수 있습니다.</p>
        {owner && <>
          <form className="mt-4 flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); if (email.trim()) void mutate('/store/members/invite', { email: email.trim() }); }}>
            <label className="flex flex-wrap items-center gap-2">직원 이메일<input type="email" required value={email} disabled={busy} onChange={e => setEmail(e.target.value)} className="min-w-0 max-w-full rounded border border-slate-300 p-2" /></label>
            <button type="submit" disabled={busy} className="rounded bg-blue-700 px-3 py-2 text-white">직원 초대</button>
          </form>
          <p className="mt-2 text-sm text-slate-500">가입된 사용자를 초대할 수 있습니다. 퇴사·업무 변경 시 접근을 해제하면 작성 자료는 매장에 유지됩니다.</p>
          {members === null ? <p className="mt-3">구성원을 확인하는 중…</p> : <ul className="mt-3 space-y-3">{members.map(m => <li key={m.userId} className="flex flex-wrap items-center gap-3">
            <span className="break-all">{m.name || m.email} · {statusLabel[m.status]}</span>
            {m.role === 'accepted' && <button type="button" disabled={busy} className="text-blue-700 underline" onClick={() => void mutate(`/store/members/${encodeURIComponent(m.userId)}/approve`)}>최종 승인</button>}
            {['invited', 'accepted', 'staff'].includes(m.role) && <button type="button" disabled={busy} className="text-red-700 underline" onClick={() => void mutate(`/store/members/${encodeURIComponent(m.userId)}`, {}, true)}>{m.status === 'active' ? '접근 해제' : '초대 취소'}</button>}
          </li>)}</ul>}
        </>}
      </div>}
    </>}
  </section>;
}
