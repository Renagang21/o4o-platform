/**
 * Operator Users Page — 회원 관리
 * WO-O4O-MEMBERSHIP-CONSOLE-V1
 * WO-O4O-MEMBER-LIST-STANDARDIZATION-V1
 *
 * MemberListLayout + @o4o/ui DataTable 기반 표준 회원 리스트.
 * 탭: 전체 | 판매자 | 소비자 | 가입 신청
 * 기능: 검색, 정렬, 승인/거부, 비밀번호 변경, 편집, 삭제
 */

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
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
  AlertCircle,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { DataTable, RowActionMenu } from '@o4o/ui';
import type { Column } from '@o4o/ui';
import { MemberListLayout, StatusBadge, RoleBadge, ServiceBadge, defineActionPolicy, buildRowActions } from '@o4o/operator-ux-core';
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
  const membership = u.memberships?.find(m => m.serviceKey === 'k-cosmetics');
  if (membership?.role) return membership.role;
  const roles = u.roles || (u.role ? [u.role] : []);
  return roles[0] || 'user';
}

// Role tab filtering
const ROLE_TAB_FILTER: Record<string, string[]> = {
  all: [],
  seller: ['seller', 'k-cosmetics:seller'],
  consumer: ['consumer', 'customer', 'k-cosmetics:consumer'],
  pending: [],
};

// ─── Action Policy (V4-EXPANSION) ────────────────────────────

const userActionPolicy = defineActionPolicy<UserData>('k-cosmetics:users', {
  inlineMax: 2,
  rules: [
    {
      key: 'approve',
      label: '승인',
      variant: 'primary',
      visible: (u) => u.status === 'pending' || u.status === 'rejected',
    },
    {
      key: 'reject',
      label: '거부',
      variant: 'danger',
      visible: (u) => u.status === 'pending',
      confirm: {
        title: '회원 거부',
        message: '이 사용자를 거부 처리하시겠습니까?',
        variant: 'danger',
        confirmText: '거부',
      },
    },
    {
      key: 'suspend',
      label: '정지',
      variant: 'warning',
      visible: (u) => u.status === 'active' || u.status === 'approved',
      confirm: {
        title: '회원 정지',
        message: '이 사용자를 정지 처리하시겠습니까?',
        variant: 'warning',
        confirmText: '정지',
      },
    },
    {
      key: 'activate',
      label: '활성화',
      variant: 'primary',
      visible: (u) => u.status === 'suspended',
    },
    {
      key: 'edit',
      label: '정보 수정',
    },
    {
      key: 'password',
      label: '비밀번호 변경',
    },
    {
      key: 'delete',
      label: '삭제',
      variant: 'danger',
      divider: true,
      confirm: {
        title: '회원 삭제 확인',
        message: '이 사용자를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.',
        variant: 'danger',
        confirmText: '삭제',
      },
    },
  ],
});

const USER_ACTION_ICONS: Record<string, ReactNode> = {
  approve: <UserCheck className="w-4 h-4" />,
  reject: <UserX className="w-4 h-4" />,
  suspend: <XCircle className="w-4 h-4" />,
  activate: <CheckCircle className="w-4 h-4" />,
  edit: <Pencil className="w-4 h-4" />,
  password: <KeyRound className="w-4 h-4" />,
  delete: <Trash2 className="w-4 h-4" />,
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

  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, rejected: 0, sellerCount: 0, consumerCount: 0 });

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
      const sellerRoles = ROLE_TAB_FILTER.seller;
      const consumerRoles = ROLE_TAB_FILTER.consumer;

      setStats({
        total: data.statistics?.total || 0,
        active: getCount('active') + getCount('approved'),
        pending: getCount('pending'),
        rejected: getCount('rejected'),
        sellerCount: allUsers.filter(u => {
          const role = getPrimaryRole(u);
          return sellerRoles.includes(role);
        }).length,
        consumerCount: allUsers.filter(u => {
          const role = getPrimaryRole(u);
          return consumerRoles.includes(role);
        }).length,
      });
    } catch {
      // stats failure is non-critical
    }
  }, []);

  useEffect(() => { fetchUsers(1); }, [fetchUsers]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleStatusChange = async (userId: string, status: string) => {
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

  const handleDelete = async (user: UserData) => {
    setActionLoading(user.id);
    try {
      await apiFetch(`/api/v1/operator/members/${user.id}`, { method: 'DELETE' });
      fetchUsers(pagination.page);
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || '오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
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
    { key: 'seller', label: '판매자', count: stats.sellerCount },
    { key: 'consumer', label: '소비자', count: stats.consumerCount },
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
      key: '_actions',
      title: '액션',
      width: '60px',
      align: 'center',
      render: (_v, user) => (
        <RowActionMenu
          actions={buildRowActions(userActionPolicy, user, {
            approve: () => handleStatusChange(user.id, 'approved'),
            reject: () => handleStatusChange(user.id, 'rejected'),
            suspend: () => handleStatusChange(user.id, 'suspended'),
            activate: () => handleStatusChange(user.id, 'approved'),
            edit: () => setEditUser(user),
            password: () => setPasswordUser(user),
            delete: () => handleDelete(user),
          }, {
            icons: USER_ACTION_ICONS,
            loading: actionLoading === user.id
              ? { approve: true, reject: true, suspend: true, activate: true }
              : undefined,
          })}
          inlineMax={userActionPolicy.inlineMax}
        />
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
    </div>
  );
}
