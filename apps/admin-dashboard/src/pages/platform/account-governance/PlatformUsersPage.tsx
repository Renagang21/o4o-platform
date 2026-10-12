/**
 * PlatformUsersPage — /admin/platform/users
 *
 * WO-O4O-PLATFORM-GLOBAL-USERS-READONLY-LIST-V1
 * 선행: IR-O4O-PLATFORM-GLOBAL-USERS-UI-SCOPE-AUDIT-V1 (권장안 B — read-only + PII 투영)
 *
 * 조회 projection은 유지. 승인된 WO-O4O-TWO-STAGE-ACCOUNT-ERASURE-CORE-V1의
 * 플랫폼 관리자 완전 제거 요청/실제 완료 상태를 역할 해제와 분리한다.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@o4o/auth-context';
import AccountErasureControls from './AccountErasureControls';
import { Search, Info } from 'lucide-react';
import { DataTable, type ListColumnDef } from '@o4o/operator-ux-core';
import { platformAdminApi, type PlatformUser } from '@/api/platform-governance';
import { api } from '@/api/base';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  try { return new Date(iso).toLocaleDateString('ko-KR'); } catch { return '-'; }
}

const ROLE_LABEL: Record<string, string> = {
  'platform:super_admin': '슈퍼관리자',
  'neture:admin': 'Neture 관리자',
  'neture:operator': 'Neture 운영자',
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

const columns: ListColumnDef<PlatformUser>[] = [
  {
    key: 'nameEmail',
    header: '이름 / 이메일',
    align: 'left',
    render: (_value, u) => (
      <>
        <div className="font-medium text-slate-800">{u.name || '-'}</div>
        <div className="text-xs text-slate-400">{u.email}</div>
      </>
    ),
  },
  {
    key: 'roles',
    header: '역할',
    align: 'left',
    render: (_value, u) => (
      <div className="flex flex-wrap gap-1">
        {u.roles.length === 0
          ? <span className="text-xs text-slate-400">일반 사용자</span>
          : u.roles.map((r) => (
              <span key={r} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                {ROLE_LABEL[r] || r}
              </span>
            ))}
      </div>
    ),
  },
  {
    key: 'status',
    header: '상태',
    align: 'left',
    render: (_value, u) => <span className="text-slate-500">{u.status}</span>,
  },
  {
    key: 'isActive',
    header: '활성',
    align: 'left',
    render: (_value, u) => (
      u.isActive
        ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">활성</span>
        : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">비활성</span>
    ),
  },
  {
    key: 'createdAt',
    header: '가입일',
    align: 'left',
    render: (_value, u) => <span className="text-slate-500">{fmtDate(u.createdAt)}</span>,
  },
  {
    key: 'lastLoginAt',
    header: '최근 로그인',
    align: 'left',
    render: (_value, u) => <span className="text-slate-500">{fmtDate(u.lastLoginAt)}</span>,
  },
];

export default function PlatformUsersPage() {
  const { user: currentUser } = useAuth();
  const isPlatformAdmin=currentUser?.roles?.includes('platform:super_admin') ?? false;
  const [erasureReady,setErasureReady]=useState(false);
  useEffect(()=>{
    let live=true;setErasureReady(false);
    if(isPlatformAdmin) void api.get('/admin/users/erasure-capabilities')
      .then(r=>{if(live)setErasureReady(r.data?.data?.enabled===true);}).catch(()=>{});
    return ()=>{live=false;};
  },[currentUser?.id,isPlatformAdmin]);
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
        O4O 전체 사용자 현황과 계정 완전 제거 처리 상태를 확인합니다.
        서비스 사용중지는 해당 Operator가 처리하고, 전체 계정 완전 제거는 Admin이 요청합니다. 권한 해제와는 별도 절차입니다.
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
          <DataTable<PlatformUser>
            columns={isPlatformAdmin && erasureReady && currentUser ? [...columns, {
              key: 'erasure', header: '계정 완전 제거',
              render: (_value: unknown, u: PlatformUser) => u.roles.includes('platform:super_admin')
                ? <span className="text-xs text-slate-500">보호된 관리자 계정</span>
                : <AccountErasureControls accountId={String(currentUser.id)} userId={u.id} onCompleted={load} />,
            }] : columns}
            data={users}
            rowKey={(u) => u.id}
            emptyMessage="조건에 맞는 사용자가 없습니다."
          />

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
