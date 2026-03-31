/**
 * MemberManagementPage - KPA-a 회원 관리 & 가입 신청 관리
 * WO-KPA-A-MEMBER-APPROVAL-UI-PHASE1-V1
 * WO-O4O-MEMBER-LIST-STANDARDIZATION-V1
 *
 * MemberListLayout + @o4o/ui DataTable 기반 표준화.
 * 탭: 전체 | 약사 | 약대생 | 가입 신청
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from '@o4o/error-handling';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  UserX,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { DataTable } from '@o4o/ui';
import type { Column } from '@o4o/ui';
import { MemberListLayout, StatusBadge } from '@o4o/operator-ux-core';
import type { MemberTab } from '@o4o/operator-ux-core';
import { getAccessToken } from '../../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// ─── Types ───────────────────────────────────────────────────

type MemberStatus = 'pending' | 'active' | 'suspended' | 'withdrawn';
type MemberRole = 'member' | 'operator' | 'admin';
type ApplicationStatus = 'submitted' | 'approved' | 'rejected' | 'cancelled';

interface KpaMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: MemberRole;
  status: MemberStatus;
  membership_type: 'pharmacist' | 'student';
  license_number: string | null;
  pharmacy_name: string | null;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
  user?: { name?: string; email?: string };
  organization?: { name?: string };
}

interface KpaApplication {
  id: string;
  user_id: string;
  organization_id: string;
  type: string;
  payload: Record<string, unknown>;
  status: ApplicationStatus;
  note: string | null;
  reviewer_id: string | null;
  review_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  user?: { name?: string; email?: string };
  organization?: { name?: string };
}

interface ApplicationStats {
  submitted: number;
  approved: number;
  rejected: number;
  cancelled: number;
}

// ─── Helpers ─────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `API error ${res.status}`);
  }
  return res.json();
}

const roleLabels: Record<MemberRole, string> = {
  member: '회원',
  operator: '운영자',
  admin: '관리자',
};

const appStatusConfig: Record<ApplicationStatus, { label: string; color: string; bg: string }> = {
  submitted: { label: '대기', color: 'text-amber-700', bg: 'bg-amber-50' },
  approved: { label: '승인', color: 'text-green-700', bg: 'bg-green-50' },
  rejected: { label: '반려', color: 'text-red-700', bg: 'bg-red-50' },
  cancelled: { label: '취소', color: 'text-slate-500', bg: 'bg-slate-100' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

// ─── Role Tab Filter ─────────────────────────────────────────

const ROLE_TAB_FILTER: Record<string, string[]> = {
  all: [],
  pharmacist: ['pharmacist'],
  student: ['student'],
  applications: [],
};

// ─── Component ───────────────────────────────────────────────

export default function MemberManagementPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [memberTotal, setMemberTotal] = useState(0);
  const [pendingMemberCount, setPendingMemberCount] = useState(0);
  const [pharmacistCount, setPharmacistCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);

  // Members state
  const [members, setMembers] = useState<KpaMember[]>([]);
  const [memberLoading, setMemberLoading] = useState(true);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberPage, setMemberPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Stats fetch
  useEffect(() => {
    apiFetch<{ data: ApplicationStats }>('/api/v1/kpa/applications/admin/stats')
      .then(r => setStats(r.data))
      .catch(() => {});
    apiFetch<{ total: number }>('/api/v1/kpa/members?status=pending&limit=1')
      .then(r => setPendingMemberCount(r.total ?? 0))
      .catch(() => {});
  }, []);

  // Fetch members
  const fetchMembers = useCallback(async (page = 1) => {
    setMemberLoading(true);
    setMemberError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (searchQuery) params.set('search', searchQuery);
      const res = await apiFetch<{ data: KpaMember[]; total: number; totalPages: number }>(
        `/api/v1/kpa/members?${params}`,
      );
      setMembers(res.data);
      setMemberTotal(res.total);

      // Count by membership_type
      const allRes = await apiFetch<{ data: KpaMember[]; total: number }>('/api/v1/kpa/members?limit=1000');
      const all = allRes.data || [];
      setPharmacistCount(all.filter(m => m.membership_type === 'pharmacist').length);
      setStudentCount(all.filter(m => m.membership_type === 'student').length);
    } catch (e: any) {
      setMemberError(e.message);
    } finally {
      setMemberLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (activeTab !== 'applications') {
      fetchMembers(1);
    }
  }, [fetchMembers, activeTab]);

  async function handleStatusChange(memberId: string, newStatus: MemberStatus) {
    const labels: Record<string, string> = { active: '승인', suspended: '정지', pending: '대기' };
    if (!confirm(`회원 상태를 "${labels[newStatus] || newStatus}"(으)로 변경하시겠습니까?`)) return;
    setActionLoading(memberId);
    try {
      await apiFetch(`/api/v1/kpa/members/${memberId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchMembers(memberPage);
    } catch (e: any) {
      toast.error(e.message || '상태 변경에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  }

  // Client-side tab filtering
  const filteredMembers = useMemo(() => {
    if (activeTab === 'all' || activeTab === 'applications') return members;
    const allowed = ROLE_TAB_FILTER[activeTab];
    if (!allowed || allowed.length === 0) return members;
    return members.filter(m => allowed.includes(m.membership_type));
  }, [members, activeTab]);

  // Tabs
  const tabs: MemberTab[] = [
    { key: 'all', label: '전체', count: memberTotal },
    { key: 'pharmacist', label: '약사', count: pharmacistCount },
    { key: 'student', label: '약대생', count: studentCount },
    { key: 'applications', label: '가입 신청', count: stats?.submitted ?? 0 },
  ];

  // DataTable columns for members
  const memberColumns: Column<KpaMember>[] = [
    {
      key: 'name',
      title: '이름',
      sortable: true,
      width: '150px',
      render: (_v, m) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-sm font-medium text-slate-600 shrink-0">
            {(m.user?.name || '-').charAt(0)}
          </div>
          <span className="font-medium text-slate-800 text-sm">{m.user?.name || '-'}</span>
        </div>
      ),
      sorter: (a, b) => (a.user?.name || '').localeCompare(b.user?.name || ''),
    },
    {
      key: 'email',
      title: '이메일',
      sortable: true,
      width: '200px',
      render: (_v, m) => <span className="text-sm text-slate-600">{m.user?.email || '-'}</span>,
      sorter: (a, b) => (a.user?.email || '').localeCompare(b.user?.email || ''),
    },
    {
      key: 'membership_type',
      title: '유형',
      width: '80px',
      render: (_v, m) => (
        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${
          m.membership_type === 'student'
            ? 'bg-sky-50 border-sky-200 text-sky-700'
            : 'bg-teal-50 border-teal-200 text-teal-700'
        }`}>
          {m.membership_type === 'student' ? '약대생' : '약사'}
        </span>
      ),
    },
    {
      key: 'role',
      title: '역할',
      width: '80px',
      render: (_v, m) => <span className="text-sm text-slate-600">{roleLabels[m.role]}</span>,
    },
    {
      key: 'status',
      title: '상태',
      width: '80px',
      render: (_v, m) => <StatusBadge status={m.status} />,
    },
    {
      key: 'joined_at',
      title: '가입일',
      sortable: true,
      width: '100px',
      render: (_v, m) => <span className="text-sm text-slate-500">{formatDate(m.joined_at || m.created_at)}</span>,
      sorter: (a, b) => new Date(a.joined_at || a.created_at).getTime() - new Date(b.joined_at || b.created_at).getTime(),
    },
    {
      key: 'actions',
      title: '액션',
      width: '100px',
      align: 'right',
      render: (_v, m) => (
        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
          {actionLoading === m.id ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          ) : (
            <>
              {m.status === 'pending' && (
                <>
                  <button onClick={() => handleStatusChange(m.id, 'active')} title="승인" className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><UserCheck className="w-4 h-4" /></button>
                  <button onClick={() => handleStatusChange(m.id, 'suspended')} title="정지" className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><UserX className="w-4 h-4" /></button>
                </>
              )}
              {m.status === 'active' && (
                <button onClick={() => handleStatusChange(m.id, 'suspended')} className="text-xs text-red-500 hover:underline">정지</button>
              )}
              {m.status === 'suspended' && (
                <button onClick={() => handleStatusChange(m.id, 'active')} className="text-xs text-green-600 hover:underline">복원</button>
              )}
              {m.status === 'withdrawn' && <span className="text-xs text-slate-400">-</span>}
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">총 회원 수</p>
              <p className="text-xl font-bold text-slate-900">{memberTotal}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">승인 대기</p>
              <p className="text-xl font-bold text-slate-900">{pendingMemberCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">승인 완료</p>
              <p className="text-xl font-bold text-slate-900">{stats?.approved ?? '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Member List Layout */}
      <MemberListLayout
        title="회원 관리"
        description="회원 현황 조회 및 가입 신청 승인/반려"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        search={search}
        onSearchChange={setSearch}
        onSearch={setSearchQuery}
        searchPlaceholder="이름, 이메일로 검색"
        headerActions={
          <button
            onClick={() => { fetchMembers(memberPage); }}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />새로고침
          </button>
        }
      >
        {activeTab === 'applications' ? (
          <ApplicationsTab onReviewComplete={() => {
            apiFetch<{ data: ApplicationStats }>('/api/v1/kpa/applications/admin/stats')
              .then(r => setStats(r.data))
              .catch(() => {});
          }} />
        ) : (
          <>
            {memberError && (
              <div className="flex items-center gap-2 p-4 text-sm text-red-700 bg-red-50">
                <AlertCircle className="w-4 h-4 shrink-0" />{memberError}
              </div>
            )}
            <DataTable<KpaMember>
              columns={memberColumns}
              dataSource={filteredMembers}
              rowKey="id"
              loading={memberLoading}
              emptyText="회원이 없습니다."
              pagination={{
                current: memberPage,
                pageSize: 20,
                total: activeTab === 'all' ? memberTotal : filteredMembers.length,
                onChange: (page) => { setMemberPage(page); fetchMembers(page); },
              }}
            />
          </>
        )}
      </MemberListLayout>
    </div>
  );
}

