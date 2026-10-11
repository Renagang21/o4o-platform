import { useEffect, useState } from 'react';
import { useLatestRequest } from '../../hooks/useLatestRequest';
import { Link } from 'react-router-dom';
import { changeFundingCreatorStatus, getFundingCreatorParticipants, submitTrial, PAYMENT_STATUS_LABELS, type PaymentStatus, type Trial } from '../../api/trial';
const NEXT: Record<string, { status: Trial['status']; label: string }> = {
  recruiting: { status: 'development', label: '준비 단계로 전환' }, development: { status: 'outcome_confirming', label: '결과 확정 단계로 전환' },
  outcome_confirming: { status: 'fulfilled', label: '이행 완료로 전환' }, fulfilled: { status: 'closed', label: '펀딩 종료' },
};
export function FundingCreatorOperations({ trial, forum, onChange }: { trial: Trial; forum?: { id: string; slug: string } | null; onChange: () => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const beginWrite = useLatestRequest(`funding-operation:${trial.id}`);
  const [loadedId, setLoadedId] = useState('');
  const [rows, setRows] = useState<{ id: string; name: string; paymentStatus: string }[]>([]);
  useEffect(() => {
    let active = true; setRows([]); setError(''); setBusy(false); setLoadedId('');
    getFundingCreatorParticipants(trial.id).then(data => { if (active) { setRows(data); setLoadedId(trial.id); } }).catch(() => { if (active) setError('참여 현황을 불러오지 못했습니다.'); });
    return () => { active = false; };
  }, [trial.id]);
  const change = async () => {
    if (busy) return;
    const current = beginWrite();
    setBusy(true); setError('');
    try {
      if (trial.status === 'draft') await submitTrial(trial.id);
      else if (NEXT[trial.status]) await changeFundingCreatorStatus(trial.id, NEXT[trial.status].status);
      if (current()) onChange();
    } catch (e: any) { if (current()) setError(e.response?.data?.message || '처리하지 못했습니다. 다시 시도해 주세요.'); }
    finally { if (current()) setBusy(false); }
  };
  return <section className="my-6 rounded-lg border bg-white p-4">
    <h2 className="text-lg font-semibold">개설자 운영</h2>
    {trial.reviewReason && <p className="mt-2 text-red-700">보완 요청: {trial.reviewReason}</p>}
    {trial.forumPending && <p className="mt-2">승인되었습니다. 운영자가 전용 포럼 개설을 마무리하고 있습니다.</p>}
    <div className="mt-3 flex flex-wrap gap-3">
      {(trial.status === 'draft' || NEXT[trial.status]) && <button disabled={busy} className="min-h-11 rounded bg-blue-700 px-4 text-white disabled:opacity-50" onClick={change}>{trial.status === 'draft' ? '개설 신청' : NEXT[trial.status].label}</button>}
      {forum && <><Link className="min-h-11 rounded border px-4 py-2" to={`/market-trial/${trial.id}/forum`}>펀딩 포럼</Link><Link className="min-h-11 rounded border px-4 py-2" to={`/market-trial/${trial.id}/forum/members`}>포럼 회원 관리</Link></>}
    </div>
    {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
    <h3 className="mt-5 font-medium">참여자 현황</h3>
    <p className="mt-1 text-sm text-gray-600">입금 확인은 펀딩 서비스 운영자가 담당합니다. 포럼 회원 승인은 별도로 관리합니다.</p>
    <ul className="mt-2 divide-y">{rows.map(row => <li key={row.id} className="flex flex-wrap justify-between gap-2 py-2"><span>{row.name || '회원'}</span><span>{PAYMENT_STATUS_LABELS[row.paymentStatus as PaymentStatus] || '상태 확인 필요'}</span></li>)}</ul>
    {!error && loadedId !== trial.id && <output>참여 현황 확인 중…</output>}
    {!error && loadedId === trial.id && !rows.length && <p className="mt-2 text-gray-500">참여자가 없습니다.</p>}
  </section>;
}
