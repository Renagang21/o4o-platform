/**
 * PlatformUsersPage — /admin/platform/users
 *
 * WO-O4O-PLATFORM-GLOBAL-USERS-READONLY-LIST-V1
 * 선행: IR-O4O-PLATFORM-GLOBAL-USERS-UI-SCOPE-AUDIT-V1 (권장안 B — read-only + PII 투영)
 *
 * O4O 전체 사용자 현황 read-only 조회. backend `/api/v1/admin/platform-users`(안전 투영) 사용.
 * 이용중지·삭제·개인정보 파기·권한 변경은 각 전용 관리 화면(operator/service admin) 소관 — 본 화면 미제공.
 * action 버튼/상세 개인정보 조회 없음.
 */

import { useState, useEffect, useCallback } from 'react';
import { Search, Info } from 'lucide-react';
import { platformAdminApi, type PlatformUser } from '../../../lib/api/platform';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  try { return new Date(iso).toLocaleDateString('ko-KR'); } catch { return '-'; }
}

const ROLE_LABEL: Record<string, string> = {
  'platform:super_admin': '슈퍼관리자',
  'platform:admin': '플랫폼관리자',
  'neture:admin': 'Neture 관리자',
  'neture:operator': 'Neture 운영자',
  'glycopharm:admin': 'GlycoPharm 관리자',
  'glycopharm:operator': 'GlycoPharm 운영자',
  'cosmetics:admin': 'K-Cosmetics 관리자',
  'cosmetics:operator': 'K-Cosmetics 운영자',
  'kpa-society:admin': 'KPA 관리자',
  'kpa-society:operator': 'KPA 운영자',
};

const STATUS_OPTIONS = [
  { value: 'all', label: '전체 상태' },
  { value: 'active', label: 'active' },
  { value: 'pending', label: 'pending' },
  { value: 'suspended', label: 'suspended' },
  { value: 'inactive', label: 'inactive' },
];

const LIMIT = 20;

export default function PlatformUsersPage() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // 입력값(즉시) / 적용값(조회 트리거) 분리
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await platformAdminApi.getUsers({ page, limit: LIMIT, search: search || undefined, status });
      setUsers(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages || 1);
    } catch (err: any) {
      setError(err?.message || '사용자 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);

  const applySearch = () => { setPage(1); setSearch(searchInput.trim()); };

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">전체 사용자 조회</h1>
      <p className="text-sm text-slate-500 mb-3">
        O4O 전체 사용자 현황을 조회하는 <strong>read-only</strong> 화면입니다.
        이용중지·개인정보 파기·권한 변경은 각 서비스의 전용 관리 화면에서 처리합니다.
      </p>

      <div className="flex items-start gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 mb-5 text-xs text-slate-500">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <span>개인정보 보호를 위해 식별·거버넌스에 필요한 최소 정보만 표시합니다(연락처·동의 이력·접속 IP 등 미표시).</span>
      </div>

      {/* 검색/필터 */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') applySearch(); }}
            placeholder="이메일 / 이름 / 회사 검색"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setPage(1); setStatus(e.target.value); }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button
          onClick={applySearch}
          className="px-4 py-2 text-sm font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-900"
        >
          검색
        </button>
      </div>

      {error ? (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">{error}</div>
      ) : loading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />)}</div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-sm text-slate-400">조건에 맞는 사용자가 없습니다.</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs">
                  <th className="text-left px-4 py-3 font-semibold">이름 / 이메일</th>
                  <th className="text-left px-4 py-3 font-semibold">역할</th>
                  <th className="text-left px-4 py-3 font-semibold">상태</th>
                  <th className="text-left px-4 py-3 font-semibold">활성</th>
                  <th className="text-left px-4 py-3 font-semibold">가입일</th>
                  <th className="text-left px-4 py-3 font-semibold">최근 로그인</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{u.name || '-'}</div>
                      <div className="text-xs text-slate-400">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0
                          ? <span className="text-xs text-slate-400">일반 사용자</span>
                          : u.roles.map((r) => (
                              <span key={r} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                                {ROLE_LABEL[r] || r}
                              </span>
                            ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{u.status}</td>
                    <td className="px-4 py-3">
                      {u.isActive
                        ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">활성</span>
                        : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">비활성</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{fmtDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-slate-500">{fmtDate(u.lastLoginAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* pagination */}
          <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
            <span>총 {total.toLocaleString()}명 · {page} / {totalPages} 페이지</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
              >
                이전
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
              >
                다음
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
