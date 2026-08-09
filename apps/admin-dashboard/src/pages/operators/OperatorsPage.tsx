/**
 * OperatorsPage — Assignment-Row Canonical (operator-ux-core DataTable)
 *
 * WO-O4O-ADMIN-ASSIGNMENT-ROW-LIST-CANONICALIZATION-V1 (assignment-row data model)
 * WO-O4O-ADMIN-OPERATORS-ROWACTION-EDIT-RESTORE-V1 (canonical DataTable + ActionBar
 *   + BulkResultModal + BaseDetailDrawer 복구, RowActionMenu Edit + Revoke 유지)
 *
 * 구조:
 * - 행 단위: 1 role_assignment (assignment-row, multi-role 자동 펼침)
 * - DataTable: @o4o/operator-ux-core (selectable, onRowClick → detail drawer)
 * - Bulk Action: ActionBar — 선택된 assignment row 의 role 만 해제 (per-assignment),
 *                platform:super_admin 은 자동 skip, useBatchAction + BulkResultModal
 * - Row Action: RowActionMenu — 편집 / 권한 해제
 * - Row Click:  BaseDetailDrawer — 사용자 + 이 assignment 상세 (조회 전용)
 * - facet 필터: Service / Role (operator role 만)
 *
 * 자매: docs/investigations/IR-O4O-ADMIN-ROLE-LIST-SERVICE-CENTRIC-UX-AUDIT-V1.md
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, RefreshCw, Shield, Users, X, Check, AlertCircle, UserX } from 'lucide-react';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { ActionBar, BulkResultModal, RowActionMenu, FilterBar, BaseDetailDrawer } from '@o4o/ui';
import type { ActionBarAction } from '@o4o/ui';
import { DataTable, useBatchAction } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import PageHeader from '@/components/common/PageHeader';
import {
  flattenUsersToAssignments,
  type AdminUserDto,
  type AssignmentRow,
} from '@/lib/assignment-row';
import {
  SERVICES,
  getRoleOptions,
  getServiceOptions,
  isOperatorRole,
  parseRole,
} from '@/lib/rbac-catalog';
// WO-O4O-ADMIN-OPERATORS-SERVICE-PASSWORD-WRITE-CONTRACT-FIX-V1:
//   role prefix → canonical service_key 변환 SSOT. 로컬 매핑 상수를 만들지 않는다.
//   security-core 는 전 파일이 `import type` 뿐이라 런타임 의존이 없다(브라우저 안전).
import { resolveCanonicalServiceKey } from '@o4o/security-core';

// ─── Create/Edit 모달용 — 운영 역할 카탈로그 ───
// 정책: WO-OPERATOR-ROLE-CLEANUP-V1 — Super Admin = 전체 접근, 각 서비스 = Admin + Operator만
//       WO-O4O-KPA-CODE-CLEANUP-V1 — kpa-b/kpa-c 제거
// (운영 외 role 은 본 페이지에서 부여하지 않음 — `/users` 페이지에서 관리)
const ASSIGNABLE_ROLES: Record<string, { value: string; label: string; description: string }[]> = {
  platform: [
    { value: 'platform:super_admin', label: 'Super Admin', description: '모든 서비스 접근 가능' },
  ],
  kpa: [
    { value: 'kpa:admin', label: 'Admin', description: 'KPA 커뮤니티 관리자' },
    { value: 'kpa:operator', label: 'Operator', description: 'KPA 커뮤니티 운영자' },
  ],
  neture: [
    { value: 'neture:admin', label: 'Admin', description: 'Neture 관리자' },
    { value: 'neture:operator', label: 'Operator', description: 'Neture 운영자' },
  ],
  glycopharm: [
    { value: 'glycopharm:admin', label: 'Admin', description: 'GlycoPharm 관리자' },
    { value: 'glycopharm:operator', label: 'Operator', description: 'GlycoPharm 운영자' },
  ],
  cosmetics: [
    { value: 'cosmetics:admin', label: 'Admin', description: 'K-Cosmetics 관리자' },
    { value: 'cosmetics:operator', label: 'Operator', description: 'K-Cosmetics 운영자' },
  ],
  // platform 은 super_admin role 할당을 위해 잔존.
};

interface Facets {
  service: string;
  role: string;
}
const EMPTY_FACETS: Facets = { service: '', role: '' };

interface UserFormState {
  email: string;
  password: string;
  lastName: string;
  firstName: string;
  roles: string[];
}

export default function OperatorsPage() {
  const [users, setUsers] = useState<AdminUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [facets, setFacets] = useState<Facets>(EMPTY_FACETS);

  // WO-O4O-ADMIN-OPERATORS-ROWACTION-EDIT-RESTORE-V1 — canonical selection / bulk / drawer
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailTarget, setDetailTarget] = useState<AssignmentRow | null>(null);
  const batch = useBatchAction();

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserFormState>({ email: '', password: '', lastName: '', firstName: '', roles: [] });
  // 서비스 비밀번호 변경 모달 — 대상 행(서비스 고정)
  const [pwTarget, setPwTarget] = useState<AssignmentRow | null>(null);
  const [pwValue, setPwValue] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await authClient.api.get('/admin/users', { params: { limit: 1000 } });
      const raw =
        response.data?.users ||
        response.data?.data?.users ||
        response.data?.data ||
        response.data ||
        [];
      setUsers(Array.isArray(raw) ? (raw as AdminUserDto[]) : []);
    } catch {
      toast.error('Failed to load operators');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // assignment-row flatMap + operator-only preset filter
  const allRows = useMemo<AssignmentRow[]>(
    () => flattenUsersToAssignments(users).filter((row) => isOperatorRole(row.role)),
    [users],
  );

  const filteredRows = useMemo<AssignmentRow[]>(() => {
    return allRows.filter((row) => {
      if (facets.service && row.parsedRole.serviceKey !== facets.service) return false;
      if (facets.role && row.parsedRole.roleKey !== facets.role) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay =
          row.userName + ' ' + row.userEmail + ' ' + row.role + ' ' + row.service.label + ' ' + row.roleMeta.label;
        if (!hay.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allRows, facets, search]);

  // 통계 — assignment 단위 + unique users
  // WO-O4O-ADMIN-OPERATORS-REDUNDANT-ACTIVE-KPI-REMOVE-V1:
  //   activeUsers 집계 제거 — 운영자는 사실상 active 만 다루므로 Total 과 중복 정보.
  //   row 단위 active 표시는 status 컬럼이 계속 담당.
  const stats = useMemo(() => {
    const uniqueUsers = new Set(allRows.map((r) => r.userId));
    const adminCount = allRows.filter((r) => r.parsedRole.roleKey === 'admin' || r.parsedRole.roleKey === 'super_admin').length;
    const operatorCount = allRows.filter((r) => r.parsedRole.roleKey === 'operator').length;
    return {
      users: uniqueUsers.size,
      admins: adminCount,
      operators: operatorCount,
    };
  }, [allRows]);

  // ─── Create / Edit 모달 ───
  const openCreateModal = () => {
    setEditingUserId(null);
    setFormData({ email: '', password: '', lastName: '', firstName: '', roles: [] });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (row: AssignmentRow) => {
    setEditingUserId(row.userId);
    setFormData({
      email: row.userEmail,
      password: '',
      lastName: row.user.lastName ?? '',
      firstName: row.user.firstName ?? '',
      roles: row.userAllRoles,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUserId(null);
    setFormData({ email: '', password: '', lastName: '', firstName: '', roles: [] });
    setFormErrors({});
  };

  // ─── 서비스 비밀번호 변경 (WO-O4O-ADMIN-OPERATORS-SERVICE-PASSWORD-WRITE-CONTRACT-FIX-V1) ───
  //   대상은 클릭한 행의 서비스 하나로 고정한다. 한 번의 조작으로 하나의 credential 만 바꾼다.
  const openServicePasswordModal = (row: AssignmentRow) => {
    setPwTarget(row);
    setPwValue('');
    setPwError('');
  };

  const closeServicePasswordModal = () => {
    setPwTarget(null);
    setPwValue('');
    setPwError('');
  };

  const submitServicePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwTarget) return;
    if (pwValue.length < 8) {
      setPwError('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }
    // role prefix('kpa','cosmetics') ≠ canonical service_key('kpa-society','k-cosmetics').
    // 변환은 @o4o/security-core SSOT 에 위임한다 — 로컬 중복 매핑을 만들지 않는다.
    const serviceKey = resolveCanonicalServiceKey(pwTarget.service.key);
    setPwSubmitting(true);
    setPwError('');
    try {
      // B6 계약 재사용: 서버가 serviceKey 의 service_credentials 한 건만 갱신한다.
      //   users.password 와 다른 서비스 credential 은 건드리지 않는다.
      await authClient.api.put(`/operator/members/${pwTarget.userId}`, {
        password: pwValue,
        serviceKey,
      });
      // 성공 표시는 실제 credential 변경이 완료된 뒤에만 한다.
      toast.success(`${pwTarget.service.label} 비밀번호가 변경되었습니다.`);
      closeServicePasswordModal();
    } catch (err: any) {
      setPwError(
        err?.response?.data?.error || err?.message || '비밀번호 변경에 실패했습니다.',
      );
    } finally {
      setPwSubmitting(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.email) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email format';
    // WO-O4O-ADMIN-OPERATORS-SERVICE-PASSWORD-WRITE-CONTRACT-FIX-V1:
    //   비밀번호는 신규 생성에서만 입력받는다(편집 경로에서 제거).
    if (!editingUserId) {
      if (!formData.password) errors.password = 'Password is required for new operator';
      else if (formData.password.length < 8) errors.password = 'Password must be at least 8 characters';
    }
    if (!formData.lastName) errors.lastName = 'Last name is required';
    if (!formData.firstName) errors.firstName = 'First name is required';
    if (formData.roles.length === 0) errors.roles = 'At least one role is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      if (editingUserId) {
        const data: any = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          name: `${formData.lastName} ${formData.firstName}`.trim(),
          roles: formData.roles,
        };
        // WO-O4O-ADMIN-OPERATORS-SERVICE-PASSWORD-WRITE-CONTRACT-FIX-V1:
        //   password 를 보내지 않는다. 서버도 400(PASSWORD_NOT_ALLOWED_HERE)으로 거부한다.
        //   서비스 비밀번호는 행별 "서비스 비밀번호 변경" 액션이 담당한다.
        await authClient.api.put(`/admin/users/${editingUserId}`, data);
        toast.success('Operator updated successfully');
      } else {
        await authClient.api.post('/admin/users', {
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          name: `${formData.lastName} ${formData.firstName}`.trim(),
          roles: formData.roles,
          role: formData.roles[0]?.split(':')[1] || 'operator',
          isEmailVerified: true,
          isActive: true,
        });
        toast.success('Operator created successfully');
      }
      closeModal();
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to save operator');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRole = (role: string) => {
    setFormData((prev) => ({
      ...prev,
      roles: prev.roles.includes(role) ? prev.roles.filter((r) => r !== role) : [...prev.roles, role],
    }));
  };

  // ─── 권한 해제 (단일 assignment) ───
  // WO-O4O-ADMIN-OPERATOR-ROLE-REVOKE-AND-SUPERADMIN-GUARD-V1
  const handleRevokeRole = async (row: AssignmentRow) => {
    if (row.role === 'platform:super_admin') {
      toast.error('슈퍼관리자 역할은 이 화면에서 해제할 수 없습니다.');
      return;
    }
    if (!confirm(`"${row.userName}" (${row.userEmail})의 권한 "${row.service.label}: ${row.roleMeta.label}"을 해제하시겠습니까?\n\n※ 계정은 유지됩니다.`)) {
      return;
    }
    try {
      await authClient.api.delete(`/admin/users/${row.userId}/role-assignments/${encodeURIComponent(row.role)}`);
      toast.success('권한이 해제되었습니다.');
      fetchUsers();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || '권한 해제 실패';
      toast.error(msg);
    }
  };

  // WO-O4O-ADMIN-OPERATORS-ROWACTION-EDIT-RESTORE-V1
  // Bulk role revoke (per-assignment) — selectedIds 각 assignment key 단위로 해제.
  // platform:super_admin 은 'skipped' 처리 (보호 정책 유지).
  // useBatchAction 호환 응답: { data: { results: [{ id, status, error? }] } }
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

  const handleBulkRevoke = useCallback(async () => {
    if (selectedIds.size === 0) return;
    await batch.executeBatch(bulkRevokeRoles, Array.from(selectedIds));
    // selection 은 BulkResultModal 닫을 때 일괄 정리 + refetch
  }, [batch, bulkRevokeRoles, selectedIds]);

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
        <div>
          <div className="text-sm font-medium text-gray-900">{row.userName}</div>
          <div className="text-xs text-gray-500">{row.userEmail}</div>
        </div>
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
      header: 'Created',
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
            { key: 'edit', label: '편집', variant: 'primary', onClick: () => openEditModal(row) },
            // WO-O4O-ADMIN-OPERATORS-SERVICE-PASSWORD-WRITE-CONTRACT-FIX-V1:
            //   비밀번호는 서비스별로 독립하므로 **이 행의 서비스** 를 대상으로 고정한다.
            //   platform 행은 서비스 credential 개념이 없어 액션을 제공하지 않는다
            //   (플랫폼 계정 비밀번호는 플랫폼 계정 관리 화면이 담당).
            ...(row.service.key === 'platform'
              ? []
              : [{
                  key: 'service-password',
                  label: `서비스 비밀번호 변경 (${row.service.label})`,
                  onClick: () => openServicePasswordModal(row),
                }]),
            { key: 'revoke', label: `권한 해제 (${row.roleMeta.label})`, variant: 'danger', onClick: () => handleRevokeRole(row) },
          ]}
        />
      ),
    },
  ];

  // Role facet 옵션 — 운영 권한만 노출 (admin/operator/super_admin/branch_*)
  const operatorRoleOptions = getRoleOptions().filter((o) => isOperatorRole(o.value));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <PageHeader
        title="Operators Management"
        subtitle="운영 권한(Admin / Operator) 할당 단위 — RBAC SSOT"
        backUrl="/"
        backLabel="Dashboard"
        actions={[
          { id: 'add', label: 'Add Operator', onClick: openCreateModal, variant: 'primary', icon: <Plus className="w-4 h-4" /> },
          { id: 'refresh', label: 'Refresh', onClick: fetchUsers, variant: 'secondary', icon: <RefreshCw className="w-4 h-4" /> },
        ]}
      />

      {/* Stats — WO-O4O-ADMIN-OPERATORS-REDUNDANT-ACTIVE-KPI-REMOVE-V1: Active KPI 제거 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <StatCard label="Operators" value={stats.users} color="text-gray-900" Icon={Users} />
        <StatCard label="Admin Roles" value={stats.admins} color="text-orange-600" Icon={Shield} />
        <StatCard label="Operator Roles" value={stats.operators} color="text-blue-600" Icon={Shield} />
      </div>

      {/* FilterBar */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <FilterBar
          searchPlaceholder="이름, 이메일, 서비스, 역할 검색..."
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            { key: 'service', placeholder: 'All Services', options: getServiceOptions() },
            { key: 'role', placeholder: 'All Operator Roles', options: operatorRoleOptions },
          ]}
          filterValues={facets as unknown as Record<string, string>}
          onFilterChange={(k, v) => setFacets((prev) => ({ ...prev, [k]: v } as Facets))}
        />
      </div>

      {/* WO-O4O-ADMIN-OPERATORS-ROWACTION-EDIT-RESTORE-V1: ActionBar (선택 시 노출) */}
      {selectedIds.size > 0 && (
        <div className="mb-3">
          <ActionBar
            selectedCount={selectedIds.size}
            onClearSelection={() => setSelectedIds(new Set())}
            actions={[
              {
                key: 'bulk-revoke',
                label: `권한 해제 (${selectedIds.size})`,
                variant: 'danger',
                icon: <UserX className="w-4 h-4" />,
                onClick: handleBulkRevoke,
                loading: batch.loading,
                tooltip: '선택된 assignment 의 role 만 해제합니다 (super_admin 자동 skip, 계정 유지)',
                confirm: {
                  title: '권한 일괄 해제',
                  message: `선택한 ${selectedIds.size}개 권한을 해제하시겠습니까?\n\nplatform:super_admin 은 자동으로 건너뜁니다.\n계정은 유지되며 role_assignments 만 비활성화됩니다.`,
                  variant: 'danger',
                  confirmText: '권한 해제',
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
        tableId="admin-operators-assignments-list"
        loading={loading}
        emptyMessage="조건에 맞는 운영 권한이 없습니다."
        selectable
        selectedKeys={selectedIds}
        onSelectionChange={setSelectedIds}
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
          setSelectedIds(new Set());
          fetchUsers();
        }}
        result={batch.result}
        onRetry={() => {
          batch.retryFailed();
        }}
        title="운영자 권한 해제 결과"
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
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${detailTarget.service.badgeClass}`}>
                  {detailTarget.service.label}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${detailTarget.roleMeta.badgeClass}`}>
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
          </div>
        )}
      </BaseDetailDrawer>

      {/* 서비스 비밀번호 변경 Modal
          WO-O4O-ADMIN-OPERATORS-SERVICE-PASSWORD-WRITE-CONTRACT-FIX-V1
          대상 서비스는 클릭한 행으로 **고정**된다. 화면에 canonical serviceKey 와
          사람이 읽는 서비스명을 함께 표시해 어느 로그인 비밀번호가 바뀌는지 분명히 한다. */}
      {pwTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">서비스 비밀번호 변경</h2>
              <button onClick={closeServicePasswordModal} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submitServicePassword} className="p-4 space-y-4">
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm">
                <div>
                  <span className="text-slate-500">대상 회원</span>
                  <span className="ml-2 font-medium text-slate-800">
                    {pwTarget.userName} ({pwTarget.userEmail})
                  </span>
                </div>
                <div className="mt-1">
                  <span className="text-slate-500">대상 서비스</span>
                  <span className="ml-2 font-semibold text-slate-800">{pwTarget.service.label}</span>
                  <code className="ml-2 text-xs text-slate-500">
                    {resolveCanonicalServiceKey(pwTarget.service.key)}
                  </code>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  이 서비스의 로그인 비밀번호만 변경됩니다. 다른 서비스와 플랫폼 로그인은 영향받지 않습니다.
                </p>
              </div>

              {pwError && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{pwError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  새 비밀번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={pwValue}
                  onChange={(e) => setPwValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="8자 이상"
                  minLength={8}
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeServicePasswordModal}
                  className="flex-1 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={pwSubmitting || pwValue.length < 8}
                  className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {pwSubmitting ? '변경 중...' : '변경'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{editingUserId ? 'Edit Operator' : 'Add New Operator'}</h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!editingUserId}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    formErrors.email ? 'border-red-500' : 'border-gray-300'
                  } ${editingUserId ? 'bg-gray-100' : ''}`}
                  placeholder="operator@example.com"
                />
                {formErrors.email && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {formErrors.email}
                  </p>
                )}
              </div>

              {/* Password — 신규 생성에서만 입력받는다.
                  WO-O4O-ADMIN-OPERATORS-SERVICE-PASSWORD-WRITE-CONTRACT-FIX-V1:
                    비밀번호는 서비스별로 독립하므로(Identity V2) "이 사람의 비밀번호" 라는
                    사용자 단위 개념이 성립하지 않는다. 편집에서는 제거하고
                    행별 "서비스 비밀번호 변경" 액션으로 분리했다. */}
              {!editingUserId ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      formErrors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="••••••••"
                  />
                  {formErrors.password && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {formErrors.password}
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-600">
                  비밀번호는 여기서 변경하지 않습니다. 목록에서 해당 <b>서비스 행</b>의
                  <b> “서비스 비밀번호 변경”</b> 을 사용하세요 — 서비스마다 비밀번호가 독립적입니다.
                </div>
              )}

              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                {(['lastName', 'firstName'] as const).map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field === 'lastName' ? '성 (Last Name)' : '이름 (First Name)'}{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData[field]}
                      onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors[field] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder={field === 'lastName' ? '홍' : '길동'}
                    />
                    {formErrors[field] && (
                      <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {formErrors[field]}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Roles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Roles <span className="text-red-500">*</span>
                </label>
                {formErrors.roles && (
                  <p className="mb-2 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {formErrors.roles}
                  </p>
                )}
                <div className="space-y-4 max-h-80 overflow-y-auto border rounded-lg p-3">
                  {Object.entries(ASSIGNABLE_ROLES).map(([serviceKey, roles]) => {
                    const meta = SERVICES[serviceKey as keyof typeof SERVICES];
                    return (
                      <div key={serviceKey} className="border-b pb-3 last:border-0 last:pb-0">
                        <h4 className="text-sm font-medium text-gray-700 mb-2 uppercase">
                          {meta?.label ?? serviceKey}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {roles.map((role) => {
                            const parsed = parseRole(role.value);
                            const selected = formData.roles.includes(role.value);
                            return (
                              <label
                                key={role.value}
                                className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors ${
                                  selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => toggleRole(role.value)}
                                  className="mt-0.5 rounded border-gray-300 text-blue-600"
                                />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{role.label}</div>
                                  <div className="text-xs text-gray-500">{role.description}</div>
                                  <div className="text-[10px] text-gray-400 mt-0.5 font-mono">{parsed.raw}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {editingUserId ? 'Update Operator' : 'Create Operator'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  Icon,
}: {
  label: string;
  value: number;
  color: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-2xl font-bold ${color}`}>{value}</div>
          <div className="text-sm text-gray-500">{label}</div>
        </div>
        <Icon className={`w-5 h-5 ${color} opacity-50`} />
      </div>
    </div>
  );
}