// ─── Applications Tab (기존 유지) ────────────────────────────

function ApplicationsTab({ onReviewComplete }: { onReviewComplete: () => void }) {
  const [apps, setApps] = useState<KpaApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('submitted');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewTarget, setReviewTarget] = useState<string | null>(null);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiFetch<{ data: KpaApplication[]; total: number; totalPages: number }>(
        `/api/v1/kpa/applications/admin/all?${params}`,
      );
      setApps(res.data);
      setTotalPages(res.totalPages);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  async function handleReview(appId: string, status: 'approved' | 'rejected') {
    const label = status === 'approved' ? '승인' : '반려';
    if (!confirm(`이 신청을 ${label}하시겠습니까?`)) return;
    setActionLoading(appId);
    try {
      await apiFetch(`/api/v1/kpa/applications/${appId}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status, review_comment: reviewComment || undefined }),
      });
      setReviewTarget(null);
      setReviewComment('');
      await fetchApps();
      onReviewComplete();
    } catch (e: any) {
      toast.error(e.message || '처리에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />신청 목록을 불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-red-500">
        <AlertCircle className="w-6 h-6 mb-2" />
        <p className="text-sm">{error}</p>
        <button onClick={fetchApps} className="mt-3 text-sm text-blue-600 hover:underline">다시 시도</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="text-sm border border-slate-300 rounded-md px-3 py-1.5 bg-white"
        >
          <option value="">전체</option>
          <option value="submitted">대기</option>
          <option value="approved">승인</option>
          <option value="rejected">반려</option>
          <option value="cancelled">취소</option>
        </select>
        <button onClick={fetchApps} className="text-sm text-slate-500 hover:text-slate-700">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
            <th className="px-4 py-3 font-medium">신청자</th>
            <th className="px-4 py-3 font-medium">이메일</th>
            <th className="px-4 py-3 font-medium">유형</th>
            <th className="px-4 py-3 font-medium">신청일</th>
            <th className="px-4 py-3 font-medium">상태</th>
            <th className="px-4 py-3 font-medium">메모</th>
            <th className="px-4 py-3 font-medium">액션</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {apps.length === 0 ? (
            <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">
              {statusFilter === 'submitted' ? '대기 중인 신청이 없습니다.' : '신청 내역이 없습니다.'}
            </td></tr>
          ) : apps.map(app => {
            const sc = appStatusConfig[app.status];
            return (
              <tr key={app.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{app.user?.name || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{app.user?.email || '-'}</td>
                <td className="px-4 py-3 text-slate-600">
                  {app.type === 'membership' ? '회원가입' : app.type === 'service' ? '서비스' : app.type}
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDate(app.created_at)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sc.color} ${sc.bg}`}>{sc.label}</span>
                </td>
                <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate" title={app.note || ''}>{app.note || '-'}</td>
                <td className="px-4 py-3">
                  {app.status === 'submitted' ? (
                    actionLoading === app.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    ) : reviewTarget === app.id ? (
                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          value={reviewComment}
                          onChange={e => setReviewComment(e.target.value)}
                          placeholder="코멘트 (선택)"
                          className="text-xs border border-slate-300 rounded px-2 py-1 w-36"
                        />
                        <div className="flex gap-1">
                          <button onClick={() => handleReview(app.id, 'approved')} className="px-2 py-0.5 text-xs bg-green-600 text-white rounded hover:bg-green-700">승인</button>
                          <button onClick={() => handleReview(app.id, 'rejected')} className="px-2 py-0.5 text-xs bg-red-500 text-white rounded hover:bg-red-600">반려</button>
                          <button onClick={() => { setReviewTarget(null); setReviewComment(''); }} className="px-2 py-0.5 text-xs text-slate-500 hover:underline">취소</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <button onClick={() => handleReview(app.id, 'approved')} className="p-1 text-green-600 hover:bg-green-50 rounded" title="승인"><CheckCircle className="w-4 h-4" /></button>
                        <button onClick={() => setReviewTarget(app.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="반려"><XCircle className="w-4 h-4" /></button>
                      </div>
                    )
                  ) : (
                    <span className="text-xs text-slate-400">{app.review_comment ? `"${app.review_comment}"` : '-'}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4 border-t border-slate-100">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border border-slate-300 rounded-md disabled:opacity-40">이전</button>
          <span className="text-sm text-slate-600">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border border-slate-300 rounded-md disabled:opacity-40">다음</button>
        </div>
      )}
    </div>
  );
}
