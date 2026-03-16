/**
 * Operator Users Page — 회원 관리
 * WO-O4O-MEMBERSHIP-CONSOLE-V1
 *
 * /api/v1/operator/members API (Extension Layer)
 * 탭: 회원 목록 | 가입 신청
 * 기능: 승인, 거부, 비밀번호 변경, 삭제, 멤버십 표시, 상세 페이지 이동
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  UserCheck,
  UserX,
  KeyRound,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  ChevronRight,
} from 'lucide-react';
import { getAccessToken } from '../../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

// ─── Types ───────────────────────────────────────────────────

interface MembershipData {
  id: string;
  serviceKey: string;
  status: string;
  role: string;
  createdAt: string;
}

interface UserData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  status: string;
  roles?: string[];
  role?: string;
  memberships?: MembershipData[];
  createdAt: string;
  updatedAt?: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type Tab = 'all' | 'pending';

// ─── API Helper ──────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  // WO-O4O-DASHBOARD-AUTH-API-NORMALIZE-V1: Bearer token for cross-domain
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || body?.message || `API error ${res.status}`);
  }
  return res.json();
}

// ─── Status Config ───────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: '활성', color: 'text-green-700', bg: 'bg-green-50' },
  approved: { label: '승인', color: 'text-green-700', bg: 'bg-green-50' },
  pending: { label: '대기', color: 'text-amber-700', bg: 'bg-amber-50' },
  rejected: { label: '거부', color: 'text-red-700', bg: 'bg-red-50' },
  suspended: { label: '정지', color: 'text-red-700', bg: 'bg-red-50' },
  inactive: { label: '비활성', color: 'text-slate-500', bg: 'bg-slate-100' },
};

const SERVICE_LABELS: Record<string, string> = {
  glycopharm: 'GlycoPharm',
  glucoseview: 'GlucoseView',
  'k-cosmetics': 'K-Cosmetics',
  neture: 'Neture',
  'kpa-society': 'KPA',
  platform: 'Platform',
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] || { label: status, color: 'text-slate-500', bg: 'bg-slate-100' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function getUserName(u: UserData): string {
  if (u.name) return u.name;
  if (u.firstName || u.lastName) return `${u.lastName || ''} ${u.firstName || ''}`.trim();
  return u.email.split('@')[0];
}

function getRoleLabel(u: UserData): string {
  const roles = u.roles || (u.role ? [u.role] : []);
  if (roles.length === 0) return 'user';
  return roles.join(', ');
}

// ─── Password Modal ──────────────────────────────────────────

function PasswordModal({ user, onClose, onSuccess }: { user: UserData; onClose: () => void; onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('비밀번호는 최소 6자 이상이어야 합니다.'); return; }
    setLoading(true);
    setError('');
    try {
      await apiFetch(`/api/v1/operator/members/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ password }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">비밀번호 변경</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-slate-500 mb-4">{getUserName(user)} ({user.email})</p>
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 mb-3">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="새 비밀번호 (6자 이상)"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            minLength={6}
          />
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">취소</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? '처리 중...' : '변경'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export default function UsersPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('all');
  const [users, setUsers] = useState<UserData[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [passwordUser, setPasswordUser] = useState<UserData | null>(null);

  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, rejected: 0 });

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (tab === 'pending') {
        params.set('status', 'pending');
      } else if (statusFilter) {
        params.set('status', statusFilter);
      }
      if (search) params.set('search', search);

      const data = await apiFetch<any>(`/api/v1/operator/members?${params}`);
      setUsers(data.users || []);
      setPagination(data.pagination || { page, limit: 20, total: 0, totalPages: 0 });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tab, statusFilter, search]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiFetch<any>('/api/v1/operator/members/stats');
      const byStatus = data.statistics?.byStatus || [];
      const getCount = (s: string) => byStatus.find((b: any) => b.status === s)?.count || 0;
      setStats({
        total: data.statistics?.total || 0,
        active: getCount('active') + getCount('approved'),
        pending: getCount('pending'),
        rejected: getCount('rejected'),
      });
    } catch {
      // stats failure is non-critical
    }
  }, []);

  useEffect(() => { fetchUsers(1); }, [fetchUsers]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleStatusChange = async (userId: string, status: string) => {
    const label = status === 'approved' ? '승인' : status === 'rejected' ? '거부' : status;
    if (!confirm(`이 사용자를 ${label} 처리하시겠습니까?`)) return;
    setActionLoading(userId);
    try {
      await apiFetch(`/api/v1/operator/members/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      fetchUsers(pagination.page);
      fetchStats();
    } catch (err: any) {
      alert(`오류: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (user: UserData) => {
    if (!confirm(`${getUserName(user)} (${user.email}) 사용자를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    setActionLoading(user.id);
    try {
      await apiFetch(`/api/v1/operator/members/${user.id}`, { method: 'DELETE' });
      fetchUsers(pagination.page);
      fetchStats();
    } catch (err: any) {
      alert(`오류: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">회원 관리</h1>
          <p className="text-sm text-slate-500 mt-1">회원 승인, 상태 변경, 서비스 멤버십 관리</p>
        </div>
        <button onClick={() => { fetchUsers(pagination.page); fetchStats(); }} className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
          <RefreshCw className="w-4 h-4" />새로고침
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: '전체', value: stats.total, icon: Users, color: 'slate' },
          { label: '활성', value: stats.active, icon: CheckCircle, color: 'green' },
          { label: '대기', value: stats.pending, icon: Clock, color: 'amber' },
          { label: '거부', value: stats.rejected, icon: XCircle, color: 'red' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 bg-${s.color}-100 rounded-lg flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 text-${s.color}-600`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-4">
        <button
          onClick={() => { setTab('all'); setStatusFilter(''); }}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'all' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Users className="inline w-4 h-4 mr-1" />회원 목록
        </button>
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'pending' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Clock className="inline w-4 h-4 mr-1" />가입 신청
          {stats.pending > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">{stats.pending}</span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchUsers(1)}
            placeholder="이름, 이메일로 검색 (Enter)"
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {tab === 'all' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체 상태</option>
            <option value="active">활성</option>
            <option value="pending">대기</option>
            <option value="rejected">거부</option>
            <option value="suspended">정지</option>
          </select>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">불러오는 중...</p>
        </div>
      )}

      {/* Table */}
      {!loading && users.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">이름</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">이메일</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">역할</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">서비스</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">가입일</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">상태</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => navigate(`/operator/users/${user.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-sm font-medium text-slate-600">
                        {getUserName(user).charAt(0)}
                      </div>
                      <span className="font-medium text-slate-800 text-sm">{getUserName(user)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{user.email}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{getRoleLabel(user)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(user.memberships && user.memberships.length > 0) ? (
                        user.memberships.map((m) => (
                          <span
                            key={m.id}
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                              m.status === 'active' ? 'bg-blue-50 text-blue-700' :
                              m.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                              'bg-slate-100 text-slate-500'
                            }`}
                            title={`${SERVICE_LABELS[m.serviceKey] || m.serviceKey}: ${m.status}`}
                          >
                            {SERVICE_LABELS[m.serviceKey] || m.serviceKey}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{new Date(user.createdAt).toLocaleDateString('ko-KR')}</td>
                  <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {actionLoading === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      ) : (
                        <>
                          {(user.status === 'pending') && (
                            <>
                              <button
                                onClick={() => handleStatusChange(user.id, 'approved')}
                                title="승인"
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleStatusChange(user.id, 'rejected')}
                                title="거부"
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <UserX className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {user.status === 'rejected' && (
                            <button
                              onClick={() => handleStatusChange(user.id, 'approved')}
                              title="승인"
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                          {(user.status === 'active' || user.status === 'approved') && (
                            <button
                              onClick={() => handleStatusChange(user.id, 'suspended')}
                              title="정지"
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          {user.status === 'suspended' && (
                            <button
                              onClick={() => handleStatusChange(user.id, 'approved')}
                              title="활성화"
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setPasswordUser(user)}
                            title="비밀번호 변경"
                            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            title="삭제"
                            className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-slate-300 ml-1" />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4 border-t border-slate-100">
              <button
                onClick={() => fetchUsers(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              <span className="text-sm text-slate-600">{pagination.page} / {pagination.totalPages}</span>
              <button
                onClick={() => fetchUsers(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty */}
      {!loading && users.length === 0 && !error && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">{tab === 'pending' ? '가입 신청이 없습니다.' : '등록된 사용자가 없습니다.'}</p>
        </div>
      )}

      {/* Password Modal */}
      {passwordUser && (
        <PasswordModal
          user={passwordUser}
          onClose={() => setPasswordUser(null)}
          onSuccess={() => { fetchUsers(pagination.page); }}
        />
      )}
    </div>
  );
}
