/**
 * Operator Users Page — 회원 관리
 * WO-O4O-MEMBERSHIP-CONSOLE-V1
 * WO-O4O-MEMBER-LIST-STANDARDIZATION-V1
 *
 * MemberListLayout + @o4o/ui DataTable 기반 표준 회원 리스트.
 * 탭: 전체 | 약국 | 당뇨인 | 가입 신청
 * 기능: 검색, 정렬, 승인/거부, 비밀번호 변경, 편집, 삭제
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  UserCheck,
  UserX,
  KeyRound,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { DataTable } from '@o4o/ui';
import type { Column } from '@o4o/ui';
import { MemberListLayout, StatusBadge, RoleBadge, ServiceBadge } from '@o4o/operator-ux-core';
import type { MemberTab } from '@o4o/operator-ux-core';
import { api } from '../../lib/apiClient';
import { toast } from '@o4o/error-handling';
import EditUserModal from './EditUserModal';

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
  nickname?: string;
  phone?: string;
  company?: string;
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

// ─── API Helper ──────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = path.replace(/^\/api\/v1/, '') || '/';
  const method = (options?.method || 'GET').toUpperCase();
  let body: any;
  if (options?.body && typeof options.body === 'string') {
    try { body = JSON.parse(options.body); } catch { body = options.body; }
  }
  const response = await api.request({ method, url, data: body });
  return response.data;
}

// ─── Helpers ──────────────────────────────────────────────

function getUserName(u: UserData): string {
  if (u.lastName || u.firstName) {
    const full = `${u.lastName || ''}${u.firstName || ''}`.trim();
    if (full) return full;
  }
  if (u.name && u.name !== u.email) return u.name;
  return u.email?.split('@')[0] || '사용자';
}

function getPrimaryRole(u: UserData): string {
  // service_memberships.role 우선 (SSOT)
  const membership = u.memberships?.find(m => m.serviceKey === 'glycopharm');
  if (membership?.role) return membership.role;
  const roles = u.roles || (u.role ? [u.role] : []);
  return roles[0] || 'user';
}

// Role tab filtering
const ROLE_TAB_FILTER: Record<string, string[]> = {
  all: [],
  pharmacy: ['pharmacy'],
  customer: ['customer'],
  pending: [],
};

// ─── Password Modal ──────────────────────────────────────────

function PasswordModal({ user, onClose, onSuccess }: { user: UserData; onClose: () => void; onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('비밀번호는 최소 8자 이상이어야 합니다.'); return; }
    setLoading(true);
    setError('');
    try {
      await apiFetch(`/api/v1/operator/members/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ password }),
      });
      toast.success('비밀번호가 변경되었습니다.');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || '비밀번호 변경에 실패했습니다.');
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
          <div className="relative mb-4">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="새 비밀번호 (8자 이상)"
              className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">취소</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {loading ? '처리 중...' : '변경'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Risk Modal — WO-O4O-OPERATOR-MEMBER-DELETE-RISK-AND-SAFE-DELETE-V1 ──

interface DeleteRiskData {
  user: { id: string; email: string; name: string; status: string };
  risks: { serviceMemberships: number; forumPosts: number; forumComments: number; auditLogs: number };
  totalImpact: number;
  canHardDelete: boolean;
}

function DeleteRiskModal({ userId, userName, userEmail, onClose, onDeleted }: {
  userId: string; userName: string; userEmail: string; onClose: () => void; onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DeleteRiskData | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    apiFetch<{ data: DeleteRiskData }>(`/api/v1/operator/members/${userId}/delete-risk`)
      .then((r) => setData(r.data))
      .catch((e) => toast.error(e.message || '리스크 조회 실패'))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleSoftDelete = async () => {
    if (!confirm('이 회원을 탈퇴(비활성) 처리하시겠습니까?')) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/v1/operator/members/${userId}?mode=soft`, { method: 'DELETE' });
      toast.success('탈퇴 처리 완료');
      onDeleted();
    } catch (e: any) {
      toast.error(e.message || '처리 실패');
    } finally {
      setDeleting(false);
    }
  };

  const handleHardDelete = async () => {
    if (!confirm('⚠️ 이 회원 데이터를 완전히 삭제합니다. 되돌릴 수 없습니다.\n정말 삭제하시겠습니까?')) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/v1/operator/members/${userId}?mode=hard`, { method: 'DELETE' });
      toast.success('완전 삭제 완료');
      onDeleted();
    } catch (e: any) {
      toast.error(e.message || '삭제 실패');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-bold text-slate-900">회원 삭제 확인</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : data ? (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 space-y-1">
              <p className="text-sm font-medium text-slate-800">{userName}</p>
              <p className="text-xs text-slate-500">{userEmail}</p>
              <span className="inline-block text-xs px-2 py-0.5 bg-slate-200 rounded mt-1">{data.user.status}</span>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">삭제 시 영향받는 데이터</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '서비스 연결', value: data.risks.serviceMemberships },
                  { label: '포럼 게시글', value: data.risks.forumPosts },
                  { label: '포럼 댓글', value: data.risks.forumComments },
                  { label: '감사 로그', value: data.risks.auditLogs },
                ].map((item) => (
                  <div key={item.label} className={`flex justify-between px-3 py-2 rounded text-sm ${item.value > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500'}`}>
                    <span>{item.label}</span>
                    <span className="font-medium">{item.value}건</span>
                  </div>
                ))}
              </div>
            </div>

            {!data.canHardDelete && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700">포럼 게시글/댓글 또는 감사 로그가 있어 완전삭제가 제한됩니다. 탈퇴(비활성) 처리를 권장합니다.</p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button onClick={handleSoftDelete} disabled={deleting}
                className="w-full px-4 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg disabled:opacity-50">
                {deleting ? '처리 중...' : '탈퇴 처리 (비활성화)'}
              </button>
              <button onClick={handleHardDelete} disabled={deleting || !data.canHardDelete}
                className="w-full px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">
                {!data.canHardDelete ? '완전삭제 불가 (연결 데이터 존재)' : deleting ? '삭제 중...' : '완전삭제 (되돌릴 수 없음)'}
              </button>
              <button onClick={onClose} className="w-full px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 rounded-lg">취소</button>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-red-500 py-4">리스크 정보를 불러오지 못했습니다.</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export default function UsersPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [users, setUsers] = useState<UserData[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [passwordUser, setPasswordUser] = useState<UserData | null>(null);
  const [editUser, setEditUser] = useState<UserData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserData | null>(null);

  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, rejected: 0, pharmacyCount: 0, customerCount: 0 });

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (activeTab === 'pending') {
        params.set('status', 'pending');
      }
      if (searchQuery) params.set('search', searchQuery);

      const data = await apiFetch<any>(`/api/v1/operator/members?${params}`);
      setUsers(data.users || []);
      setPagination(data.pagination || { page, limit: 20, total: 0, totalPages: 0 });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiFetch<any>('/api/v1/operator/members/stats');
      const byStatus = data.statistics?.byStatus || [];
      const getCount = (s: string) => byStatus.find((b: any) => b.status === s)?.count || 0;

      // Role counts from users (client-side for now)
      const allData = await apiFetch<any>('/api/v1/operator/members?limit=1000');
      const allUsers: UserData[] = allData.users || [];
      const pharmacyRoles = ROLE_TAB_FILTER.pharmacy;
      const customerRoles = ROLE_TAB_FILTER.customer;

      setStats({
        total: data.statistics?.total || 0,
        active: getCount('active') + getCount('approved'),
        pending: getCount('pending'),
        rejected: getCount('rejected'),
        pharmacyCount: allUsers.filter(u => {
          const role = getPrimaryRole(u);
          return pharmacyRoles.includes(role);
        }).length,
        customerCount: allUsers.filter(u => {
          const role = getPrimaryRole(u);
          return customerRoles.includes(role);
        }).length,
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
      toast.error(err.message || '오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = (user: UserData) => {
    setDeleteTarget(user);
  };

  // ─── Role tab filtering (client-side) ──────────────

  const filteredUsers = useMemo(() => {
    if (activeTab === 'all' || activeTab === 'pending') return users;
    const allowedRoles = ROLE_TAB_FILTER[activeTab];
    if (!allowedRoles || allowedRoles.length === 0) return users;
    return users.filter(u => {
      const role = getPrimaryRole(u);
      return allowedRoles.includes(role);
    });
  }, [users, activeTab]);

  // ─── Tabs ──────────────────────────────────────────

  const tabs: MemberTab[] = [
    { key: 'all', label: '전체', count: stats.total },
    { key: 'pharmacy', label: '약국', count: stats.pharmacyCount },
    { key: 'customer', label: '당뇨인', count: stats.customerCount },
    { key: 'pending', label: '가입 신청', count: stats.pending },
  ];

  // ─── DataTable Columns ────────────────────────────

  const columns: Column<UserData>[] = [
    {
      key: 'name',
      title: '이름',
      sortable: true,
      width: '180px',
      render: (_v, user) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-sm font-medium text-slate-600 shrink-0">
            {getUserName(user).charAt(0)}
          </div>
          <span className="font-medium text-slate-800 text-sm truncate">{getUserName(user)}</span>
        </div>
      ),
      sorter: (a, b) => getUserName(a).localeCompare(getUserName(b)),
    },
    {
      key: 'email',
      title: '이메일',
      dataIndex: 'email',
      sortable: true,
      width: '220px',
    },
    {
      key: 'role',
      title: '역할',
      width: '120px',
      render: (_v, user) => <RoleBadge role={getPrimaryRole(user)} />,
    },
    {
      key: 'services',
      title: '서비스',
      width: '150px',
      render: (_v, user) => (
        <div className="flex flex-wrap gap-1">
          {user.memberships && user.memberships.length > 0 ? (
            user.memberships.map((m) => <ServiceBadge key={m.id} serviceKey={m.serviceKey} />)
          ) : (
            <span className="text-xs text-slate-400">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      title: '가입일',
      dataIndex: 'createdAt',
      sortable: true,
      width: '100px',
      render: (v) => <span className="text-sm text-slate-600">{new Date(v).toLocaleDateString('ko-KR')}</span>,
    },
    {
      key: 'status',
      title: '상태',
      dataIndex: 'status',
      width: '80px',
      render: (v) => <StatusBadge status={v} />,
    },
    {
      key: 'actions',
      title: '관리',
      width: '180px',
      align: 'right',
      render: (_v, user) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {actionLoading === user.id ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          ) : (
            <>
              {user.status === 'pending' && (
                <>
                  <button onClick={() => handleStatusChange(user.id, 'approved')} title="승인" className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><UserCheck className="w-4 h-4" /></button>
                  <button onClick={() => handleStatusChange(user.id, 'rejected')} title="거부" className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><UserX className="w-4 h-4" /></button>
                </>
              )}
              {user.status === 'rejected' && (
                <button onClick={() => handleStatusChange(user.id, 'approved')} title="승인" className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><UserCheck className="w-4 h-4" /></button>
              )}
              {(user.status === 'active' || user.status === 'approved') && (
                <button onClick={() => handleStatusChange(user.id, 'suspended')} title="정지" className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"><XCircle className="w-4 h-4" /></button>
              )}
              {user.status === 'suspended' && (
                <button onClick={() => handleStatusChange(user.id, 'approved')} title="활성화" className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><CheckCircle className="w-4 h-4" /></button>
              )}
              <button onClick={() => setEditUser(user)} title="정보 수정" className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => setPasswordUser(user)} title="비밀번호 변경" className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"><KeyRound className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(user)} title="삭제" className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
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

      {/* Member List Layout: Search + Tabs + Table */}
      <MemberListLayout
        title="회원 관리"
        description="회원 승인, 상태 변경, 서비스 멤버십 관리"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(key) => { setActiveTab(key); }}
        search={search}
        onSearchChange={setSearch}
        onSearch={(q) => { setSearchQuery(q); }}
        headerActions={
          <button
            onClick={() => { fetchUsers(pagination.page); fetchStats(); }}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />새로고침
          </button>
        }
      >
        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {/* DataTable */}
        <DataTable<UserData>
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          emptyText={activeTab === 'pending' ? '가입 신청이 없습니다.' : '등록된 사용자가 없습니다.'}
          onRowClick={(user) => navigate(`/operator/users/${user.id}`)}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: activeTab === 'all' || activeTab === 'pending' ? pagination.total : filteredUsers.length,
            onChange: (page) => fetchUsers(page),
          }}
        />
      </MemberListLayout>

      {/* Password Modal */}
      {passwordUser && (
        <PasswordModal
          user={passwordUser}
          onClose={() => setPasswordUser(null)}
          onSuccess={() => { fetchUsers(pagination.page); }}
        />
      )}

      {/* Edit User Modal */}
      {editUser && (
        <EditUserModal
          userId={editUser.id}
          onClose={() => setEditUser(null)}
          onSuccess={() => { fetchUsers(pagination.page); }}
        />
      )}

      {/* Delete Risk Modal — WO-O4O-OPERATOR-MEMBER-DELETE-RISK-AND-SAFE-DELETE-V1 */}
      {deleteTarget && (
        <DeleteRiskModal
          userId={deleteTarget.id}
          userName={getUserName(deleteTarget)}
          userEmail={deleteTarget.email}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => { fetchUsers(pagination.page); fetchStats(); setDeleteTarget(null); }}
        />
      )}
    </div>
  );
}
