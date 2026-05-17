/**
 * UsersListClean — Assignment-Row Canonical (operator-ux-core DataTable)
 *
 * WO-O4O-ADMIN-ASSIGNMENT-ROW-LIST-CANONICALIZATION-V1 (assignment-row data model)
 * WO-O4O-ADMIN-USERSLIST-ASSIGNMENT-CANONICALIZATION-V1 (OperatorsPage canonical 정렬:
 *   DataTable + ActionBar + BulkResultModal + BaseDetailDrawer + useBatchAction)
 *
 * 구조:
 * - 행 단위: 1 role_assignment (multi-role user 자동 펼침)
 * - DataTable: @o4o/operator-ux-core (selectable, onRowClick → detail drawer)
 * - Bulk Action: ActionBar — 권한 해제(assignment 단위) + 사용자 삭제(user 단위 dedup),
 *                useBatchAction + BulkResultModal
 * - Row Action: RowActionMenu — 사용자 편집 / 권한 해제 / 사용자 삭제
 * - Row Click: BaseDetailDrawer — 사용자 + 이 assignment + 전체 보유 권한
 * - facet 필터: Service / Role / Status (FilterBar)
 *
 * 자매: docs/investigations/IR-O4O-ADMIN-ROLE-LIST-SERVICE-CENTRIC-UX-AUDIT-V1.md
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, CheckCircle, XCircle, Check, X, UserX, Trash2 } from 'lucide-react';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { ActionBar, BulkResultModal, RowActionMenu, FilterBar, BaseDetailDrawer } from '@o4o/ui';
import type { ActionBarAction } from '@o4o/ui';
import { DataTable, useBatchAction } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import PageHeader from '@/components/common/PageHeader';
import {
  flattenUsersToAssignments,
  uniqueUserIdsFromKeys,
  type AdminUserDto,
  type AssignmentRow,
} from '@/lib/assignment-row';
import { getRoleOptions, getServiceOptions, parseRole } from '@/lib/rbac-catalog';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

interface Facets {
  service: string;
  role: string;
  status: string;
}

const EMPTY_FACETS: Facets = { service: '', role: '', status: '' };

export default function UsersListClean() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [facets, setFacets] = useState<Facets>(() => {
    try {
      const raw = sessionStorage.getItem('users-facets');
      return raw ? { ...EMPTY_FACETS, ...JSON.parse(raw) } : EMPTY_FACETS;
    } catch {
      return EMPTY_FACETS;
    }
  });

  // WO-O4O-ADMIN-USERSLIST-ASSIGNMENT-CANONICALIZATION-V1 — canonical selection / bulk / drawer
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [detailTarget, setDetailTarget] = useState<AssignmentRow | null>(null);
  const batch = useBatchAction();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    sessionStorage.setItem('users-facets', JSON.stringify(facets));
  }, [facets]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await authClient.api.get('/admin/users', { params: { limit: 1000, page: 1 } });
      const raw =
        response.data?.users ||
        response.data?.data?.users ||
        response.data?.data ||
        response.data ||
        [];
      setUsers(Array.isArray(raw) ? (raw as AdminUserDto[]) : []);
    } catch {
      toast.error('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // assignment-row flatMap (no-role 사용자는 synthetic 'user' row 로 처리됨 — assignment-row.ts)
  const allRows = useMemo<AssignmentRow[]>(() => flattenUsersToAssignments(users), [users]);

  const filteredRows = useMemo<AssignmentRow[]>(() => {
    return allRows.filter((row) => {
      if (facets.service && row.parsedRole.serviceKey !== facets.service) return false;
      if (facets.role && row.parsedRole.roleKey !== facets.role) return false;
      if (facets.status === 'active' && !row.userIsActive) return false;
      if (facets.status === 'inactive' && row.userIsActive) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack =
          row.userName +
          ' ' +
          row.userEmail +
          ' ' +
          row.username +
          ' ' +
          row.role +
          ' ' +
          row.service.label +
          ' ' +
          row.roleMeta.label;
        if (!haystack.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allRows, facets, search]);

  // 통계 (assignment 단위 + unique user count)
  const stats = useMemo(() => {
    const total = allRows.length;
    const activeUsers = new Set<string>();
    allRows.forEach((r) => {
      if (r.userIsActive) activeUsers.add(r.userId);
    });
    const allUsers = new Set(allRows.map((r) => r.userId));
    return {
      assignments: total,
      users: allUsers.size,
      activeUsers: activeUsers.size,
      visible: filteredRows.length,
    };
  }, [allRows, filteredRows]);

  // ─── Row-level action: 단일 사용자 삭제 ───
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('이 사용자를 삭제하시겠습니까? (모든 권한이 함께 해제됩니다)')) return;
    try {
      await authClient.api.delete(`/users/${userId}`);
      setUsers((prev) => prev.filter((u) => (u.id ?? u._id) !== userId));
      toast.success('사용자 삭제 완료');
    } catch {
      toast.error('삭제 실패');
    }
  };

  // ─── Row-level action: 단일 권한 해제 ───
  const handleRevokeRole = async (userId: string, role: string) => {
    if (role === 'platform:super_admin') {
      toast.error('슈퍼관리자 역할은 이 화면에서 해제할 수 없습니다.');
      return;
    }
    if (!confirm(`이 권한(${role})을 해제하시겠습니까? (계정은 유지됩니다)`)) return;
    try {
      await authClient.api.delete(`/admin/users/${userId}/role-assignments/${encodeURIComponent(role)}`);
      toast.success('권한 해제 완료');
      fetchUsers();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || '권한 해제 실패';
      toast.error(msg);
    }
  };

  // ─── Bulk: 권한 해제 (assignment-row 단위) ───
  // useBatchAction 호환 응답: { data: { results: [{ id, status, error? }] } }
  // platform:super_admin 은 'skipped' (보호 정책)
  // 'user' (legacy fallback) row 는 실제 role_assignments 에 없으므로 'skipped' 처리
  const bulkRevokeRoles = useCallback(
    async (
      ids: string[],
    ): Promise<{ data: { results: Array<{ id: string; status: 'success' | 'failed' | 'skipped'; error?: string }> } }> => {
      const results = await Promise.all(
        ids.map(async (key) => {
          const [userId, role] = key.split('::');
          if (!userId || !role) {
            return { id: key, status: 'failed' as const, error: 'Invalid selection key' };
          }
          if (role === 'platform:super_admin') {
            return { id: key, status: 'skipped' as const, error: '슈퍼관리자 — 해제 불가' };
          }
          if (role === 'user') {
            return { id: key, status: 'skipped' as const, error: '기본 사용자 role — 해제 대상 아님' };
          }
          try {
            await authClient.api.delete(`/admin/users/${userId}/role-assignments/${encodeURIComponent(role)}`);
            return { id: key, status: 'success' as const };
          } catch (err: any) {
            const msg = err?.response?.data?.error || err?.message || '권한 해제 실패';
            return { id: key, status: 'failed' as const, error: msg };
          }
        }),
      );
      return { data: { results } };
    },
    [],
  );

  // ─── Bulk: 사용자 삭제 (user 단위, selection 에서 userId 중복 제거) ───
  const bulkDeleteUsers = useCallback(
    async (
      userIds: string[],
    ): Promise<{ data: { results: Array<{ id: string; status: 'success' | 'failed' | 'skipped'; error?: string }> } }> => {
      const results = await Promise.all(
        userIds.map(async (uid) => {
          try {
            await authClient.api.delete(`/users/${uid}`);
            return { id: uid, status: 'success' as const };
          } catch (err: any) {
            const msg = err?.response?.data?.error || err?.message || '삭제 실패';
            return { id: uid, status: 'failed' as const, error: msg };
          }
        }),
      );
      return { data: { results } };
    },
    [],
  );

  const handleBulkRevoke = useCallback(async () => {
    if (selectedKeys.size === 0) return;
    await batch.executeBatch(bulkRevokeRoles, Array.from(selectedKeys));
  }, [batch, bulkRevokeRoles, selectedKeys]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedKeys.size === 0) return;
    const userIds = uniqueUserIdsFromKeys(selectedKeys);
    await batch.executeBatch(bulkDeleteUsers, userIds);
  }, [batch, bulkDeleteUsers, selectedKeys]);

  // ─── 컬럼 정의 (canonical ListColumnDef) ───
  const columns: ListColumnDef<AssignmentRow>[] = [
    {
      key: 'service',
      header: 'Service',
      width: '130px',
      sortable: true,
      sortAccessor: (row) => row.service.label,
      render: (_, row) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${row.service.badgeClass}`}>
          {row.service.label}
        </span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      width: '150px',
      sortable: true,
      sortAccessor: (row) => row.roleMeta.label,
      render: (_, row) => (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${row.roleMeta.badgeClass}`}>
          {row.roleMeta.label}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'User',
      sortable: true,
      sortAccessor: (row) => row.userName,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {row.userAvatar && (
            <img src={row.userAvatar} alt="" className="w-7 h-7 rounded-full flex-shrink-0" />
          )}
          <div className="min-w-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/users/${row.userId}/edit`);
              }}
              className="font-medium text-blue-600 hover:text-blue-800 text-sm truncate block"
            >
              {row.userName}
            </button>
            <div className="text-xs text-gray-500 truncate">@{row.username}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      sortAccessor: (row) => row.userEmail,
      render: (_, row) => (
        <a
          href={`mailto:${row.userEmail}`}
          onClick={(e) => e.stopPropagation()}
          className="text-sm text-blue-600 hover:underline"
        >
          {row.userEmail}
        </a>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      align: 'center',
      sortable: true,
      sortAccessor: (row) => (row.userIsActive ? 'active' : 'inactive'),
      render: (_, row) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
            row.userIsActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {row.userIsActive ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
          {row.userIsActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Registered',
      width: '110px',
      sortable: true,
      sortAccessor: (row) => row.userCreatedAt,
      render: (_, row) => <span className="text-sm text-gray-500">{row.userCreatedAt}</span>,
    },
    {
      key: '_actions',
      header: '',
      width: '56px',
      system: true,
      align: 'center',
      render: (_, row) => (
        <RowActionMenu
          actions={[
            {
              key: 'edit',
              label: '사용자 편집',
              icon: <CheckCircle size={14} />,
              variant: 'primary',
              onClick: () => navigate(`/users/${row.userId}/edit`),
            },
            {
              key: 'revoke',
              label: `권한 해제 (${row.roleMeta.label})`,
              variant: 'danger',
              onClick: () => handleRevokeRole(row.userId, row.role),
            },
            {
              key: 'delete',
              label: '사용자 삭제',
              variant: 'danger',
              icon: <XCircle size={14} />,
              onClick: () => handleDeleteUser(row.userId),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <PageHeader
        title="Users & Roles"
        subtitle="권한 할당 단위 (1 row = 1 user × 1 role) — RBAC SSOT"
        backUrl="/"
        backLabel="Dashboard"
        actions={[
          { id: 'add', label: 'Add User', onClick: () => navigate('/users/new'), variant: 'primary', icon: <Plus className="w-4 h-4" /> },
          { id: 'refresh', label: 'Refresh', onClick: fetchUsers, variant: 'secondary', icon: <RefreshCw className="w-4 h-4" /> },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Users" value={stats.users} color="text-gray-900" />
        <StatCard label="Active Users" value={stats.activeUsers} color="text-green-600" />
        <StatCard label="Assignments" value={stats.assignments} color="text-blue-600" />
        <StatCard label="Visible" value={stats.visible} color="text-orange-600" />
      </div>

      {/* FilterBar (facet selects only — bulk 는 ActionBar 로 이관) */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <FilterBar
          searchPlaceholder="사용자명, 이메일, 서비스, 역할 검색..."
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            { key: 'service', placeholder: 'All Services', options: getServiceOptions() },
            { key: 'role', placeholder: 'All Roles', options: getRoleOptions() },
            { key: 'status', placeholder: 'All Status', options: STATUS_OPTIONS },
          ]}
          filterValues={facets as unknown as Record<string, string>}
          onFilterChange={(k, v) => setFacets((prev) => ({ ...prev, [k]: v } as Facets))}
        />
      </div>

      {/* ActionBar (선택 시 노출) — 권한 해제 + 사용자 삭제 */}
      {selectedKeys.size > 0 && (
        <div className="mb-3">
          <ActionBar
            selectedCount={selectedKeys.size}
            onClearSelection={() => setSelectedKeys(new Set())}
            actions={[
              {
                key: 'bulk-revoke',
                label: `권한 해제 (${selectedKeys.size})`,
                variant: 'danger',
                icon: <UserX className="w-4 h-4" />,
                onClick: handleBulkRevoke,
                loading: batch.loading,
                tooltip: '선택된 assignment 의 role 만 해제합니다 (super_admin · user 자동 skip, 계정 유지)',
                confirm: {
                  title: '권한 일괄 해제',
                  message: `선택한 ${selectedKeys.size}개 권한을 해제하시겠습니까?\n\nplatform:super_admin 및 기본 user role 은 자동으로 건너뜁니다.\n계정은 유지되며 role_assignments 만 비활성화됩니다.`,
                  variant: 'danger',
                  confirmText: '권한 해제',
                },
              } as ActionBarAction,
              {
                key: 'bulk-delete',
                label: `사용자 삭제 (${uniqueUserIdsFromKeys(selectedKeys).length})`,
                variant: 'danger',
                icon: <Trash2 className="w-4 h-4" />,
                onClick: handleBulkDelete,
                loading: batch.loading,
                tooltip: '선택된 행의 사용자를 삭제합니다 (같은 사용자의 여러 행은 1회만 삭제)',
                confirm: {
                  title: '사용자 일괄 삭제',
                  message: `선택한 ${uniqueUserIdsFromKeys(selectedKeys).length}명의 사용자를 삭제하시겠습니까?\n\n사용자의 모든 권한과 데이터가 함께 삭제됩니다.\n복구할 수 없습니다.`,
                  variant: 'danger',
                  confirmText: '삭제',
                },
              } as ActionBarAction,
            ]}
          />
        </div>
      )}

      {/* DataTable (canonical operator-ux-core) */}
      <DataTable<AssignmentRow>
        columns={columns}
        data={filteredRows}
        rowKey={(row) => row.key}
        tableId="admin-users-assignments-list"
        loading={loading}
        emptyMessage="조건에 맞는 권한 할당이 없습니다."
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        onRowClick={(row) => setDetailTarget(row)}
        reorderable
        persistState
        columnVisibility
      />

      {/* Bulk 결과 모달 */}
      <BulkResultModal
        open={batch.showResult}
        onClose={() => {
          batch.clearResult();
          setSelectedKeys(new Set());
          fetchUsers();
        }}
        result={batch.result}
        onRetry={() => {
          batch.retryFailed();
        }}
        title="일괄 작업 결과"
      />

      {/* 상세 Drawer (조회 전용) — row click 진입 */}
      <BaseDetailDrawer
        open={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        title={detailTarget?.userName}
      >
        {detailTarget && (
          <div className="space-y-4">
            <dl className="grid grid-cols-3 gap-y-3 gap-x-4 text-sm">
              <dt className="text-gray-500">이메일</dt>
              <dd className="col-span-2 text-gray-900">{detailTarget.userEmail}</dd>
              <dt className="text-gray-500">Username</dt>
              <dd className="col-span-2 text-gray-900">@{detailTarget.username}</dd>
              <dt className="text-gray-500">상태</dt>
              <dd className="col-span-2">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                    detailTarget.userIsActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {detailTarget.userIsActive ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  {detailTarget.userIsActive ? 'Active' : 'Inactive'}
                </span>
              </dd>
              <dt className="text-gray-500">가입일</dt>
              <dd className="col-span-2 text-gray-900">{detailTarget.userCreatedAt || '-'}</dd>
              {detailTarget.userLastLogin && (
                <>
                  <dt className="text-gray-500">최근 로그인</dt>
                  <dd className="col-span-2 text-gray-900">{detailTarget.userLastLogin}</dd>
                </>
              )}
            </dl>
            <div>
              <h4 className="text-xs uppercase font-semibold text-gray-500 mb-2">선택된 권한</h4>
              <div className="flex flex-wrap gap-1">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${detailTarget.service.badgeClass}`}
                >
                  {detailTarget.service.label}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${detailTarget.roleMeta.badgeClass}`}
                >
                  {detailTarget.roleMeta.label}
                </span>
              </div>
            </div>
            {detailTarget.userAllRoles.length > 1 && (
              <div>
                <h4 className="text-xs uppercase font-semibold text-gray-500 mb-2">전체 보유 권한</h4>
                <div className="flex flex-wrap gap-1">
                  {detailTarget.userAllRoles.map((raw) => {
                    const parsed = parseRole(raw);
                    return (
                      <span
                        key={raw}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                      >
                        {parsed.serviceKey}:{parsed.roleKey}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="pt-2 border-t">
              <button
                onClick={() => {
                  const uid = detailTarget.userId;
                  setDetailTarget(null);
                  navigate(`/users/${uid}/edit`);
                }}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                사용자 편집
              </button>
            </div>
          </div>
        )}
      </BaseDetailDrawer>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}
