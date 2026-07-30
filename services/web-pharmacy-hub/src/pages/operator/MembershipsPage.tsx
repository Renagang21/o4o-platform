/**
 * MembershipsPage — Pharmacy-Hub 운영자 회원 승인 콘솔 (목록)
 *
 * WO-PHARMACY-HUB-MEMBERSHIP-JOIN-AND-APPROVAL-V1 §6-D
 *
 * 범위 (§5.5): 회원 가입 신청 목록 / 승인 / 반려. 상품·주문·콘텐츠 승인 없음.
 * 조회·처리 모두 backend 에서 service_key='pharmacy-hub' 로 고정된다.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/apiClient';
import { BRAND, ROLE_LABELS, SERVICE_KEY } from '../../config/service';

interface MembershipRow {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  roleType: string | null;
  rejectionReason: string | null;
  appliedAt: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_TABS = [
  { value: 'pending', label: '승인 대기' },
  { value: 'active', label: '승인 완료' },
  { value: 'rejected', label: '반려' },
  { value: 'all', label: '전체' },
];

const STATUS_LABEL: Record<string, string> = {
  pending: '승인 대기',
  active: '승인 완료',
  rejected: '반려',
  suspended: '정지',
  withdrawn: '탈퇴',
};

const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString('ko-KR') : '-');

const roleLabel = (roleType: string | null) =>
  roleType ? ROLE_LABELS[`${SERVICE_KEY}:${roleType}`] ?? roleType : '-';

export default function MembershipsPage() {
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<MembershipRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/pharmacy-hub/operator/memberships', {
        params: { status, search: search || undefined, page, limit: 20 },
      });
      setItems(res.data?.data?.items ?? []);
      setPagination(res.data?.data?.pagination ?? null);
    } catch {
      setError('가입 신청 목록을 불러오지 못했습니다.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async (row: MembershipRow) => {
    if (!window.confirm(`${row.email} 님의 가입을 승인하시겠습니까?`)) return;
    setBusyId(row.id);
    try {
      await api.patch(`/pharmacy-hub/operator/memberships/${row.id}/approve`);
      await load();
    } catch {
      setError('가입 승인에 실패했습니다.');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (row: MembershipRow) => {
    const reason = window.prompt('반려 사유를 입력해 주세요.');
    if (reason === null) return;
    if (!reason.trim()) {
      setError('반려 사유를 입력해 주세요.');
      return;
    }
    setBusyId(row.id);
    try {
      await api.patch(`/pharmacy-hub/operator/memberships/${row.id}/reject`, { reason: reason.trim() });
      await load();
    } catch {
      setError('가입 반려에 실패했습니다.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-1 text-xl font-bold">{BRAND.name} 가입 신청 관리</h1>
      <p className="mb-6 text-sm text-gray-500">
        회원 가입 신청의 승인·반려만 처리합니다. 상품·주문·콘텐츠 승인은 이 콘솔의 범위가 아닙니다.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
            className={`rounded border px-3 py-1.5 text-sm ${
              status === tab.value
                ? 'border-primary-600 bg-primary-50 text-primary-600'
                : 'border-gray-300 bg-white text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <form
          className="ml-auto flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            void load();
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이메일 · 이름 검색"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
          <button type="submit" className="rounded border border-gray-300 px-3 py-1.5 text-sm">
            검색
          </button>
        </form>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">신청자</th>
              <th className="px-3 py-2">신청 역할</th>
              <th className="px-3 py-2">약국/회사</th>
              <th className="px-3 py-2">신청 일시</th>
              <th className="px-3 py-2">상태</th>
              <th className="px-3 py-2 text-right">처리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                  불러오는 중…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                  해당 조건의 가입 신청이 없습니다.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    <Link to={`/operator/memberships/${row.id}`} className="text-primary-600 underline">
                      {row.name || row.email}
                    </Link>
                    <span className="block text-xs text-gray-400">{row.email}</span>
                  </td>
                  <td className="px-3 py-2">{roleLabel(row.roleType)}</td>
                  <td className="px-3 py-2">{row.company || '-'}</td>
                  <td className="px-3 py-2">{fmt(row.appliedAt)}</td>
                  <td className="px-3 py-2">
                    {STATUS_LABEL[row.status] ?? row.status}
                    {row.status === 'rejected' && row.rejectionReason && (
                      <span className="block text-xs text-gray-400">{row.rejectionReason}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {row.status === 'pending' ? (
                      <span className="inline-flex gap-2">
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void approve(row)}
                          className="rounded bg-primary-600 px-2 py-1 text-xs text-white disabled:opacity-50"
                        >
                          승인
                        </button>
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void reject(row)}
                          className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
                        >
                          반려
                        </button>
                      </span>
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

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40"
          >
            이전
          </button>
          <span className="text-gray-500">
            {pagination.page} / {pagination.totalPages} (총 {pagination.total}건)
          </span>
          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}

      <p className="mt-6 text-sm">
        <Link to="/operator" className="text-gray-500 underline">
          운영자 홈
        </Link>
      </p>
    </div>
  );
}
