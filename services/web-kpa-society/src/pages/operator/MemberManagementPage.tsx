/**
 * MemberManagementPage - KPA-a 회원 관리 & 가입 신청 관리
 * WO-KPA-A-MEMBER-APPROVAL-UI-PHASE1-V1
 *
 * 탭 구조:
 * - 회원 목록: GET /api/v1/kpa/members + PATCH /members/:id/status
 * - 가입 신청: GET /api/v1/kpa/applications/admin/all + PATCH /applications/:id/review
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  UserX,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
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

const memberStatusConfig: Record<MemberStatus, { label: string; color: string; bg: string }> = {
  pending: { label: '대기', color: 'text-amber-700', bg: 'bg-amber-50' },
  active: { label: '활성', color: 'text-green-700', bg: 'bg-green-50' },
  suspended: { label: '정지', color: 'text-red-700', bg: 'bg-red-50' },
  withdrawn: { label: '탈퇴', color: 'text-slate-500', bg: 'bg-slate-100' },
};

const appStatusConfig: Record<ApplicationStatus, { label: string; color: string; bg: string }> = {
  submitted: { label: '대기', color: 'text-amber-700', bg: 'bg-amber-50' },
  approved: { label: '승인', color: 'text-green-700', bg: 'bg-green-50' },
  rejected: { label: '반려', color: 'text-red-700', bg: 'bg-red-50' },
  cancelled: { label: '취소', color: 'text-slate-500', bg: 'bg-slate-100' },
};

const roleLabels: Record<MemberRole, string> = {
  member: '회원',
  operator: '운영자',
  admin: '관리자',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

// ─── Component ───────────────────────────────────────────────

type TabKey = 'members' | 'applications';

export default function MemberManagementPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('members');
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [memberTotal, setMemberTotal] = useState<number>(0);
  const [pendingMemberCount, setPendingMemberCount] = useState<number>(0);

  // Stats fetch — 회원 대기 수는 HUB과 동일 소스(/members?status=pending) 사용
  useEffect(() => {
    apiFetch<{ data: ApplicationStats }>('/api/v1/kpa/applications/admin/stats')
      .then(r => setStats(r.data))
      .catch(() => {});
    apiFetch<{ total: number }>('/api/v1/kpa/members?status=pending&limit=1')
      .then(r => setPendingMemberCount(r.total ?? 0))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">회원 관리</h1>
        <p className="text-sm text-slate-500 mt-1">회원 현황 조회 및 가입 신청 승인/반려</p>
      </div>

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

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'members'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
            회원 목록
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'applications'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
            가입 신청
            {stats && stats.submitted > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                {stats.submitted}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'members' ? (
        <MembersTab onTotalChange={setMemberTotal} />
      ) : (
        <ApplicationsTab onReviewComplete={() => {
          apiFetch<{ data: ApplicationStats }>('/api/v1/kpa/applications/admin/stats')
            .then(r => setStats(r.data))
            .catch(() => {});
        }} />
      )}
    </div>
  );
}

// ─── Members Tab ─────────────────────────────────────────────

function MembersTab({ onTotalChange }: { onTotalChange: (n: number) => void }) {
  const [members, setMembers] = useState<KpaMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const limit = 20;

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiFetch<{ data: KpaMember[]; total: number; totalPages: number }>(
        `/api/v1/kpa/members?${params}`,
      );
      setMembers(res.data);
      setTotalPages(res.totalPages);
      onTotalChange(res.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, onTotalChange]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  async function handleStatusChange(memberId: string, newStatus: MemberStatus) {
    if (!confirm(`회원 상태를 "${memberStatusConfig[newStatus].label}"(으)로 변경하시겠습니까?`)) return;
    setActionLoading(memberId);
    try {
      await apiFetch(`/api/v1/kpa/members/${memberId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchMembers();
    } catch (e: any) {
      alert(`상태 변경 실패: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        회원 목록을 불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-red-500">
        <AlertCircle className="w-6 h-6 mb-2" />
        <p className="text-sm">{error}</p>
        <button onClick={fetchMembers} className="mt-3 text-sm text-blue-600 hover:underline">
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="text-sm border border-slate-300 rounded-md px-3 py-1.5 bg-white"
        >
          <option value="">전체 상태</option>
          <option value="pending">대기</option>
          <option value="active">활성</option>
          <option value="suspended">정지</option>
          <option value="withdrawn">탈퇴</option>
        </select>
        <button onClick={fetchMembers} className="text-sm text-slate-500 hover:text-slate-700">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
              <th className="px-4 py-3 font-medium">이름</th>
              <th className="px-4 py-3 font-medium">이메일</th>
              <th className="px-4 py-3 font-medium">유형</th>
              <th className="px-4 py-3 font-medium">역할</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 font-medium">가입일</th>
              <th className="px-4 py-3 font-medium">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  회원이 없습니다.
                </td>
              </tr>
            ) : (
              members.map(m => {
                const sc = memberStatusConfig[m.status];
                return (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {m.user?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {m.user?.email || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {m.membership_type === 'student' ? '약대생' : '약사'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {roleLabels[m.role]}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sc.color} ${sc.bg}`}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(m.joined_at || m.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {actionLoading === m.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      ) : (
                        <MemberActions member={m} onStatusChange={handleStatusChange} />
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 text-sm border border-slate-300 rounded-md disabled:opacity-40"
          >
            이전
          </button>
          <span className="text-sm text-slate-600">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 text-sm border border-slate-300 rounded-md disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}

function MemberActions({
  member,
  onStatusChange,
}: {
  member: KpaMember;
  onStatusChange: (id: string, status: MemberStatus) => void;
}) {
  if (member.status === 'pending') {
    return (
      <div className="flex gap-1">
        <button
          onClick={() => onStatusChange(member.id, 'active')}
          className="p-1 text-green-600 hover:bg-green-50 rounded"
          title="승인"
        >
          <UserCheck className="w-4 h-4" />
        </button>
        <button
          onClick={() => onStatusChange(member.id, 'suspended')}
          className="p-1 text-red-500 hover:bg-red-50 rounded"
          title="정지"
        >
          <UserX className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (member.status === 'active') {
    return (
      <button
        onClick={() => onStatusChange(member.id, 'suspended')}
        className="text-xs text-red-500 hover:underline"
      >
        정지
      </button>
    );
  }

  if (member.status === 'suspended') {
    return (
      <button
        onClick={() => onStatusChange(member.id, 'active')}
        className="text-xs text-green-600 hover:underline"
      >
        복원
      </button>
    );
  }

  return <span className="text-xs text-slate-400">-</span>;
}

// ─── Applications Tab ────────────────────────────────────────

function ApplicationsTab({ onReviewComplete }: { onReviewComplete: () => void }) {
  const [apps, setApps] = useState<KpaApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('submitted');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewTarget, setReviewTarget] = useState<string | null>(null);
  const limit = 20;

  const fetchApps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
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
        body: JSON.stringify({
          status,
          review_comment: reviewComment || undefined,
        }),
      });
      setReviewTarget(null);
      setReviewComment('');
      await fetchApps();
      onReviewComplete();
    } catch (e: any) {
      alert(`처리 실패: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        신청 목록을 불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-red-500">
        <AlertCircle className="w-6 h-6 mb-2" />
        <p className="text-sm">{error}</p>
        <button onClick={fetchApps} className="mt-3 text-sm text-blue-600 hover:underline">
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
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

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
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
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  {statusFilter === 'submitted' ? '대기 중인 신청이 없습니다.' : '신청 내역이 없습니다.'}
                </td>
              </tr>
            ) : (
              apps.map(app => {
                const sc = appStatusConfig[app.status];
                return (
                  <tr key={app.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {app.user?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {app.user?.email || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {app.type === 'membership' ? '회원가입' : app.type === 'service' ? '서비스' : app.type}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(app.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sc.color} ${sc.bg}`}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate" title={app.note || ''}>
                      {app.note || '-'}
                    </td>
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
                              <button
                                onClick={() => handleReview(app.id, 'approved')}
                                className="px-2 py-0.5 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                승인
                              </button>
                              <button
                                onClick={() => handleReview(app.id, 'rejected')}
                                className="px-2 py-0.5 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                              >
                                반려
                              </button>
                              <button
                                onClick={() => { setReviewTarget(null); setReviewComment(''); }}
                                className="px-2 py-0.5 text-xs text-slate-500 hover:underline"
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleReview(app.id, 'approved')}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="승인"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setReviewTarget(app.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                              title="반려 (코멘트 입력)"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      ) : (
                        <span className="text-xs text-slate-400">
                          {app.review_comment ? `"${app.review_comment}"` : '-'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 text-sm border border-slate-300 rounded-md disabled:opacity-40"
          >
            이전
          </button>
          <span className="text-sm text-slate-600">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 text-sm border border-slate-300 rounded-md disabled:opacity-40"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
