import { ServiceEnrollmentPolicyAgreement, useServiceEnrollmentPolicies } from '@o4o/shared-space-ui';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBusiness } from './BusinessWorkspace';
import { useAuth } from '../../contexts/AuthContext';
import { BusinessParticipationStore } from './BusinessParticipationStore';
import { businessApi, businessPath, businessError, pharmacyApiBase, type BusinessMembership } from './api';

const STATUS: Record<string, string> = { active: '참여 중', pending: '승인 대기', rejected: '신청 반려', suspended: '이용 정지', terminated: '탈퇴' };

export default function BusinessParticipationPage() {
  const { business, access } = useBusiness();
  const { user } = useAuth();
  const scope = `${user?.id}:${business.key}`;
  if (access?.canManage) return <ParticipationForm key={scope} />;
  return <BusinessParticipationStore key={scope}>{(organizationId, onBusyChange) =>
    <ParticipationForm key={`${scope}:${organizationId}`} organizationId={organizationId} onBusyChange={onBusyChange} />
  }</BusinessParticipationStore>;
}

function ParticipationForm({ organizationId, onBusyChange }: Readonly<{ organizationId?: string; onBusyChange?: (busy: boolean) => void }>) {
  const { business, access } = useBusiness();
  const defaultPharmacy = business.key === 'pharmacy';
  const current = useRef(false);
  useLayoutEffect(() => { current.current = true; return () => { current.current = false; }; }, []);
  const agreement = useServiceEnrollmentPolicies(business.policyScope, () => defaultPharmacy ? Promise.resolve([]) : businessApi.get(`/neture/businesses/${encodeURIComponent(business.key)}/legal/enrollment-policies`), business.key);
  const [conditions, setConditions] = useState(business.registrationConditions ?? '');
  const [membership, setMembership] = useState<BusinessMembership | null>(null);
  const [error, setError] = useState('');
  const [applicationError, setApplicationError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [note, setNote] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(''); setApplicationError(false); setMembership(null); setAccepted(false); setConditions(business.registrationConditions ?? '');
    if (access?.canManage) { setLoading(false); return; }
    businessApi.get<BusinessMembership[]>(`${pharmacyApiBase}/semi-franchises`, undefined, organizationId)
      .then(rows => { if (alive) setMembership(rows.find(row => row.key === business.key) ?? null); })
      .catch(e => { if (alive) setError(businessError(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [business.key, business.registrationConditions, access?.canManage, organizationId, version]);
  const apply = async () => {
    if (busy || !membership || (!defaultPharmacy && (!accepted || !agreement.ready))) return;
    setBusy(true); onBusyChange?.(true); setError(''); setApplicationError(true);
    try {
      await businessApi.post(`${pharmacyApiBase}/semi-franchises/${encodeURIComponent(business.key)}/apply`, defaultPharmacy ? {} : {
        acceptedConditions: true, conditions, note, policyReferences: agreement.references,
      }, organizationId);
      if (current.current) setVersion(n => n + 1);
    } catch (e: any) {
      if (!current.current) return;
      const code = e.response?.data?.error?.code ?? e.response?.data?.code;
      if (['POLICY_VERSION_MISMATCH', 'ENROLLMENT_POLICY_REQUIRED'].includes(code)) agreement.reload();
      if (code === 'CONDITIONS_CHANGED') {
        setAccepted(false);
        try { const fresh = await businessApi.get<{ key: string; registrationConditions?: string }>(`${pharmacyApiBase}/businesses/${encodeURIComponent(business.key)}`); if (!current.current) return; if (fresh.key !== business.key) throw new Error('Wrong business'); setConditions(fresh.registrationConditions ?? ''); setError('참여 조건이 변경되었습니다. 입력 내용은 유지됩니다. 최신 조건을 다시 확인해 주세요.'); }
        catch { if (current.current) setError('최신 참여 조건을 불러오지 못했습니다. 다시 확인해 주세요.'); }
      } else setError(businessError(e));
    }
    finally { if (current.current) { setBusy(false); onBusyChange?.(false); } }
  };
  const withdraw = async () => {
    if (busy || !window.confirm(membership?.membershipStatus === 'pending' ? '참여 신청을 취소하시겠습니까?' : '사업에서 탈퇴하시겠습니까?')) return;
    setBusy(true); onBusyChange?.(true); setError('');
    try { await businessApi.post(`${pharmacyApiBase}/semi-franchises/${encodeURIComponent(business.key)}/withdraw`, {}, organizationId); if (current.current) window.location.reload(); }
    catch (e) { if (current.current) { setError(businessError(e)); setBusy(false); onBusyChange?.(false); } }
  };
  return <section className="rounded-xl border bg-white p-6">
    <h2 className="text-lg font-semibold">{defaultPharmacy ? 'Pharmacy 회원 상태' : '참여 신청 · 이용 상태'}</h2>
    {defaultPharmacy && <p className="mt-3">약국 경영자 승인을 받으면 Pharmacy 기본 회원으로 함께 연결됩니다. 별도 가입 심사는 없습니다. 기존 이용 정지·반려·탈퇴는 자동으로 해제되지 않습니다.</p>}
    {loading && <output aria-live="polite" className="mt-4">가입 상태를 확인하고 있습니다…</output>}
    {error && <div className="mt-4"><p role="alert">{error}</p><button type="button" className="mt-3 text-blue-700" onClick={() => applicationError ? setError('') : setVersion(n => n + 1)}>다시 확인</button><a href="https://store.neture.co.kr/start-pharmacy" className="ml-4 text-blue-700">내 매장 신청 · 승인 상태 확인</a></div>}
    {!loading && (!error || applicationError) && <>
      <p className="my-4">{access?.canManage ? '이 사업의 담당 운영자입니다.' : STATUS[membership?.membershipStatus ?? ''] ?? (defaultPharmacy ? 'Pharmacy 기본 회원 연결을 확인해 주세요.' : '아직 참여 신청하지 않았습니다.')}</p>
      {membership?.reason && <p className="mb-4">처리 사유: {membership.reason}</p>}
      {!defaultPharmacy && conditions && <div className="my-4 rounded-lg bg-slate-50 p-4"><h3 className="font-semibold">참여 조건</h3><p className="mt-2 whitespace-pre-wrap">{conditions}</p></div>}
      {defaultPharmacy && membership && (!membership.membershipStatus || membership.membershipStatus === 'pending') && !access?.canManage && <button type="button" disabled={busy} onClick={apply} className="min-h-11 rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">{busy ? '연결 확인 중…' : '기본 회원 연결 확인'}</button>}
      {defaultPharmacy && membership?.membershipStatus === 'active' && !access?.allowed && <a href={businessPath(business.key, 'forum') + (organizationId ? `?store=${encodeURIComponent(organizationId)}` : '')} className="mt-4 mr-4 inline-flex min-h-11 items-center text-blue-700">Pharmacy 회원 공간 이용하기 →</a>}
      {!defaultPharmacy && membership && !['active', 'pending', 'suspended'].includes(membership.membershipStatus ?? '') && !access?.canManage && <div className="space-y-4">
        <label className="block"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mr-2" />참여 조건을 확인했습니다.</label>
        <label className="block">추가 신청 내용 (선택)<textarea value={note} maxLength={2000} onChange={e => setNote(e.target.value)} className="mt-2 block w-full rounded border p-3" /></label>
        <ServiceEnrollmentPolicyAgreement agreement={agreement} />
        <button type="button" disabled={!accepted || busy || !agreement.ready} onClick={apply} className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">{busy ? '신청 중…' : '참여 신청'}</button>
      </div>}
      {!membership && !access?.canManage && <a href="https://store.neture.co.kr/start-pharmacy" className="text-blue-700">내 매장(약국) 신청 · 승인 상태 확인</a>}
      {membership && ['active', 'pending', 'suspended'].includes(membership.membershipStatus ?? '') && !access?.canManage && <button type="button" disabled={busy} onClick={withdraw} className="mt-4 mr-4 text-red-700">{membership.membershipStatus === 'pending' ? '신청 취소' : '탈퇴'}</button>}
      {access?.allowed && <Link to={businessPath(business.key, 'forum') + (organizationId ? `?store=${encodeURIComponent(organizationId)}` : '')} className="mt-4 inline-block text-blue-700">참여자 게시판 이용하기 →</Link>}
      {access?.canManage && <Link to="/operator/semi-franchises" className="ml-4 text-blue-700">사업 운영 · 가입 심사</Link>}
    </>}
  </section>;
}
