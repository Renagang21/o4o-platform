/**
 * UsersListClean — Assignment-Row Canonical
 *
 * WO-O4O-ADMIN-ASSIGNMENT-ROW-LIST-CANONICALIZATION-V1
 *
 * 변경:
 * - 행(Row)의 단위: 1 user → 1 role_assignment
 *   (RBAC SSOT `role_assignments` 와 일치, multi-role 자동 펼침)
 * - role tab 7개 제거 → Service/Role/Status facet 필터 (FilterBar)
 * - role 라벨/색상 하드코딩 제거 → `lib/rbac-catalog` 단일 출처
 * - API 무변경 (GET /admin/users 응답의 roles[] 를 frontend flatMap)
 *
 * 자매:
 *   docs/investigations/IR-O4O-ADMIN-ROLE-LIST-SERVICE-CENTRIC-UX-AUDIT-V1.md
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, CheckCircle, Check, X } from 'lucide-react';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { BaseTable, RowActionMenu, FilterBar } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import PageHeader from '@/components/common/PageHeader';
import {
  flattenUsersToAssignments,
  type AdminUserDto,
  type AssignmentRow,
} from '@/lib/assignment-row';
import { getRoleOptions, getServiceOptions } from '@/lib/rbac-catalog';

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
  // WO-O4O-ADMIN-DASHBOARD-LOAD-FAILURE-EMPTY-LIST-AUDIT-AND-FIX-V1:
  //   목록 조회 실패를 "0건" 과 구분하기 위한 지속 상태. toast 는 사라지므로 별도로 유지한다.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [search, setSearch] = useState('');
  const [facets, setFacets] = useState<Facets>(() => {
    try {
      const raw = sessionStorage.getItem('users-facets');
      return raw ? { ...EMPTY_FACETS, ...JSON.parse(raw) } : EMPTY_FACETS;
    } catch {
      return EMPTY_FACETS;
    }
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    sessionStorage.setItem('users-facets', JSON.stringify(facets));
  }, [facets]);

  /**
   * 권한 할당 목록 조회.
   *
   * WO-O4O-ADMIN-DASHBOARD-LOAD-FAILURE-EMPTY-LIST-AUDIT-AND-FIX-V1
   *   종전에는 실패 시 `setUsers([])` 로 목록을 비워, 표가 emptyMessage
   *   ("조건에 맞는 권한 할당이 없습니다.")를 그대로 보여줬다. 통계 카드도 전부 0 이 되어
   *   "이 플랫폼에 권한 할당이 하나도 없다"고 오인할 수 있었다 — 실패를 0건으로 위장한 것이다.
   *   (자매 수정: OperatorsPage — WO-O4O-OPERATORS-PAGE-SILENT-NOOP-FIX-V1)
   */
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await authClient.api.get('/admin/users', { params: { limit: 1000, page: 1 } });

      // 200 인데 실패를 실은 응답을 성공으로 오인하지 않는다.
      if (response.data?.success === false) {
        throw new Error(response.data?.error || response.data?.message || '목록 조회에 실패했습니다.');
      }

      const raw =
        response.data?.users ||
        response.data?.data?.users ||
        response.data?.data ||
        response.data ||
        [];

      // 예상과 다른 응답 형태를 "0건" 으로 흘려보내지 않는다.
      if (!Array.isArray(raw)) {
        throw new Error('사용자 목록 응답 형식이 올바르지 않습니다.');
      }

      setUsers(raw as AdminUserDto[]);
      setLoadError(null);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        '사용자 목록을 불러오지 못했습니다.';
      setLoadError(msg);
      toast.error(msg);
      // 기존 목록은 유지한다 — 비우면 "권한 할당 0건" 과 구분되지 않는다.
    } finally {
      setLoading(false);
    }
  };

  // assignment-row flatMap
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
          row.userName + ' ' + row.userEmail + ' ' + row.username + ' ' + row.role + ' ' + row.service.label + ' ' + row.roleMeta.label;
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

  const handleBulkAction = async () => {
    if (!bulkAction || selectedKeys.size === 0) {
      toast.error('Please select an action and rows');
      return;
    }
    if (bulkAction === 'revoke') {
      // 선택된 assignment-row 각각의 role 해제
      const targets = Array.from(selectedKeys).map((k) => {
        const [uid, role] = k.split('::');
        return { uid, role };
      });
      if (!confirm(`${targets.length}개 권한을 해제하시겠습니까? (계정은 유지됩니다)`)) return;
      const results = await Promise.allSettled(
        targets.map(({ uid, role }) =>
          authClient.api.delete(`/admin/users/${uid}/role-assignments/${encodeURIComponent(role)}`),
        ),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed === 0) {
        toast.success(`${targets.length}개 권한 해제 완료`);
      } else {
        toast.error(`${failed}개 권한 해제 실패 (성공 ${targets.length - failed}개)`);
      }
      setSelectedKeys(new Set());
      fetchUsers();
    }
  };

  const handleRevokeRole = async (userId: string, role: string) => {
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

  const columns: O4OColumn<AssignmentRow>[] = [
    {
      key: 'service',
      header: 'Service',
      width: 130,
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
      width: 150,
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
              onClick={() => navigate(`/users/${row.userId}/edit`)}
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
        <a href={`mailto:${row.userEmail}`} className="text-sm text-blue-600 hover:underline">
          {row.userEmail}
        </a>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 100,
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
      width: 110,
      sortable: true,
      sortAccessor: (row) => row.userCreatedAt,
      render: (_, row) => <span className="text-sm text-gray-500">{row.userCreatedAt}</span>,
    },
    {
      key: '_actions',
      header: '',
      width: 56,
      system: true,
      align: 'center',
      render: (_, row) => (
        <RowActionMenu
          actions={[
            {
              key: 'edit',
              label: '권한 할당 편집',
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
          ]}
        />
      ),
    },
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-10 bg-gray-200 rounded" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <PageHeader
        title="RBAC Role Assignments"
        subtitle="Platform super-admin 전용 콘솔 — role_assignments SSOT (1 row = 1 user × 1 role)"
        backUrl="/"
        backLabel="Dashboard"
        actions={[
          { id: 'add', label: 'New Assignment', onClick: () => navigate('/users/new'), variant: 'primary', icon: <Plus className="w-4 h-4" /> },
          { id: 'refresh', label: 'Refresh', onClick: fetchUsers, variant: 'secondary', icon: <RefreshCw className="w-4 h-4" /> },
        ]}
      />

      {/* WO-O4O-ADMIN-DASHBOARD-LOAD-FAILURE-EMPTY-LIST-AUDIT-AND-FIX-V1:
          목록 조회 실패를 지속 배너로 드러낸다. toast 만으로는 사라진 뒤 빈 표·0 통계와 구분되지 않는다. */}
      {loadError && (
        <div
          role="alert"
          className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          <div>
            <p className="font-semibold">권한 할당 목록을 불러오지 못했습니다.</p>
            <p className="mt-1 break-all">{loadError}</p>
            <p className="mt-1 text-xs text-red-700">
              아래 통계와 표는 마지막으로 조회에 성공한 내용이거나 비어 있을 수 있습니다. 실제 권한 현황과 다를 수
              있으니 다시 시도한 뒤 확인하세요.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="shrink-0 rounded-md bg-red-100 px-3 py-1 font-medium text-red-800 hover:bg-red-200 disabled:opacity-50"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Users" value={stats.users} color="text-gray-900" />
        <StatCard label="Active Users" value={stats.activeUsers} color="text-green-600" />
        <StatCard label="Assignments" value={stats.assignments} color="text-blue-600" />
        <StatCard label="Visible" value={stats.visible} color="text-orange-600" />
      </div>

      {/* FilterBar with facet selects */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <FilterBar
          searchPlaceholder="사용자 / 이메일 / 서비스 / role 검색 — 권한 할당을 찾아 회수합니다"
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            { key: 'service', placeholder: 'All Services', options: getServiceOptions() },
            { key: 'role', placeholder: 'All Roles', options: getRoleOptions() },
            { key: 'status', placeholder: 'All Status', options: STATUS_OPTIONS },
          ]}
          filterValues={facets as unknown as Record<string, string>}
          onFilterChange={(k, v) => setFacets((prev) => ({ ...prev, [k]: v } as Facets))}
        >
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
          >
            <option value="">Bulk Actions</option>
            <option value="revoke">Revoke Role</option>
          </select>
          <button
            onClick={handleBulkAction}
            disabled={selectedKeys.size === 0 || !bulkAction}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Apply ({selectedKeys.size})
          </button>
        </FilterBar>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <BaseTable<AssignmentRow>
          columns={columns}
          data={filteredRows}
          rowKey={(row) => row.key}
          tableId="users-assignments-list"
          reorderable
          persistState
          columnVisibility
          selectable
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          emptyMessage={
            loadError
              ? '목록을 불러오지 못해 표시할 수 없습니다. 위의 [다시 시도]를 눌러 주세요.'
              : '조건에 맞는 권한 할당이 없습니다.'
          }
        />
      </div>
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
