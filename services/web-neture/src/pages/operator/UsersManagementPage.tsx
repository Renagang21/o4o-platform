/**
 * UsersManagementPage — Neture 회원 관리
 * WO-NETURE-OPERATOR-DASHBOARD-IMPLEMENTATION-V1
 * WO-O4O-MEMBER-LIST-STANDARDIZATION-V1
 * WO-O4O-OPERATOR-DATATABLE-SOURCE-ALIGN-V1: DataTable @o4o/ui → @o4o/operator-ux-core
 * WO-O4O-NETURE-USERS-CANONICAL-APPLY-V1: canonical workflow 정렬
 *   - selectable DataTable + ActionBar + BaseDetailDrawer
 *   - row click → drawer (status-aware footer)
 *   - bulk approve/reject (pending only)
 *   - utility RowActionMenu 유지 (비밀번호 변경, 수정, 삭제)
 *
 * MemberListLayout + @o4o/operator-ux-core DataTable 기반 표준 회원 리스트.
 * 탭: 전체 | 공급자 | 파트너 | 셀러 | 가입 신청
 */

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ActionBar, BulkResultModal, RowActionMenu, BaseDetailDrawer } from '@o4o/ui';
import {
  DataTable,
  MemberListLayout,
  StatusBadge,
  RoleBadge,
  defineActionPolicy,
  buildRowActions,
  useBatchAction,
} from '@o4o/operator-ux-core';
import type { ListColumnDef, MemberTab } from '@o4o/operator-ux-core';
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
const NETURE_ROLE_DISPLAY: Record<string, string> = {
  customer: 'consumer',
};

// WO-O4O-NETURE-ADMIN-USERS-SCOPE-FIX-V1:
// Neture 회원 관리 화면이므로 Neture membership role 만 사용한다.
// 이전 fallback (`u.roles[0]`) 은 cross-service role (kpa:*, glycopharm:*) 을
// primary role 로 노출할 수 있어 제거 — 목록 조회를 Neture-scoped 로 강제하므로
// 모든 사용자는 Neture membership 을 보유한다.
function getPrimaryRole(u: UserData): string {
  const netureMembership = u.memberships?.find(m => m.serviceKey === 'neture');
  if (netureMembership?.role) return NETURE_ROLE_DISPLAY[netureMembership.role] || netureMembership.role;
  return 'user';
}

// WO-O4O-NETURE-SUPPLIER-DASHBOARD-ENTRY-AND-MEMBER-LIST-CLEANUP-V1:
// 회원 리스트에 노출하던 "서비스" 컬럼을 "대시보드 접근" 으로 교체.
// Neture 회원 관리는 Neture-scoped 이므로 다른 서비스의 멤버십을 같이 표시할 이유가 없다.
// 대신 이 사용자가 Neture 안에서 어떤 대시보드에 진입 가능한지를 표시한다.
// 판정 소스: user.roles (platform/neture 역할 배열) + Neture membership.role 결합.
function getDashboardAccessLabels(u: UserData): string[] {
  const tokens = new Set<string>([
    ...(u.roles ?? []),
    ...(u.role ? [u.role] : []),
    ...(u.memberships ?? [])
      .filter(m => m.serviceKey === 'neture')
      .map(m => m.role),
  ]);
  const labels: string[] = [];
  if (tokens.has('platform:super_admin') || tokens.has('neture:admin') || tokens.has('admin')) {
    labels.push('관리자 대시보드');
  }
  if (tokens.has('neture:operator') || tokens.has('operator')) {
    labels.push('운영 대시보드');
  }
  if (tokens.has('neture:supplier') || tokens.has('supplier')) {
    labels.push('공급자 대시보드');
  }
  if (tokens.has('neture:partner') || tokens.has('partner')) {
    labels.push('파트너 대시보드');
  }
  return labels;
}

