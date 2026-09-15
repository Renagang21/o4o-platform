/**
 * OperatorPartnerApprovalPage — 파트너 서비스 신청 승인 (Operator scope)
 *
 * WO-O4O-NETURE-MAIN-ACCOUNT-AND-SUPPLIER-PARTNER-SERVICE-SEPARATION-V1
 *
 * 공급자 승인(/operator/suppliers) 의 파트너 대칭. 파트너 서비스 상태 단일 출처 = neture.neture_partners.
 * 회원 가입 승인(/operator/applications · service_memberships) 과는 다른 축이다 — 여기서는
 * **파트너 서비스 신청** 만 다룬다. O4O 계정 · 공급자 서비스 상태에는 영향을 주지 않는다.
 *
 * API: GET /neture/operator/partners?status= · POST /neture/operator/partners/:id/approve|reject
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/apiClient';

type PartnerStatus = 'pending' | 'active' | 'rejected' | 'suspended' | 'inactive';

interface OperatorPartnerRow {
  id: string;
  name: string;
  businessName: string | null;
  status: PartnerStatus | string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: '신청 중',
  active: '이용 중',
  rejected: '반려',
  suspended: '정지',
  inactive: '탈퇴',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  suspended: 'bg-slate-200 text-slate-700',
  inactive: 'bg-slate-100 text-slate-500',
};

const FILTERS: Array<{ value: string; label: string }> = [
  { value: 'pending', label: '신청 중' },
  { value: 'active', label: '이용 중' },
  { value: 'rejected', label: '반려' },
  { value: 'suspended', label: '정지' },
  { value: '', label: '전체' },
];

export default function OperatorPartnerApprovalPage() {
  const [status, setStatus] = useState<string>('pending');
  const [rows, setRows] = useState<OperatorPartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/neture/operator/partners', { params: status ? { status } : {} });
      setRows((res.data?.data ?? []) as OperatorPartnerRow[]);
    } catch {
      setError('파트너 신청 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (row: OperatorPartnerRow, action: 'approve' | 'reject') => {
    const label = action === 'approve' ? '승인' : '반려';
    let reason: string | undefined;
    if (action === 'reject') {
      const input = window.prompt(`'${row.name}' 파트너 신청을 반려합니다. 사유(선택):`);
      if (input === null) return;
      reason = input.trim() || undefined;
    } else if (!window.confirm(`'${row.name}' 파트너 신청을 승인합니다. 계속할까요?`)) {
      return;
    }
    setBusyId(row.id);
    try {
      await api.post(`/neture/operator/partners/${row.id}/${action}`, action === 'reject' ? { reason } : {});
      await load();
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
      window.alert(`${label}에 실패했습니다.${code ? ` (${code})` : ''}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6" data-testid="operator-partner-approval-page">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">파트너 승인</h1>
        <p className="text-sm text-gray-500 mt-1">
          파트너 서비스 신청을 승인 · 반려합니다. 회원 가입 승인과 별개이며 공급자 서비스 상태에는 영향을 주지 않습니다.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value || 'all'}
            type="button"
            onClick={() => setStatus(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              status === f.value ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => void load()} className="underline">다시 시도</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3">파트너</th>
              <th className="px-4 py-3">신청 회원</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">신청일</th>
              <th className="px-4 py-3 text-right">처리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">불러오는 중...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">해당 상태의 파트너 신청이 없습니다.</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} data-testid={`operator-partner-row-${row.id}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{row.name}</div>
                    {row.businessName && <div className="text-xs text-gray-500">{row.businessName}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <div>{row.userName ?? '-'}</div>
                    <div className="text-xs text-gray-500">{row.userEmail ?? ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[row.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {STATUS_LABELS[row.status] ?? row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(row.createdAt).toLocaleDateString('ko-KR')}</td>
                  <td className="px-4 py-3 text-right">
                    {row.status === 'pending' ? (
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void act(row, 'approve')}
                          className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
                        >
                          승인
                        </button>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void act(row, 'reject')}
                          className="px-3 py-1.5 rounded-md border border-red-300 text-red-700 text-xs font-medium hover:bg-red-50 disabled:opacity-50"
                        >
                          반려
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
