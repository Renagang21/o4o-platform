import { getPharmacyManagementClient } from './api';
/**
 * PharmacyMembershipReviewPage — 내 매장(약국) 신청 심사 (/operator/pharmacy-memberships)
 *   이 원장은 Neture 가입이 아니다. 승인 시 서버가 신청자의 Neture 가입 승인(active)을 직접 확인한다(아니면 409).
 *
 * WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1 · DESIGN §3-1
 *   운영자가 신청 원장의 사업자번호 · 약사 면허번호를 검토해 승인 · 반려 · 정지 · 재개 · 종료한다.
 *   자동 검증 · 점수 없음. 기본 승인은 어떤 세미프랜차이즈 가입도 만들지 않는다.
 *   권한 판정은 API(neture:operator) 가 한다.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  neturePharmacyOperatorApi,
  formatDateTime,
  MEMBERSHIP_ACTIONS_BY_STATUS,
  type MembershipAction,
  type PharmacyMembership,
} from './api';
import {
  ActionButton,
  EmptyRow,
  Message,
  PageHeader,
  StatusBadge,
  StatusFilter,
  INPUT,
  TD,
  TH,
  askReason,
} from './PharmacyCommerceUi';

const STATUS_OPTIONS = [
  { value: 'pending', label: '대기' },
  { value: 'active', label: '활성' },
  { value: 'suspended', label: '정지' },
  { value: 'rejected', label: '반려' },
  { value: 'terminated', label: '종료' },
  { value: '', label: '전체' },
];


const LIMIT = 20;

export default function PharmacyMembershipReviewPage() {
  const [status, setStatus] = useState('pending');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<PharmacyMembership[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await neturePharmacyOperatorApi.listMemberships({ status, q: query, page, limit: LIMIT });
      setItems(data?.items ?? []);
      setTotal(data?.total ?? 0);
    } catch (err) {
      setItems([]);
      setTotal(0);
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [status, query, page]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (m: PharmacyMembership, action: MembershipAction, label: string) => {
    let reason: string | undefined;
    if (action !== 'approve' && action !== 'reactivate') {
      const r = askReason(label);
      if (r === null) return;
      reason = r || undefined;
    } else if (!window.confirm(`${m.pharmacy_name} — ${label} 처리할까요?`)) {
      return;
    }
    setBusyId(m.id);
    setMessage(null);
    try {
      await neturePharmacyOperatorApi.decideMembership(m.id, action, reason);
      setMessage({ type: 'success', text: `${m.pharmacy_name} — ${label} 처리했습니다.` });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  const download = async (id: string) => {
    try {
      const response = await getPharmacyManagementClient().get(`/neture/operator/pharmacy-documents/${id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a'); link.href = url; link.download = 'business-registration'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setMessage({ type: 'error', text: '사업자등록증을 불러오지 못했습니다.' }); }
  };
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        title="내 매장(약국) 신청 심사"
        description="신청 원장의 사업자등록번호 · 약사 면허번호를 확인해 처리합니다. 사업자등록증 사본과 약사 면허번호를 검토하고 오프라인으로 약국 여부를 확인해 주세요. 신청자의 메인 이메일 확인이 필요합니다. 이 승인은 Neture 가입 · 세미프랜차이즈 가입을 바꾸지 않습니다."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusFilter
          value={status}
          options={STATUS_OPTIONS}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setQuery(q.trim());
          }}
        >
          <input className={INPUT} placeholder="약국명 · 사업자번호 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="submit" className="whitespace-nowrap rounded-md bg-gray-800 px-3 py-2 text-sm text-white">
            검색
          </button>
        </form>
      </div>

      <Message message={message} />

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className={TH}>약국</th>
              <th className={TH}>사업자등록번호</th>
              <th className={TH}>약사 면허번호</th>
              <th className={TH}>신청일</th>
              <th className={TH}>상태</th>
              <th className={TH}>사유</th>
              <th className={TH}>처리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <EmptyRow colSpan={7} text="불러오는 중..." />
            ) : items.length === 0 ? (
              <EmptyRow colSpan={7} text="해당하는 신청이 없습니다." />
            ) : (
              items.map((m) => (
                <tr key={m.id}>
                  <td className={TD}>
                    <div className="font-medium text-gray-900">{m.pharmacy_name}</div>
                    {m.organization_address && <div className="text-xs text-gray-500">{m.organization_address}</div>}
                  </td>
                  <td className={TD}>{m.business_number}</td>
                  <td className={TD}>{m.pharmacist_license_number}
                    {m.business_profile?.businessRegistrationDocumentId && <button type="button" className="block text-blue-700" onClick={() => void download(m.business_profile!.businessRegistrationDocumentId)}>사업자등록증 확인</button>}
                    <span className="block text-xs">{m.business_profile?.representativeName} · {m.organization_address}</span>
                  </td>
                  <td className={TD}>{formatDateTime(m.applied_at)}</td>
                  <td className={TD}>
                    <StatusBadge status={m.status} />
                  </td>
                  <td className={TD}>{m.reason || '-'}</td>
                  <td className={TD}>
                    <div className="flex flex-wrap gap-1">
                      {(MEMBERSHIP_ACTIONS_BY_STATUS[m.status] ?? []).map((a) => (
                        <ActionButton
                          key={a.action}
                          label={a.label}
                          action={a.action}
                          disabled={busyId === m.id}
                          onClick={() => decide(m, a.action, a.label)}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border px-3 py-1 disabled:opacity-40">
            이전
          </button>
          <span>
            {page} / {totalPages} (총 {total}건)
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="rounded border px-3 py-1 disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
