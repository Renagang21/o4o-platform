import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBusiness } from './BusinessWorkspace';
import { businessApi, businessPath, businessError, pharmacyApiBase, type BusinessMembership } from './api';

const STATUS: Record<string, string> = { active: '참여 중', pending: '승인 대기', rejected: '신청 반려', suspended: '이용 정지', terminated: '탈퇴' };

export default function BusinessParticipationPage() {
  const { business, access } = useBusiness();
  const [membership, setMembership] = useState<BusinessMembership | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [note, setNote] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(''); setMembership(null); setAccepted(false);
    if (access?.canManage) { setLoading(false); return; }
    businessApi.get<BusinessMembership[]>(`${pharmacyApiBase}/semi-franchises`)
      .then(rows => { if (alive) setMembership(rows.find(row => row.key === business.key) ?? null); })
      .catch(e => { if (alive) setError(businessError(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [business.key, access?.canManage, version]);
  const apply = async () => {
    if (!accepted || busy || !membership) return;
    setBusy(true); setError('');
    try {
      await businessApi.post(`${pharmacyApiBase}/semi-franchises/${encodeURIComponent(business.key)}/apply`, {
        acceptedConditions: true, conditions: business.registrationConditions ?? '', note,
      });
      setVersion(n => n + 1);
    } catch (e) { setError(businessError(e)); }
    finally { setBusy(false); }
  };
  const withdraw = async () => {
    if (busy || !window.confirm(membership?.membershipStatus === 'pending' ? '참여 신청을 취소하시겠습니까?' : '사업에서 탈퇴하시겠습니까?')) return;
    setBusy(true); setError('');
    try { await businessApi.post(`${pharmacyApiBase}/semi-franchises/${encodeURIComponent(business.key)}/withdraw`, {}); window.location.reload(); }
    catch (e) { setError(businessError(e)); setBusy(false); }
  };
  return <section className="rounded-xl border bg-white p-6">
    <h2 className="text-lg font-semibold">참여 신청 · 이용 상태</h2>
    {loading && <output aria-live="polite" className="mt-4">가입 상태를 확인하고 있습니다…</output>}
    {error && <div className="mt-4"><p role="alert">{error}</p><button type="button" className="mt-3 text-blue-700" onClick={() => setVersion(n => n + 1)}>다시 확인</button><a href="https://store.neture.co.kr/start-pharmacy" className="ml-4 text-blue-700">내 매장 신청 · 승인 상태 확인</a></div>}
    {!loading && !error && <>
      <p className="my-4">{access?.canManage ? '이 사업의 담당 운영자입니다.' : STATUS[membership?.membershipStatus ?? ''] ?? '아직 참여 신청하지 않았습니다.'}</p>
      {membership?.reason && <p className="mb-4">처리 사유: {membership.reason}</p>}
      {business.registrationConditions && <div className="my-4 rounded-lg bg-slate-50 p-4"><h3 className="font-semibold">참여 조건</h3><p className="mt-2 whitespace-pre-wrap">{business.registrationConditions}</p></div>}
      {membership && !['active', 'pending', 'suspended'].includes(membership.membershipStatus ?? '') && !access?.canManage && <div className="space-y-4">
        <label className="block"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mr-2" />참여 조건을 확인했습니다.</label>
        <label className="block">추가 신청 내용 (선택)<textarea value={note} maxLength={2000} onChange={e => setNote(e.target.value)} className="mt-2 block w-full rounded border p-3" /></label>
        <button type="button" disabled={!accepted || busy} onClick={apply} className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">{busy ? '신청 중…' : '참여 신청'}</button>
      </div>}
      {!membership && !access?.canManage && <a href="https://store.neture.co.kr/start-pharmacy" className="text-blue-700">내 매장(약국) 신청 · 승인 상태 확인</a>}
      {membership && ['active', 'pending', 'suspended'].includes(membership.membershipStatus ?? '') && !access?.canManage && <button type="button" disabled={busy} onClick={withdraw} className="mt-4 mr-4 text-red-700">{membership.membershipStatus === 'pending' ? '신청 취소' : '탈퇴'}</button>}
      {access?.allowed && <Link to={businessPath(business.key, 'forum')} className="mt-4 inline-block text-blue-700">참여자 게시판 이용하기 →</Link>}
      {access?.canManage && <Link to="/operator/semi-franchises" className="ml-4 text-blue-700">사업 운영 · 가입 심사</Link>}
    </>}
  </section>;
}
