/**
 * OperatorSemiFranchisePage — 담당 세미프랜차이즈 (/operator/semi-franchises)
 *
 * WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1 · DESIGN §3-2 · §3-4 · §3-5 · §3-6
 *   담당 지정된 세미프랜차이즈만 보인다(담당 관계는 API 가 판정 — 아니면 403).
 *   탭: 가입 신청 / 공급 제안 / 이벤트 / 모집 조건.
 *   가입 신청 목록은 기본 가입 원장의 사업자번호 · 면허번호 · 기본 가입 상태를 함께 보여준다.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  neturePharmacyOperatorApi as api,
  MEMBERSHIP_ACTIONS_BY_STATUS,
  formatDateTime,
  formatWon,
  type SemiFranchise,
  type SemiFranchiseEvent,
  type SemiFranchiseMembership,
  type SemiFranchiseRecruitment,
  type SupplyProposal,
} from '../../lib/api/neturePharmacy';
import {
  ActionButton,
  EmptyRow,
  Message,
  PageHeader,
  StatusBadge,
  StatusFilter,
  TD,
  TH,
  askReason,
} from '../../components/neture-pharmacy/PharmacyCommerceUi';

type Tab = 'memberships' | 'proposals' | 'events' | 'recruitments';
type Msg = { type: 'success' | 'error'; text: string } | null;

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'memberships', label: '가입 신청' },
  { key: 'proposals', label: '공급 제안' },
  { key: 'events', label: '이벤트' },
  { key: 'recruitments', label: '모집 조건' },
];

const FILTERS: Record<Tab, Array<{ value: string; label: string }>> = {
  memberships: [
    { value: 'pending', label: '대기' },
    { value: 'active', label: '활성' },
    { value: 'suspended', label: '정지' },
    { value: 'rejected', label: '반려' },
    { value: 'terminated', label: '종료' },
    { value: '', label: '전체' },
  ],
  proposals: [
    { value: 'pending', label: '대기' },
    { value: 'approved', label: '승인' },
    { value: 'rejected', label: '반려' },
    { value: 'ended', label: '종료' },
    { value: '', label: '전체' },
  ],
  events: [
    { value: 'pending', label: '대기' },
    { value: 'approved', label: '승인' },
    { value: 'rejected', label: '반려' },
    { value: 'canceled', label: '취소' },
    { value: '', label: '전체' },
  ],
  recruitments: [
    { value: 'pending', label: '대기' },
    { value: 'approved', label: '승인' },
    { value: 'rejected', label: '반려' },
    { value: '', label: '전체' },
  ],
};

const PROPOSAL_ACTIONS: Record<string, Array<{ action: 'approve' | 'reject' | 'end'; label: string }>> = {
  pending: [
    { action: 'approve', label: '승인' },
    { action: 'reject', label: '반려' },
    { action: 'end', label: '종료' },
  ],
  approved: [{ action: 'end', label: '종료' }],
};

const EVENT_ACTIONS: Record<string, Array<{ action: 'approve' | 'reject' | 'cancel'; label: string }>> = {
  pending: [
    { action: 'approve', label: '승인' },
    { action: 'reject', label: '반려' },
    { action: 'cancel', label: '취소' },
  ],
  approved: [{ action: 'cancel', label: '취소' }],
};

const RECRUITMENT_ACTIONS: Record<string, Array<{ action: 'approve' | 'reject'; label: string }>> = {
  pending: [
    { action: 'approve', label: '승인' },
    { action: 'reject', label: '반려' },
  ],
};

export default function OperatorSemiFranchisePage() {
  const [franchises, setFranchises] = useState<SemiFranchise[] | null>(null);
  const [sfKey, setSfKey] = useState('');
  const [tab, setTab] = useState<Tab>('memberships');
  const [status, setStatus] = useState('pending');
  const [rows, setRows] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<Msg>(null);

  useEffect(() => {
    api
      .listAssignedSemiFranchises()
      .then((list) => {
        setFranchises(list ?? []);
        if (list?.length) setSfKey(list[0].key);
      })
      .catch((err: Error) => {
        setFranchises([]);
        setMessage({ type: 'error', text: err.message });
      });
  }, []);

  const load = useCallback(async () => {
    if (!sfKey) return;
    setLoading(true);
    try {
      const data =
        tab === 'memberships'
          ? await api.listSfMemberships(sfKey, status)
          : tab === 'proposals'
            ? await api.listProposals(sfKey, status)
            : tab === 'events'
              ? await api.listEvents(sfKey, status)
              : await api.listRecruitments(sfKey, status);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setRows([]);
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [sfKey, tab, status]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (id: string, label: string, needsReason: boolean, call: (reason?: string) => Promise<unknown>) => {
    let reason: string | undefined;
    if (needsReason) {
      const r = askReason(label);
      if (r === null) return;
      reason = r || undefined;
    } else if (!window.confirm(`${label} 처리할까요?`)) {
      return;
    }
    setBusyId(id);
    setMessage(null);
    try {
      await call(reason);
      setMessage({ type: 'success', text: `${label} 처리했습니다.` });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  const positive = (a: string) => a === 'approve' || a === 'reactivate';

  if (franchises === null) {
    return <div className="p-6 text-sm text-gray-500">불러오는 중...</div>;
  }

  if (franchises.length === 0) {
    return (
      <div className="space-y-4 p-6">
        <PageHeader title="담당 세미프랜차이즈" />
        <Message message={message} />
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          담당으로 지정된 세미프랜차이즈가 없습니다. Neture 관리자에게 담당 지정을 요청하세요.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <PageHeader title="담당 세미프랜차이즈" description="담당으로 지정된 세미프랜차이즈의 가입 · 공급 제안 · 이벤트 · 모집 조건을 처리합니다.">
        <select
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={sfKey}
          onChange={(e) => setSfKey(e.target.value)}
        >
          {franchises.map((f) => (
            <option key={f.key} value={f.key}>
              {f.name} ({f.key}){f.status === 'closed' ? ' · 마감' : ''}
            </option>
          ))}
        </select>
      </PageHeader>

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key);
              setStatus('pending');
              setRows([]);
            }}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <StatusFilter value={status} options={FILTERS[tab]} onChange={setStatus} />
      <Message message={message} />

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        {tab === 'memberships' && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className={TH}>약국</th>
                <th className={TH}>사업자등록번호</th>
                <th className={TH}>약사 면허번호</th>
                <th className={TH}>기본 가입</th>
                <th className={TH}>신청일</th>
                <th className={TH}>상태</th>
                <th className={TH}>처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <EmptyRow colSpan={7} text="불러오는 중..." />
              ) : rows.length === 0 ? (
                <EmptyRow colSpan={7} text="해당하는 가입 신청이 없습니다." />
              ) : (
                (rows as SemiFranchiseMembership[]).map((m) => (
                  <tr key={m.id}>
                    <td className={TD}>
                      <div className="font-medium text-gray-900">{m.organizationName || '-'}</div>
                      {m.organizationAddress && <div className="text-xs text-gray-500">{m.organizationAddress}</div>}
                    </td>
                    <td className={TD}>{m.businessNumber || '-'}</td>
                    <td className={TD}>{m.pharmacistLicenseNumber || '-'}</td>
                    <td className={TD}>{m.basicMembershipStatus ? <StatusBadge status={m.basicMembershipStatus} /> : '-'}</td>
                    <td className={TD}>{formatDateTime(m.appliedAt)}</td>
                    <td className={TD}>
                      <StatusBadge status={m.status} />
                      {m.reason && <div className="mt-1 text-xs text-gray-500">{m.reason}</div>}
                    </td>
                    <td className={TD}>
                      <div className="flex flex-wrap gap-1">
                        {(MEMBERSHIP_ACTIONS_BY_STATUS[m.status] ?? []).map((a) => (
                          <ActionButton
                            key={a.action}
                            label={a.label}
                            action={a.action}
                            disabled={busyId === m.id}
                            onClick={() =>
                              run(m.id, a.label, !positive(a.action), (reason) => api.decideSfMembership(sfKey, m.id, a.action, reason))
                            }
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {tab === 'proposals' && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className={TH}>제품</th>
                <th className={TH}>공급자</th>
                <th className={TH}>제안 가격</th>
                <th className={TH}>대상</th>
                <th className={TH}>메모</th>
                <th className={TH}>상태</th>
                <th className={TH}>처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <EmptyRow colSpan={7} text="불러오는 중..." />
              ) : rows.length === 0 ? (
                <EmptyRow colSpan={7} text="해당하는 공급 제안이 없습니다." />
              ) : (
                (rows as SupplyProposal[]).map((p) => (
                  <tr key={p.id}>
                    <td className={TD}>
                      <div className="font-medium text-gray-900">{p.productName}</div>
                      <div className="text-xs text-gray-500">{formatDateTime(p.createdAt)}</div>
                    </td>
                    <td className={TD}>{p.supplierName || '-'}</td>
                    <td className={TD}>
                      {formatWon(p.unitPrice)}
                      {p.priceGeneral !== null && <div className="text-xs text-gray-500">공급가 {formatWon(p.priceGeneral)}</div>}
                    </td>
                    <td className={TD}>{p.targetOrganizationName || '세미프랜차이즈 전체'}</td>
                    <td className={TD}>{p.note || '-'}</td>
                    <td className={TD}>
                      <StatusBadge status={p.status} />
                      {p.reason && <div className="mt-1 text-xs text-gray-500">{p.reason}</div>}
                    </td>
                    <td className={TD}>
                      <div className="flex flex-wrap gap-1">
                        {(PROPOSAL_ACTIONS[p.status] ?? []).map((a) => (
                          <ActionButton
                            key={a.action}
                            label={a.label}
                            action={a.action}
                            disabled={busyId === p.id}
                            onClick={() =>
                              run(p.id, a.label, !positive(a.action), (reason) => api.decideProposal(sfKey, p.id, a.action, reason))
                            }
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {tab === 'events' && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className={TH}>제품</th>
                <th className={TH}>공급자</th>
                <th className={TH}>이벤트 가격</th>
                <th className={TH}>기간</th>
                <th className={TH}>수량 · 한도</th>
                <th className={TH}>상태</th>
                <th className={TH}>처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <EmptyRow colSpan={7} text="불러오는 중..." />
              ) : rows.length === 0 ? (
                <EmptyRow colSpan={7} text="해당하는 이벤트가 없습니다." />
              ) : (
                (rows as SemiFranchiseEvent[]).map((ev) => (
                  <tr key={ev.id}>
                    <td className={TD}>
                      <div className="font-medium text-gray-900">{ev.productName}</div>
                      <div className="text-xs text-gray-500">{formatDateTime(ev.createdAt)}</div>
                    </td>
                    <td className={TD}>{ev.supplierName || '-'}</td>
                    <td className={TD}>
                      {formatWon(ev.eventPrice)}
                      {ev.priceGeneral !== null && <div className="text-xs text-gray-500">공급가 {formatWon(ev.priceGeneral)}</div>}
                    </td>
                    <td className={TD}>
                      {formatDateTime(ev.startAt)}
                      <div className="text-xs text-gray-500">~ {formatDateTime(ev.endAt)}</div>
                    </td>
                    <td className={TD}>
                      <div className="text-xs">총 {ev.totalQuantity ?? '제한 없음'}</div>
                      <div className="text-xs">매장당 {ev.perStoreLimit ?? '-'} · 주문당 {ev.perOrderLimit ?? '-'}</div>
                    </td>
                    <td className={TD}>
                      <StatusBadge status={ev.status} />
                      {ev.reason && <div className="mt-1 text-xs text-gray-500">{ev.reason}</div>}
                    </td>
                    <td className={TD}>
                      <div className="flex flex-wrap gap-1">
                        {(EVENT_ACTIONS[ev.status] ?? []).map((a) => (
                          <ActionButton
                            key={a.action}
                            label={a.label}
                            action={a.action}
                            disabled={busyId === ev.id}
                            onClick={() =>
                              run(ev.id, a.label, !positive(a.action), (reason) => api.decideEvent(sfKey, ev.id, a.action, reason))
                            }
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {tab === 'recruitments' && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className={TH}>제품</th>
                <th className={TH}>공급자</th>
                <th className={TH}>모집 공급가</th>
                <th className={TH}>소비자가</th>
                <th className={TH}>모집 상태</th>
                <th className={TH}>조건 승인</th>
                <th className={TH}>처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <EmptyRow colSpan={7} text="불러오는 중..." />
              ) : rows.length === 0 ? (
                <EmptyRow colSpan={7} text="해당하는 모집 조건이 없습니다." />
              ) : (
                (rows as SemiFranchiseRecruitment[]).map((r) => (
                  <tr key={r.id}>
                    <td className={TD}>
                      <div className="font-medium text-gray-900">{r.productName}</div>
                      <div className="text-xs text-gray-500">{formatDateTime(r.createdAt)}</div>
                    </td>
                    <td className={TD}>{r.supplierName || '-'}</td>
                    <td className={TD}>{formatWon(r.supplyUnitPrice)}</td>
                    <td className={TD}>{r.consumerPrice ? formatWon(r.consumerPrice) : '-'}</td>
                    <td className={TD}>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className={TD}>
                      <StatusBadge status={r.exposureStatus} />
                      {r.exposureReviewNote && <div className="mt-1 text-xs text-gray-500">{r.exposureReviewNote}</div>}
                    </td>
                    <td className={TD}>
                      <div className="flex flex-wrap gap-1">
                        {(RECRUITMENT_ACTIONS[r.exposureStatus] ?? []).map((a) => (
                          <ActionButton
                            key={a.action}
                            label={a.label}
                            action={a.action}
                            disabled={busyId === r.id}
                            onClick={() =>
                              run(r.id, a.label, a.action === 'reject', (note) => api.decideRecruitment(sfKey, r.id, a.action, note))
                            }
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
