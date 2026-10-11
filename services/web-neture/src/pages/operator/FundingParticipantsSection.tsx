import { useState } from 'react';
import { PAYMENT_STATUS_LABELS } from '../../api/trial';
import type { ParticipantFilters, PaymentStatus, TrialParticipant, TrialStatus, UpdateParticipantPaymentInput } from '../../api/trial';

export type ParticipantFilter = 'all' | 'product' | 'cash' | 'pending' | 'fulfilled';
export function fundingParticipantFilters(filter: ParticipantFilter, payment: PaymentStatus | ''): ParticipantFilters {
  return {
    ...(filter === 'product' || filter === 'cash' ? { rewardType: filter } : {}),
    ...(filter === 'pending' || filter === 'fulfilled' ? { rewardStatus: filter } : {}),
    ...(payment ? { paymentStatus: payment } : {}),
  };
}

type Form = { id: string; action: 'confirm' | 'refund' | 'reset'; amount: string; reference: string; note: string };
type Props = {
  participants: TrialParticipant[]; totalCount: number; trialStatus: TrialStatus;
  filter: ParticipantFilter; paymentFilter: PaymentStatus | '';
  onFilterChange: (value: ParticipantFilter) => void;
  onPaymentFilterChange: (value: PaymentStatus | '') => void;
  onExport: () => void; exportLoading: boolean;
  onToggleRewardStatus: (p: TrialParticipant) => void; updatingId: string | null;
  onPaymentStatusChange: (p: TrialParticipant, input: UpdateParticipantPaymentInput) => Promise<boolean>;
  updatingPaymentId: string | null; loading: boolean; error: string; onRetry: () => void;
};
const filters: { value: ParticipantFilter; label: string }[] = [
  { value: 'all', label: '전체 참여자' }, { value: 'product', label: '제품 보상' },
  { value: 'cash', label: '현금 보상' }, { value: 'pending', label: '이행 대기' }, { value: 'fulfilled', label: '이행 완료' },
];
const button = 'px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50';
const field = 'mt-1 w-full px-2 py-1.5 text-sm border border-gray-300 rounded';
const date = (value: string | null) => value ? new Date(value).toLocaleString('ko-KR') : '-';
const invalidAmount = (value: string) => value.trim() !== ''
  && (!/^\d+(\.\d{1,2})?$/.test(value.trim()) || Number(value) > 9999999999.99);

