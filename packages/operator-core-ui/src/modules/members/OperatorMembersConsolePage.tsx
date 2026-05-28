/**
 * OperatorMembersConsolePage — Operator Members 공통 wrapper
 *
 * WO-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-V1
 *
 * Neture / GlycoPharm / K-Cosmetics 3 service 의 Operator Members list-side UI 를
 * 단일 wrapper 로 정렬. KPA 는 KpaMember entity 기반 별도 페이지 (MemberManagementPage) 유지.
 *
 * IR: docs/investigations/IR-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-DESIGN-V1.md (Option C)
 * 선행: WO-O4O-OPERATOR-MEMBERS-DETAIL-SURFACE-CANONICALIZATION-V1 (Hybrid Canonical — Drawer + 전체 상세 link)
 *
 * Canonical UX = Neture 패턴:
 *   - Selectable DataTable + row click → Drawer
 *   - Drawer footer = status-aware action (approve/reject/suspend/activate)
 *   - ActionBar = bulk approve/reject
 *   - RowActionMenu = utility (edit / password / delete) — status 는 drawer 로 통일
 *   - Drawer body footer = "전체 상세 페이지 →" (CommonUserDetailPage 진입)
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
import { toast } from '@o4o/error-handling';
import type {
  MembersConsoleClient,
  OperatorMembersConsolePageProps,
  PaginationData,
  UserData,
  MembersStatusTab,
} from './types';

// ─── Helpers ─────────────────────────────────────────────────

function getUserName(u: UserData): string {
  if (u.lastName || u.firstName) {
    const full = `${u.lastName || ''}${u.firstName || ''}`.trim();
    if (full) return full;
  }
  if (u.name && u.name !== u.email) return u.name;
  return u.email?.split('@')[0] || '사용자';
}

function defaultGetPrimaryRole(serviceKey: string) {
  return (u: UserData): string => {
    const membership = u.memberships?.find((m) => m.serviceKey === serviceKey);
    if (membership?.role) return membership.role;
    const roles = u.roles || (u.role ? [u.role] : []);
    return roles[0] || 'user';
  };
}

// ─── Password Modal (built-in) ───────────────────────────────

interface PasswordModalProps {
  user: UserData;
  client: MembersConsoleClient;
  onClose: () => void;
  onSuccess: () => void;
}

function PasswordModal({ user, client, onClose, onSuccess }: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await client.updatePassword(user.id, password);
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
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          {getUserName(user)} ({user.email})
        </p>
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 mb-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
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
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? '처리 중...' : '변경'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Action Policy (utility only — canonical) ────────────────

interface BuildActionPolicyOptions {
  serviceKey: string;
  hasDelete: boolean;
}

function buildUserActionPolicy({ serviceKey, hasDelete }: BuildActionPolicyOptions) {
  const rules: Array<any> = [
    { key: 'edit', label: '정보 수정' },
    { key: 'password', label: '비밀번호 변경' },
  ];
  if (hasDelete) {
    rules.push({
      key: 'delete',
      label: '삭제',
      variant: 'danger',
      divider: true,
    });
  }
  return defineActionPolicy<UserData>(`${serviceKey}:users`, {
    inlineMax: 0, // 상태 변경은 drawer 로 통일, utility 만 overflow menu
    rules,
  });
}

const USER_ACTION_ICONS: Record<string, ReactNode> = {
  edit: <Pencil className="w-4 h-4" />,
  password: <KeyRound className="w-4 h-4" />,
  delete: <Trash2 className="w-4 h-4" />,
};

// ─── Main Component ──────────────────────────────────────────

export function OperatorMembersConsolePage({
  serviceKey,
  client,
  title = '회원 관리',
  description = '회원 승인, 상태 변경, 서비스 멤버십 관리',
  roleTabs,
  statusTabs,
  getPrimaryRole: getPrimaryRoleProp,
  roleDisplayMap,
  extraColumn,
  drawerExtraSections,
  renderEditModal,
  renderDeleteFlow,
  tableId,
}: OperatorMembersConsolePageProps) {
  const getPrimaryRole = useMemo(
    () => getPrimaryRoleProp ?? defaultGetPrimaryRole(serviceKey),
    [getPrimaryRoleProp, serviceKey],
  );

  const [activeTab, setActiveTab] = useState('all');
  const [users, setUsers] = useState<UserData[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [passwordUser, setPasswordUser] = useState<UserData | null>(null);
  const [editUser, setEditUser] = useState<UserData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserData | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const batch = useBatchAction();

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    rejected: 0,
    roleCounts: {} as Record<string, number>,
  });

  // ─── Fetch ──────────────────────────────────────────────────

  const fetchUsers = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      try {
        const activeStatusTab = (statusTabs ?? []).find((t) => t.key === activeTab);
        const params = {
          page,
          limit: 20,
          ...(activeTab === 'pending' ? { status: 'pending' } : {}),
          ...(activeStatusTab ? { status: activeStatusTab.status } : {}),
          ...(searchQuery ? { search: searchQuery } : {}),
        };
        const data = await client.list(params);
        setUsers(data.users || []);
        setPagination(data.pagination || { page, limit: 20, total: 0, totalPages: 0 });
      } catch (err: any) {
        setError(err?.message || '회원 목록을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [client, activeTab, searchQuery, statusTabs],
  );

  const fetchStats = useCallback(async () => {
    try {
      const statsRes = await client.stats();
      const byStatus = statsRes.statistics?.byStatus || [];
      const getCount = (s: string) => byStatus.find((b) => b.status === s)?.count || 0;

      const allData = await client.listAll();
      const allUsers: UserData[] = allData.users || [];
      const roleCounts: Record<string, number> = {};
      roleTabs.forEach((tab) => {
        roleCounts[tab.key] = allUsers.filter((u) => tab.roleFilter.includes(getPrimaryRole(u))).length;
      });

      setStats({
        total: statsRes.statistics?.total || 0,
        active: getCount('active') + getCount('approved'),
        pending: getCount('pending'),
        rejected: getCount('rejected'),
        roleCounts,
      });
    } catch {
      // stats failure is non-critical
    }
  }, [client, roleTabs, getPrimaryRole]);

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Reset selection on tab/search change
  useEffect(() => {
    setSelectedIds(new Set());
    setSelectedUser(null);
  }, [activeTab, searchQuery]);

  // ─── Status & Password Handlers ─────────────────────────────

  const handleStatusChange = async (
    userId: string,
    status: string,
    currentStatus?: string,
    user?: UserData,
  ) => {
    setActionLoading(userId);
    try {
      await client.updateStatus(userId, status, currentStatus, user);
      setSelectedUser(null);
      fetchUsers(pagination.page);
      fetchStats();
    } catch (err: any) {
      toast.error(err?.message || '오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Batch Actions ──────────────────────────────────────────

  const selectedPendingIds = useMemo(
    () => [...selectedIds].filter((id) => users.find((u) => u.id === id)?.status === 'pending'),
    [selectedIds, users],
  );

  const selectedApprovableIds = useMemo(
    () =>
      [...selectedIds].filter((id) => {
        const s = users.find((u) => u.id === id)?.status;
        return s === 'pending' || s === 'rejected';
      }),
    [selectedIds, users],
  );

  const handleBulkApprove = async () => {
    if (selectedApprovableIds.length === 0) return;
    const result = await batch.executeBatch(
      (batchIds: string[]) => client.batchUpdateStatus(batchIds, 'approved'),
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
      (batchIds: string[]) => client.batchUpdateStatus(batchIds, 'rejected'),
      selectedPendingIds,
    );
    if (result.successCount > 0) {
      setSelectedIds(new Set());
      fetchUsers(pagination.page);
      fetchStats();
    }
  };

  // ─── Role tab filtering (client-side) ───────────────────────

  const filteredUsers = useMemo(() => {
    if (activeTab === 'all' || activeTab === 'pending') return users;
    if ((statusTabs ?? []).some((t) => t.key === activeTab)) return users; // server-filtered
    const tab = roleTabs.find((t) => t.key === activeTab);
    if (!tab || tab.roleFilter.length === 0) return users;
    return users.filter((u) => tab.roleFilter.includes(getPrimaryRole(u)));
  }, [users, activeTab, roleTabs, statusTabs, getPrimaryRole]);

  // ─── Tabs ───────────────────────────────────────────────────

  const tabs: MemberTab[] = useMemo(() => {
    return [
      { key: 'all', label: '전체', count: stats.total },
      ...roleTabs.map((rt) => ({
        key: rt.key,
        label: rt.label,
        count: stats.roleCounts[rt.key] ?? 0,
      })),
      ...(statusTabs ?? []).map((st: MembersStatusTab) => ({
        key: st.key,
        label: st.label,
      })),
      { key: 'pending', label: '가입 신청', count: stats.pending },
    ];
  }, [roleTabs, statusTabs, stats]);

  // ─── Bulk Action Bar ────────────────────────────────────────

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

  const roleColumn: ListColumnDef<UserData> = {
    key: 'role',
    header: '역할',
    width: '120px',
    render: (_v, user) => {
      const role = getPrimaryRole(user);
      const display = roleDisplayMap?.[role] ?? role;
      return <RoleBadge role={display} />;
    },
  };

  const baseColumns: ListColumnDef<UserData>[] = [
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
    roleColumn,
    ...(extraColumn ? [extraColumn] : []),
    {
      key: 'createdAt',
      header: '가입일',
      sortable: true,
      sortAccessor: (u) => new Date(u.createdAt).getTime(),
      width: '100px',
      render: (v: any) => (
        <span className="text-sm text-slate-600">{new Date(v).toLocaleDateString('ko-KR')}</span>
      ),
    },
    {
      key: 'status',
      header: '상태',
      width: '80px',
      render: (v: any) => <StatusBadge status={v} />,
    },
  ];

  const userActionPolicy = useMemo(
    () => buildUserActionPolicy({ serviceKey, hasDelete: !!renderDeleteFlow }),
    [serviceKey, renderDeleteFlow],
  );

  const actionsColumn: ListColumnDef<UserData> = {
    key: '_actions',
    header: '액션',
    system: true,
    width: '60px',
    align: 'center',
    onCellClick: () => {}, // prevent row click from triggering drawer
    render: (_v, user) =>
      actionLoading === user.id ? (
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
      ) : (
        <RowActionMenu
          actions={buildRowActions(
            userActionPolicy,
            user,
            {
              edit: () => setEditUser(user),
              password: () => setPasswordUser(user),
              delete: () => setDeleteTarget(user),
            },
            { icons: USER_ACTION_ICONS },
          )}
          inlineMax={userActionPolicy.inlineMax}
        />
      ),
  };

  const columns: ListColumnDef<UserData>[] = [...baseColumns, actionsColumn];

  // ─── Drawer: status-aware footer actions ────────────────────

  const drawerActions = useMemo(() => {
    if (!selectedUser) return [];
    const u = selectedUser;
    const isLoading = actionLoading === u.id;
    const actions: Array<{
      label: string;
      onClick: () => void;
      variant: 'primary' | 'danger';
      loading: boolean;
      disabled: boolean;
    }> = [];

    if (u.status === 'pending' || u.status === 'rejected') {
      actions.push({
        label: '승인',
        onClick: () => handleStatusChange(u.id, 'approved', u.status, u),
        variant: 'primary',
        loading: isLoading,
        disabled: isLoading,
      });
    }
    if (u.status === 'pending') {
      actions.push({
        label: '반려',
        onClick: () => handleStatusChange(u.id, 'rejected', u.status, u),
        variant: 'danger',
        loading: isLoading,
        disabled: isLoading,
      });
    }
    if (u.status === 'active' || u.status === 'approved') {
      actions.push({
        label: '비활성화',
        onClick: () => handleStatusChange(u.id, 'suspended', u.status, u),
        variant: 'danger',
        loading: isLoading,
        disabled: isLoading,
      });
    }
    if (u.status === 'suspended') {
      actions.push({
        label: '활성화',
        onClick: () => handleStatusChange(u.id, 'approved', u.status, u),
        variant: 'primary',
        loading: isLoading,
        disabled: isLoading,
      });
    }
    return actions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser, actionLoading]);

  // ─── Render ─────────────────────────────────────────────────

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
              <div
                className={`w-10 h-10 bg-${s.color}-100 rounded-lg flex items-center justify-center`}
              >
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
        title={title}
        description={description}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(key) => setActiveTab(key)}
        search={search}
        onSearchChange={setSearch}
        onSearch={(q) => setSearchQuery(q)}
        headerActions={
          <button
            onClick={() => {
              fetchUsers(pagination.page);
              fetchStats();
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />새로고침
          </button>
        }
      >
        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ActionBar — 선택 시 표시 */}
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
          onClose={() => {
            batch.clearResult();
            fetchUsers(pagination.page);
            fetchStats();
          }}
          result={batch.result}
          onRetry={() => {
            batch.retryFailed();
          }}
        />

        {/* DataTable */}
        <DataTable<UserData>
          columns={columns}
          data={filteredUsers}
          rowKey="id"
          loading={loading}
          emptyMessage={activeTab === 'pending' ? '가입 신청이 없습니다.' : '등록된 사용자가 없습니다.'}
          onRowClick={(user) => setSelectedUser(user)}
          tableId={tableId ?? `${serviceKey}-operator-members`}
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
              <ChevronLeft className="w-4 h-4" />
              이전
            </button>
            <span className="text-sm text-slate-600">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => fetchUsers(Math.min(pagination.totalPages, pagination.page + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="flex items-center gap-1 px-3 py-2 border rounded-lg disabled:opacity-50 hover:bg-slate-50"
            >
              다음
              <ChevronRight className="w-4 h-4" />
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
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#f8fafc',
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: 16,
                    color: '#475569',
                    flexShrink: 0,
                  }}
                >
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
              { label: '역할', value: roleDisplayMap?.[getPrimaryRole(selectedUser)] ?? getPrimaryRole(selectedUser) },
              { label: '가입일', value: new Date(selectedUser.createdAt).toLocaleDateString('ko-KR') },
              selectedUser.phone ? { label: '연락처', value: selectedUser.phone } : null,
              selectedUser.company ? { label: '소속', value: selectedUser.company } : null,
            ]
              .filter(Boolean)
              .map((item: any) => (
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
                        padding: '3px 10px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 500,
                        background:
                          m.status === 'active' ? '#eff6ff' : m.status === 'pending' ? '#fffbeb' : '#f1f5f9',
                        color:
                          m.status === 'active' ? '#1d4ed8' : m.status === 'pending' ? '#92400e' : '#64748b',
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
              <div
                style={{
                  marginTop: 12,
                  padding: '10px 14px',
                  backgroundColor: '#fffbeb',
                  borderRadius: 8,
                  border: '1px solid #fde68a',
                }}
              >
                <p style={{ fontSize: 12, color: '#92400e', fontWeight: 500 }}>
                  가입 신청 대기 중입니다. 아래 버튼으로 승인 또는 반려를 처리하세요.
                </p>
              </div>
            )}
            {selectedUser.status === 'rejected' && (
              <div
                style={{
                  marginTop: 12,
                  padding: '10px 14px',
                  backgroundColor: '#fef2f2',
                  borderRadius: 8,
                  border: '1px solid #fecaca',
                }}
              >
                <p style={{ fontSize: 12, color: '#991b1b', fontWeight: 500 }}>
                  거부 처리된 신청입니다. 재승인이 가능합니다.
                </p>
              </div>
            )}

            {/* Service-specific 확장 영역 */}
            {drawerExtraSections && drawerExtraSections(selectedUser)}

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
          client={client}
          onClose={() => setPasswordUser(null)}
          onSuccess={() => {
            fetchUsers(pagination.page);
          }}
        />
      )}

      {/* Edit User Modal — service-provided slot */}
      {editUser &&
        renderEditModal({
          user: editUser,
          onClose: () => setEditUser(null),
          onSuccess: () => {
            fetchUsers(pagination.page);
          },
        })}

      {/* Delete Flow — service-provided slot */}
      {deleteTarget &&
        renderDeleteFlow &&
        renderDeleteFlow({
          user: deleteTarget,
          onClose: () => setDeleteTarget(null),
          onDeleted: () => {
            fetchUsers(pagination.page);
            fetchStats();
            setDeleteTarget(null);
          },
        })}
    </div>
  );
}