const ROLE_TAB_FILTER: Record<string, string[]> = {
  all: [],
  supplier: ['supplier', 'neture:supplier'],
  partner: ['partner', 'neture:partner'],
  seller: ['seller', 'neture:seller'],
  pending: [],
};

// ─── V4: Action Policy (utility only — status changes go to drawer) ──

const userActionPolicy = defineActionPolicy<UserData>('neture:users', {
  inlineMax: 0, // 상태 변경은 drawer footer로 통일. utility만 overflow menu
  rules: [
    { key: 'edit', label: '정보 수정' },
    { key: 'password', label: '비밀번호 변경' },
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

  // Canonical: selection + drawer
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const batch = useBatchAction();

  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, rejected: 0, supplierCount: 0, partnerCount: 0, sellerCount: 0 });

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      // WO-O4O-NETURE-ADMIN-USERS-SCOPE-FIX-V1:
      // platform:super_admin 으로 호출 시에도 Neture 회원만 표시하기 위해
      // serviceKey 를 명시적으로 전달한다 (backend platform admin 분기에서
      // serviceKey 가 없으면 cross-service leak 발생).
      params.set('serviceKey', 'neture');
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
      // WO-O4O-NETURE-ADMIN-USERS-SCOPE-FIX-V1: serviceKey=neture 강제 전달
      const { data } = await api.get('/operator/members/stats?serviceKey=neture');
      const byStatus = data.statistics?.byStatus || [];
      const getCount = (s: string) => byStatus.find((b: any) => b.status === s)?.count || 0;

      const allData = (await api.get('/operator/members?limit=1000&serviceKey=neture')).data;
      const allUsers: UserData[] = allData.users || [];
      const supplierRoles = ROLE_TAB_FILTER.supplier;
      const partnerRoles = ROLE_TAB_FILTER.partner;
      const sellerRoles = ROLE_TAB_FILTER.seller;

      setStats({
        total: data.statistics?.total || 0,
        active: getCount('active') + getCount('approved'),
        pending: getCount('pending'),
        rejected: getCount('rejected'),
        supplierCount: allUsers.filter(u => supplierRoles.includes(getPrimaryRole(u))).length,
        partnerCount: allUsers.filter(u => partnerRoles.includes(getPrimaryRole(u))).length,
        sellerCount: allUsers.filter(u => sellerRoles.includes(getPrimaryRole(u))).length,
      });
    } catch {
      // stats failure is non-critical
    }
  }, []);

  useEffect(() => { fetchUsers(1); }, [fetchUsers]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Reset selection on tab/search change
  useEffect(() => {
    setSelectedIds(new Set());
    setSelectedUser(null);
  }, [activeTab, searchQuery]);

  /**
   * WO-NETURE-MEMBERSHIP-APPROVAL-FLOW-STABILIZATION-V1:
   * 승인/거부 → Neture 등록 API (service_memberships + role_assignments + neture_suppliers 동시 처리)
   * 정지/활성화 → Membership Console API
   */
  const handleStatusChange = async (userId: string, status: string, currentStatus?: string) => {
    setActionLoading(userId);
    try {
      if (status === 'approved' && (currentStatus === 'pending' || currentStatus === 'rejected')) {
        await api.post(`/neture/operator/registrations/${userId}/approve`);
      } else if (status === 'rejected') {
        await api.post(`/neture/operator/registrations/${userId}/reject`, { reason: '운영자 거부' });
      } else {
        const user = users.find((u) => u.id === userId);
        const netureMembership = user?.memberships?.find((m) => m.serviceKey === 'neture');
        if (netureMembership) {
          const endpoint = status === 'suspended'
            ? `/operator/members/${netureMembership.id}/reject`
            : `/operator/members/${netureMembership.id}/approve`;
          await api.patch(endpoint);
        }
      }
      // Sync drawer if open
      setSelectedUser(null);
      fetchUsers(pagination.page);
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || '오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

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

  // ─── Batch Actions (pending only) ──────────────────────────

  const selectedPendingIds = useMemo(
    () => [...selectedIds].filter(id => users.find(u => u.id === id)?.status === 'pending'),
    [selectedIds, users],
  );

  const selectedApprovableIds = useMemo(
    () => [...selectedIds].filter(id => {
      const s = users.find(u => u.id === id)?.status;
      return s === 'pending' || s === 'rejected';
    }),
    [selectedIds, users],
  );

  const handleBulkApprove = async () => {
    if (selectedApprovableIds.length === 0) return;
    const result = await batch.executeBatch(
      async (batchIds) => {
        const r = await api.post('/neture/operator/registrations/batch', { ids: batchIds, action: 'approve' });
        return r.data;
      },
      selectedApprovableIds,
    );
    if (result.successCount > 0) {
      setSelectedIds(new Set());
      fetchUsers(pagination.page);
      fetchStats();
    }
  };

  const handleBulkReject = async () => {
    if (selectedPendingIds.length === 0) return;
    const result = await batch.executeBatch(
      async (batchIds) => {
        const r = await api.post('/neture/operator/registrations/batch', {
          ids: batchIds,
          action: 'reject',
          reason: '운영자 일괄 거부',
        });
        return r.data;
      },
      selectedPendingIds,
    );
    if (result.successCount > 0) {
      setSelectedIds(new Set());
      fetchUsers(pagination.page);
      fetchStats();
    }
  };

  // ─── Role tab filtering (client-side) ──────────────────────

  const filteredUsers = useMemo(() => {
    if (activeTab === 'all' || activeTab === 'pending') return users;
    const allowedRoles = ROLE_TAB_FILTER[activeTab];
    if (!allowedRoles || allowedRoles.length === 0) return users;
    return users.filter(u => allowedRoles.includes(getPrimaryRole(u)));
  }, [users, activeTab]);

  // ─── Tabs ──────────────────────────────────────────────────

  const tabs: MemberTab[] = [
    { key: 'all', label: '전체', count: stats.total },
    { key: 'supplier', label: '공급자', count: stats.supplierCount },
    { key: 'partner', label: '파트너', count: stats.partnerCount },
    { key: 'seller', label: '셀러', count: stats.sellerCount },
    { key: 'pending', label: '가입 신청', count: stats.pending },
  ];

  // ─── Bulk action bar (pending tab에서만 승인/거부 표시) ───────

  const bulkActions = [
    {
      key: 'approve',
      label: `승인 (${selectedApprovableIds.length})`,
      onClick: handleBulkApprove,
      variant: 'primary' as const,
      icon: <UserCheck size={14} />,
      loading: batch.loading,
      group: 'actions',
      tooltip: '선택된 신청자를 일괄 승인합니다 (pending/rejected)',
      visible: selectedApprovableIds.length > 0,
    },
    {
      key: 'reject',
      label: `거부 (${selectedPendingIds.length})`,
      onClick: handleBulkReject,
      variant: 'danger' as const,
      icon: <UserX size={14} />,
      loading: batch.loading,
      group: 'actions',
      tooltip: '선택된 대기 신청자를 일괄 거부합니다',
      visible: selectedPendingIds.length > 0,
      confirm: {
        title: '일괄 거부 확인',
        message: `${selectedPendingIds.length}명의 대기 신청자를 일괄 거부합니다.`,
        variant: 'danger' as const,
        confirmText: '거부',
      },
    },
  ];

  // ─── DataTable Columns ──────────────────────────────────────

  const columns: ListColumnDef<UserData>[] = [
    {
      key: 'name',
      header: '이름',
      sortable: true,
      width: '180px',
      sortAccessor: (u) => getUserName(u),
      render: (_v, user) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-sm font-medium text-slate-600 shrink-0">
            {getUserName(user).charAt(0)}
          </div>
          <span className="font-medium text-slate-800 text-sm truncate">{getUserName(user)}</span>
        </div>
      ),
    },
    {
      key: 'email',
      header: '이메일',
      sortable: true,
      width: '220px',
    },
    {
      key: 'role',
      header: '역할',
      width: '120px',
      render: (_v, user) => <RoleBadge role={getPrimaryRole(user)} />,
    },
    {
      key: 'dashboardAccess',
      header: '대시보드 접근',
      width: '200px',
      render: (_v, user) => {
        const labels = getDashboardAccessLabels(user);
        if (labels.length === 0) {
          return <span className="text-xs text-slate-400">접근 불가</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {labels.map((label) => (
              <span
                key={label}
                className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-700"
              >
                {label}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'createdAt',
      header: '가입일',
      sortable: true,
      sortAccessor: (u) => new Date(u.createdAt).getTime(),
      width: '100px',
      render: (v) => <span className="text-sm text-slate-600">{new Date(v).toLocaleDateString('ko-KR')}</span>,
    },
    {
      key: 'status',
      header: '상태',
      width: '80px',
      render: (v) => <StatusBadge status={v} />,
    },
    {
      key: '_actions',
      header: '액션',
      system: true,
      width: '60px',
      align: 'center',
      onCellClick: () => {}, // prevent row click from triggering
      render: (_v, user) => (
        actionLoading === user.id ? (
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        ) : (
          <RowActionMenu
            actions={buildRowActions(userActionPolicy, user, {
              edit: () => setEditUser(user),
              password: () => setPasswordUser(user),
              'soft-delete': () => handleSoftDelete(user),
              'hard-delete': () => setHardDeleteTarget(user),
            }, { icons: USER_ACTION_ICONS })}
            inlineMax={userActionPolicy.inlineMax}
          />
        )
      ),
    },
  ];

  // ─── Drawer: status-aware footer actions ────────────────────

  const drawerActions = useMemo(() => {
    if (!selectedUser) return [];
    const u = selectedUser;
    const isLoading = actionLoading === u.id;
    const actions = [];

    if (u.status === 'pending' || u.status === 'rejected') {
      actions.push({
        label: '승인',
        onClick: () => handleStatusChange(u.id, 'approved', u.status),
        variant: 'primary' as const,
        loading: isLoading,
        disabled: isLoading,
      });
    }
    if (u.status === 'pending') {
      actions.push({
        label: '반려',
        onClick: () => handleStatusChange(u.id, 'rejected', u.status),
        variant: 'danger' as const,
        loading: isLoading,
        disabled: isLoading,
      });
    }
    if (u.status === 'active' || u.status === 'approved') {
      actions.push({
        label: '비활성화',
        onClick: () => handleStatusChange(u.id, 'suspended', u.status),
        variant: 'danger' as const,
        loading: isLoading,
        disabled: isLoading,
      });
    }
    if (u.status === 'suspended') {
      actions.push({
        label: '활성화',
        onClick: () => handleStatusChange(u.id, 'approved', u.status),
        variant: 'primary' as const,
        loading: isLoading,
        disabled: isLoading,
      });
    }
    return actions;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser, actionLoading]);

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

        {/* ActionBar — pending 탭에서 선택 시 표시 */}
        <div className="mb-3">
          <ActionBar
            selectedCount={selectedIds.size}
            onClearSelection={() => setSelectedIds(new Set())}
            actions={bulkActions}
          />
        </div>

        {/* BulkResultModal */}
        <BulkResultModal
          open={batch.showResult}
          onClose={() => { batch.clearResult(); fetchUsers(pagination.page); fetchStats(); }}
          result={batch.result}
          onRetry={() => { batch.retryFailed(); }}
        />

        {/* DataTable */}
        <DataTable<UserData>
          columns={columns}
          data={filteredUsers}
          rowKey="id"
          loading={loading}
          emptyMessage={activeTab === 'pending' ? '가입 신청이 없습니다.' : '등록된 사용자가 없습니다.'}
          onRowClick={(user) => setSelectedUser(user)}
          tableId="neture-operator-users"
          selectable
          selectedKeys={selectedIds}
          onSelectionChange={setSelectedIds}
        />

        {/* Pagination */}
        {(activeTab === 'all' || activeTab === 'pending') && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => fetchUsers(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1}
              className="flex items-center gap-1 px-3 py-2 border rounded-lg disabled:opacity-50 hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" />이전
            </button>
            <span className="text-sm text-slate-600">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => fetchUsers(Math.min(pagination.totalPages, pagination.page + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="flex items-center gap-1 px-3 py-2 border rounded-lg disabled:opacity-50 hover:bg-slate-50"
            >
              다음<ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </MemberListLayout>

      {/* ─── BaseDetailDrawer ─────────────────────────────────── */}
      <BaseDetailDrawer
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title={selectedUser ? getUserName(selectedUser) : ''}
        width={520}
        actions={drawerActions}
      >
        {selectedUser && (
          <div style={{ fontSize: 14, color: '#374151' }}>
            {/* 기본 정보 */}
            <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: '#e2e8f0', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontWeight: 600, fontSize: 16, color: '#475569', flexShrink: 0,
                }}>
                  {getUserName(selectedUser).charAt(0)}
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 15, color: '#1e293b', marginBottom: 2 }}>
                    {getUserName(selectedUser)}
                  </p>
                  <p style={{ fontSize: 13, color: '#64748b' }}>{selectedUser.email}</p>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <StatusBadge status={selectedUser.status} />
                </div>
              </div>
            </div>

            {/* 상세 필드 */}
            {[
              { label: '역할', value: getPrimaryRole(selectedUser) },
              { label: '가입일', value: new Date(selectedUser.createdAt).toLocaleDateString('ko-KR') },
              selectedUser.phone ? { label: '연락처', value: selectedUser.phone } : null,
              selectedUser.company ? { label: '소속', value: selectedUser.company } : null,
            ].filter(Boolean).map((item: any) => (
              <div key={item.label} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                <span style={{ fontWeight: 600, color: '#64748b', minWidth: 60 }}>{item.label}</span>
                <span style={{ color: '#1e293b' }}>{item.value}</span>
              </div>
            ))}

            {/* 서비스 멤버십 */}
            {selectedUser.memberships && selectedUser.memberships.length > 0 && (
              <div style={{ marginTop: 12, marginBottom: 12 }}>
                <p style={{ fontWeight: 600, color: '#64748b', marginBottom: 6 }}>서비스 멤버십</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedUser.memberships.map((m) => (
                    <span
                      key={m.id}
                      style={{
                        padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 500,
                        background: m.status === 'active' ? '#eff6ff' : m.status === 'pending' ? '#fffbeb' : '#f1f5f9',
                        color: m.status === 'active' ? '#1d4ed8' : m.status === 'pending' ? '#92400e' : '#64748b',
                      }}
                    >
                      {m.serviceKey} · {m.status}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 상태별 안내 */}
            {selectedUser.status === 'pending' && (
              <div style={{ marginTop: 12, padding: '10px 14px', backgroundColor: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a' }}>
                <p style={{ fontSize: 12, color: '#92400e', fontWeight: 500 }}>
                  가입 신청 대기 중입니다. 아래 버튼으로 승인 또는 반려를 처리하세요.
                </p>
              </div>
            )}
            {selectedUser.status === 'rejected' && (
              <div style={{ marginTop: 12, padding: '10px 14px', backgroundColor: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
                <p style={{ fontSize: 12, color: '#991b1b', fontWeight: 500 }}>
                  거부 처리된 신청입니다. 재승인이 가능합니다.
                </p>
              </div>
            )}

            {/* 전체 상세 링크 */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
              <a
                href={`/operator/users/${selectedUser.id}`}
                style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}
              >
                전체 상세 페이지 →
              </a>
            </div>
          </div>
        )}
      </BaseDetailDrawer>

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