export default function FundingParticipantsSection(props: Props) {
  const [form, setForm] = useState<Form | null>(null);
  const busy = props.updatingPaymentId !== null || props.updatingId !== null;
  const open = (p: TrialParticipant, action: Form['action']) => setForm({
    id: p.id, action, amount: p.paidAmount == null ? '' : String(p.paidAmount),
    reference: p.paymentReference || '', note: action === 'confirm' ? p.paymentNote || '' : '',
  });
  const save = async (p: TrialParticipant) => {
    if (!form || busy || invalidAmount(form.amount)) return;
    const input: UpdateParticipantPaymentInput = form.action === 'confirm' ? {
      paymentStatus: 'paid', paymentMethod: 'manual_transfer', paymentProvider: 'internal',
      paidAmount: form.amount.trim() ? Number(form.amount) : null,
      paymentReference: form.reference.trim() || null, paymentNote: form.note.trim() || null,
    } : { paymentStatus: form.action === 'refund' ? 'refunded' : 'unpaid', paymentNote: form.note.trim() || null };
    if (await props.onPaymentStatusChange(p, input)) setForm(null);
  };
  const paymentVisible = ['recruiting', 'development', 'outcome_confirming', 'fulfilled', 'closed'].includes(props.trialStatus);

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 mb-4" aria-label="펀딩 참여자 관리">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h2 className="text-sm font-semibold text-gray-700">펀딩 참여자 ({props.totalCount}명)</h2>
        <button className={button} onClick={props.onExport} disabled={busy || props.exportLoading || props.loading || !!props.error}>
          {props.exportLoading ? '내보내는 중...' : '현재 조건 CSV 내보내기'}
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-4">펀딩 참여 명단입니다. 서비스 회원 자격과 포럼 회원 가입은 별도로 관리합니다. 입금 확인이 포럼 가입을 자동 승인하지 않습니다.</p>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {filters.map(f => <button key={f.value} onClick={() => props.onFilterChange(f.value)} disabled={busy}
          aria-pressed={props.filter === f.value} className={`${button} ${props.filter === f.value ? 'bg-blue-50 text-blue-700' : ''}`}>{f.label}</button>)}
        <label className="text-xs text-gray-600">입금 상태
          <select aria-label="입금 상태" className="ml-2 p-1.5 border border-gray-300 rounded" value={props.paymentFilter} disabled={busy}
            onChange={e => props.onPaymentFilterChange(e.target.value as PaymentStatus | '')}>
            <option value="">전체 입금 상태</option>
            {Object.entries(PAYMENT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>
      {props.loading ? <p role="status" className="text-sm text-gray-500 py-6">참여자를 불러오는 중...</p> : props.error ? (
        <div role="alert" className="p-3 bg-red-50 text-red-700 rounded text-sm">{props.error}
          <button className={`${button} ml-2`} onClick={props.onRetry}>다시 시도</button>
        </div>
      ) : props.participants.length === 0 ? <p className="text-sm text-gray-500 py-6">{props.totalCount === 0 ? '아직 참여자가 없습니다.' : '해당 조건의 참여자가 없습니다.'}</p> : (
        <>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">참여 이행 관리</h3>
          <div className="overflow-x-auto mb-5">
            <table className="w-full min-w-[580px] text-sm">
              <thead><tr className="text-left text-xs text-gray-500"><th className="p-2">이름</th><th>유형</th><th>보상</th><th>참여일</th><th>이행 상태</th><th>처리</th></tr></thead>
              <tbody>{props.participants.map(p => <tr key={p.id} className="border-t border-gray-100">
                <td className="p-2">{p.name}</td><td>{['seller', 'store_owner'].includes(p.type) ? '매장 경영자' : p.type}</td>
                <td>{p.rewardType === 'product' ? '제품' : p.rewardType === 'cash' ? '현금' : '-'}</td>
                <td>{new Date(p.joinedAt).toLocaleDateString('ko-KR')}</td><td>{p.rewardStatus === 'fulfilled' ? '완료' : '대기'}</td>
                <td><button className={button} disabled={props.updatingId !== null || busy} onClick={() => props.onToggleRewardStatus(p)}>
                  {props.updatingId === p.id ? '처리 중...' : p.rewardStatus === 'fulfilled' ? '대기로' : '이행 완료'}</button></td>
              </tr>)}</tbody>
            </table>
          </div>
          {paymentVisible && <>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">오프라인 입금 확인</h3>
            <p className="text-xs text-gray-500 mb-3">실제 송금 내역을 확인하고 기록합니다. 환불 기록은 실제 환불 완료 후 입력하며, 이 화면에서 송금이 실행되지는 않습니다.</p>
            <div className="space-y-3">
              {props.participants.map(p => {
                const status = p.paymentStatus ?? 'unpaid';
                const selected = form?.id === p.id ? form : null;
                return <article key={p.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex flex-wrap items-center gap-2 mb-2"><strong className="text-sm min-w-0 break-all">{p.name}</strong>
                    <span className="text-xs text-gray-600">{PAYMENT_STATUS_LABELS[status]}</span>
                    <span className="text-sm">{p.paidAmount == null ? '금액 미기록' : `${p.paidAmount.toLocaleString()}원`}</span>
                  </div>
                  <dl className="grid sm:grid-cols-2 gap-1 text-xs text-gray-600 mb-3">
                    <div><dt className="inline">최초 입금 확인일: </dt><dd className="inline">{date(p.paidAt)}</dd></div>
                    <div><dt className="inline">마지막 확인일: </dt><dd className="inline">{date(p.confirmedAt)}</dd></div>
                    <div className="break-all"><dt className="inline">송금 참조: </dt><dd className="inline">{p.paymentReference || '-'}</dd></div>
                    <div className="break-all"><dt className="inline">운영자 메모: </dt><dd className="inline">{p.paymentNote || '-'}</dd></div>
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    <button className={button} disabled={busy} onClick={() => open(p, 'confirm')}>{status === 'paid' ? '재확인·정정' : '수기 송금 확인'}</button>
                    {status === 'paid' && <>
                      <button className={button} disabled={busy} onClick={() => open(p, 'reset')}>입금 확인 취소</button>
                      <button className={button} disabled={busy} onClick={() => open(p, 'refund')}>환불 완료 기록</button>
                    </>}
                  </div>
                  {selected && <form className="mt-3 border-t pt-3" onSubmit={e => { e.preventDefault(); void save(p); }}>
                    <h4 className="text-sm font-medium mb-2">{selected.action === 'confirm' ? '입금 확인·정정' : selected.action === 'refund' ? '환불 완료 기록' : '입금 확인 취소'}</h4>
                    {selected.action === 'confirm' && <div className="grid sm:grid-cols-2 gap-3 mb-3">
                      <label className="text-xs text-gray-600">입금 확인 금액 (원)
                        <input className={field} type="number" min="0" max="9999999999.99" step="0.01" inputMode="decimal" disabled={busy}
                          value={selected.amount} onChange={e => setForm({ ...selected, amount: e.target.value })} /></label>
                      <label className="text-xs text-gray-600">송금 참조 (선택)
                        <input className={field} maxLength={255} disabled={busy} value={selected.reference} onChange={e => setForm({ ...selected, reference: e.target.value })} /></label>
                    </div>}
                    <label className="block text-xs text-gray-600">{selected.action === 'confirm' ? '운영자 메모 (선택)' : '처리 사유 (선택)'}
                      <textarea className={field} disabled={busy} value={selected.note} onChange={e => setForm({ ...selected, note: e.target.value })} /></label>
                    {selected.action !== 'confirm' && <p className="text-xs text-gray-500 my-2">최초 입금 확인일·금액·송금 참조는 이력으로 보존합니다.</p>}
                    {invalidAmount(selected.amount) && <p role="alert" className="text-xs text-red-600 my-2">금액은 0 이상, 소수점 두 자리까지 입력해 주세요.</p>}
                    <div className="flex gap-2 mt-3"><button type="submit" className={button} disabled={busy || invalidAmount(selected.amount)}>{busy ? '저장 중...' : '기록 저장'}</button>
                      <button type="button" className={button} disabled={busy} onClick={() => setForm(null)}>취소</button></div>
                  </form>}
                </article>;
              })}
            </div>
          </>}
        </>
      )}
    </section>
  );
}
