/**
 * UsersManagementPage — Neture 회원 관리
 * WO-NETURE-OPERATOR-DASHBOARD-IMPLEMENTATION-V1
 * WO-O4O-MEMBER-LIST-STANDARDIZATION-V1
 *
 * MemberListLayout + @o4o/ui DataTable 기반 표준 회원 리스트.
 * 탭: 전체 | 공급자 | 파트너 | 셀러 | 가입 신청
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
  Loader2,
  AlertCircle,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { DataTable, RowActionMenu } from '@o4o/ui';
import type { Column } from '@o4o/ui';
import { MemberListLayout, StatusBadge, RoleBadge, ServiceBadge, defineActionPolicy, buildRowActions } from '@o4o/operator-ux-core';
import type { MemberTab } from '@o4o/operator-ux-core';
import { api } from '@/lib/apiClient';
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

// ─── Helpers ──────────────────────────────────────────────

function getUserName(u: UserData): string {
  if (u.lastName || u.firstName) {
    const full = `${u.lastName || ''}${u.firstName || ''}`.trim();
    if (full) return full;
  }
  if (u.name && u.name !== u.email) return u.name;
  return u.email?.split('@')[0] || '사용자';
}

// Neture 컨텍스트 역할 표시 매핑 (RoleBadge용)
// customer → consumer: RoleBadge의 customer="당뇨인"(GlycoPharm) 대신 consumer="소비자" 사용
const NETURE_ROLE_DISPLAY: Record<string, string> = {
  customer: 'consumer',
};

function getPrimaryRole(u: UserData): string {
  // WO-NETURE-ROLE-NORMALIZATION-V1: service membership role 우선 (service-scoped SSOT)
  const netureMembership = u.memberships?.find(m => m.serviceKey === 'neture');
  if (netureMembership?.role) return NETURE_ROLE_DISPLAY[netureMembership.role] || netureMembership.role;
  // Fallback: role_assignments
  const roles = u.roles || (u.role ? [u.role] : []);
  return roles[0] || 'user';
}

// Role tab filtering
const ROLE_TAB_FILTER: Record<string, string[]> = {
  all: [],
  supplier: ['supplier', 'neture:supplier'],
  partner: ['partner', 'neture:partner'],
  seller: ['seller', 'neture:seller'],
  pending: [],
};

// ─── V4: Action Policy ────────────────────────────────────────

const userActionPolicy = defineActionPolicy<UserData>('neture:users', {
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
      key: 'soft-delete',
      label: '비활성화',
      variant: 'warning',
      divider: true,
      confirm: (u) => ({
        title: '사용자 비활성화',
        message: `${getUserName(u)} (${u.email})\n\n비활성화하시겠습니까?\n로그인이 차단되고 목록에서 제외됩니다.`,
        variant: 'warning',
        confirmText: '비활성화',
      }),
    },
    {
      key: 'hard-delete',
      label: '완전삭제',
      variant: 'danger',
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
  'soft-delete': <XCircle className="w-4 h-4" />,
  'hard-delete': <Trash2 className="w-4 h-4" />,
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
      await api.put(`/operator/members/${user.id}`, { password });
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

export default function UsersManagementPage() {
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
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, rejected: 0, supplierCount: 0, partnerCount: 0, sellerCount: 0 });

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

      const { data } = await api.get(`/operator/members?${params}`);
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
      const { data } = await api.get('/operator/members/stats');
      const byStatus = data.statistics?.byStatus || [];
      const getCount = (s: string) => byStatus.find((b: any) => b.status === s)?.count || 0;

      // Role counts from users (client-side for now)
      const allData = (await api.get('/operator/members?limit=1000')).data;
      const allUsers: UserData[] = allData.users || [];
      const supplierRoles = ROLE_TAB_FILTER.supplier;
      const partnerRoles = ROLE_TAB_FILTER.partner;
      const sellerRoles = ROLE_TAB_FILTER.seller;

      setStats({
        total: data.statistics?.total || 0,
        active: getCount('active') + getCount('approved'),
        pending: getCount('pending'),
        rejected: getCount('rejected'),
        supplierCount: allUsers.filter(u => {
          const role = getPrimaryRole(u);
          return supplierRoles.includes(role);
        }).length,
        partnerCount: allUsers.filter(u => {
          const role = getPrimaryRole(u);
          return partnerRoles.includes(role);
        }).length,
        sellerCount: allUsers.filter(u => {
          const role = getPrimaryRole(u);
          return sellerRoles.includes(role);
        }).length,
      });
    } catch {
      // stats failure is non-critical
    }
  }, []);

  useEffect(() => { fetchUsers(1); }, [fetchUsers]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  /**
   * WO-NETURE-MEMBERSHIP-APPROVAL-FLOW-STABILIZATION-V1:
   * 승인/거부 → Neture 등록 API (operator 접근 가능)
   * 정지/활성화 → Membership Console API
   */
  const handleStatusChange = async (userId: string, status: string, currentStatus?: string) => {
    setActionLoading(userId);
    try {
      if (status === 'approved' && (currentStatus === 'pending' || currentStatus === 'rejected')) {
        // 승인: Neture registration endpoint (service_membership + user + role_assignment 동시 처리)
        await api.post(`/neture/operator/registrations/${userId}/approve`);
      } else if (status === 'rejected') {
        // 거부: Neture registration endpoint
        await api.post(`/neture/operator/registrations/${userId}/reject`, { reason: '운영자 거부' });
      } else {
        // 정지/활성화: Membership Console
        const user = users.find((u) => u.id === userId);
        const netureMembership = user?.memberships?.find((m) => m.serviceKey === 'neture');
        if (netureMembership) {
          const endpoint = status === 'suspended'
            ? `/operator/members/${netureMembership.id}/reject`
            : `/operator/members/${netureMembership.id}/approve`;
          await api.patch(endpoint);
        }
      }
      fetchUsers(pagination.page);
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || '오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  // WO-NETURE-MEMBER-DELETE-SAFE-FLOW-V1: soft/hard 2단계 분리
  const handleSoftDelete = async (user: UserData) => {
    setActionLoading(user.id);
    try {
      await api.delete(`/operator/members/${user.id}?mode=soft`);
      toast.success('사용자가 비활성화되었습니다.');
      fetchUsers(pagination.page);
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || '비활성화에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const [hardDeleteTarget, setHardDeleteTarget] = useState<UserData | null>(null);

  const handleHardDelete = async () => {
    if (!hardDeleteTarget) return;
    setActionLoading(hardDeleteTarget.id);
    try {
      await api.delete(`/operator/members/${hardDeleteTarget.id}?mode=hard`);
      toast.success('사용자가 완전히 삭제되었습니다.');
      setHardDeleteTarget(null);
      fetchUsers(pagination.page);
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || '완전삭제에 실패했습니다. 연관 데이터가 남아 있을 수 있습니다.');
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
    { key: 'supplier', label: '공급자', count: stats.supplierCount },
    { key: 'partner', label: '파트너', count: stats.partnerCount },
    { key: 'seller', label: '셀러', count: stats.sellerCount },
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
        actionLoading === user.id ? (
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        ) : (
          <RowActionMenu
            actions={buildRowActions(userActionPolicy, user, {
              approve: () => handleStatusChange(user.id, 'approved', user.status),
              reject: () => handleStatusChange(user.id, 'rejected', user.status),
              suspend: () => handleStatusChange(user.id, 'suspended', user.status),
              activate: () => handleStatusChange(user.id, 'approved', user.status),
              edit: () => setEditUser(user),
              password: () => setPasswordUser(user),
              'soft-delete': () => handleSoftDelete(user),
              'hard-delete': () => setHardDeleteTarget(user),
            }, {
              icons: USER_ACTION_ICONS,
              loading: actionLoading === user.id
                ? { approve: true, reject: true, suspend: true, activate: true }
                : undefined,
            })}
            inlineMax={userActionPolicy.inlineMax}
          />
        )
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

      {/* Hard Delete Risk Modal */}
      {hardDeleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-red-600 mb-2">완전삭제 확인</h3>
            <div className="space-y-3 mb-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm text-slate-500">대상 사용자</p>
                <p className="font-medium text-slate-900">{getUserName(hardDeleteTarget)} ({hardDeleteTarget.email})</p>
                <p className="text-xs text-slate-400 mt-0.5">상태: {hardDeleteTarget.status}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-medium text-red-800 mb-1">경고: 이 작업은 되돌릴 수 없습니다</p>
                <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                  <li>사용자 계정이 영구 삭제됩니다</li>
                  <li>서비스 멤버십 / 역할 배정이 삭제됩니다</li>
                  <li>연관 데이터(게시글, 승인 이력 등)는 orphan 될 수 있습니다</li>
                  <li>연관 데이터가 많으면 삭제가 실패할 수 있습니다</li>
                </ul>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  비활성화(soft delete)를 먼저 권장합니다.
                  비활성화는 안전하게 로그인 차단 + 목록 제외 처리됩니다.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setHardDeleteTarget(null)}
                className="flex-1 px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={() => { setHardDeleteTarget(null); handleSoftDelete(hardDeleteTarget); }}
                className="flex-1 px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                비활성화
              </button>
              <button
                onClick={handleHardDelete}
                disabled={actionLoading === hardDeleteTarget.id}
                className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === hardDeleteTarget.id ? '삭제 중...' : '완전삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
