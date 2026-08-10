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

// ─── 서비스 운영자 등록 카탈로그 ───
// 정책: WO-OPERATOR-ROLE-CLEANUP-V1 — 각 서비스 = Admin + Operator만
//       WO-O4O-KPA-CODE-CLEANUP-V1 — kpa-b/kpa-c 제거
// (운영 외 role 은 본 페이지에서 부여하지 않음 — `/users` 페이지에서 관리)
//
// WO-O4O-ADMIN-SERVICE-OPERATOR-REGISTRATION-IDENTITY-V2-V1:
//   - `platform:super_admin` 은 **서비스 운영자 등록 대상이 아니다**(서비스 credential 개념이 없다).
//     플랫폼 계정은 `/settings/admin-accounts` 소관이므로 이 카탈로그에서 제외한다.
//     다만 편집 화면에서는 사용자가 이미 가진 비카탈로그 role 을 **읽기 전용으로 보존**한다
//     (여기서 체크가 풀려 role 이 조용히 사라지는 것을 막는다).
//   - `pharmacy-hub` 는 backend 에 role·scope guard·Membership 이 이미 있었고 이 카탈로그만 비어 있었다.
//     backend 역할은 operator / store_owner / supplier 이며 admin 은 없다.
const ASSIGNABLE_ROLES: Record<string, { value: string; label: string; description: string }[]> = {
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
  'pharmacy-hub': [
    { value: 'pharmacy-hub:operator', label: 'Operator', description: 'Pharmacy-Hub 운영자' },
  ],
};

/** 등록 카탈로그에 존재하는 role 전체 (편집 시 비카탈로그 role 보존 판정용) */
const CATALOG_ROLE_VALUES: ReadonlySet<string> = new Set(
  Object.values(ASSIGNABLE_ROLES).flatMap((rs) => rs.map((r) => r.value)),
);

const REGISTRABLE_SERVICE_KEYS = Object.keys(ASSIGNABLE_ROLES);

/** 등록 대상: 신규 사용자 / 기존 사용자 권한 추가 — 계약이 다르므로 화면에서 먼저 가른다. */
type RegisterMode = 'new' | 'existing';

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
  // WO-O4O-OPERATORS-PAGE-SILENT-NOOP-FIX-V1:
  //   목록 조회 실패를 "0건" 과 구분하기 위한 지속 상태. toast 는 사라지므로 별도로 유지한다.
  const [loadError, setLoadError] = useState<string | null>(null);
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
  // WO-O4O-ADMIN-SERVICE-OPERATOR-REGISTRATION-IDENTITY-V2-V1 — 등록 모달 상태
  const [registerMode, setRegisterMode] = useState<RegisterMode>('new');
  const [targetServiceKey, setTargetServiceKey] = useState<string>(REGISTRABLE_SERVICE_KEYS[0]);
  const [targetRole, setTargetRole] = useState<string>(ASSIGNABLE_ROLES[REGISTRABLE_SERVICE_KEYS[0]][0].value);
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

  /**
   * 운영자 목록 조회.
   *
   * WO-O4O-OPERATORS-PAGE-SILENT-NOOP-FIX-V1
   *   종전에는 실패 시 `setUsers([])` 로 목록을 비워, 표가 emptyMessage
   *   ("조건에 맞는 운영 권한이 없습니다.")를 그대로 보여줬다. 실패 신호는 **사라지는 toast** 뿐이라
   *   운영자가 "권한이 하나도 없다"고 오인할 수 있었다 — 실패를 0건으로 위장한 것이다.
   *
   *   변경:
   *     - 실패를 **지속 상태(loadError)** 로 표면화하고 재시도 버튼을 제공한다.
   *     - 재조회 실패 시 **기존 목록을 비우지 않는다**(마지막으로 성공한 화면을 유지).
   *     - HTTP 200 이지만 `success:false` 이거나 배열이 아닌 응답도 **실패로 판정**한다.
   */
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await authClient.api.get('/admin/users', { params: { limit: 1000 } });

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
        throw new Error('운영자 목록 응답 형식이 올바르지 않습니다.');
      }

      setUsers(raw as AdminUserDto[]);
      setLoadError(null);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        '운영자 목록을 불러오지 못했습니다.';
      setLoadError(msg);
      toast.error(msg);
      // 기존 목록은 유지한다 — 비우면 "권한 0건" 과 구분되지 않는다.
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
    setRegisterMode('new');
    setTargetServiceKey(REGISTRABLE_SERVICE_KEYS[0]);
    setTargetRole(ASSIGNABLE_ROLES[REGISTRABLE_SERVICE_KEYS[0]][0].value);
    setFormErrors({});
    setShowModal(true);
  };

  /** 대상 서비스를 바꾸면 역할도 그 서비스의 첫 역할로 맞춘다(다른 서비스 role 이 남는 것을 막는다). */
  const changeTargetService = (svc: string) => {
    setTargetServiceKey(svc);
    setTargetRole(ASSIGNABLE_ROLES[svc][0].value);
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
    if (!formData.email) errors.email = '이메일을 입력하세요.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = '이메일 형식이 올바르지 않습니다.';

    if (editingUserId) {
      // 편집: 비밀번호는 여기서 다루지 않는다(행별 "서비스 비밀번호 변경" 담당).
      if (!formData.lastName) errors.lastName = '성을 입력하세요.';
      if (!formData.firstName) errors.firstName = '이름을 입력하세요.';
      if (formData.roles.length === 0) errors.roles = '역할을 최소 1개 선택하세요.';
    } else if (registerMode === 'new') {
      // WO-O4O-ADMIN-SERVICE-OPERATOR-REGISTRATION-IDENTITY-V2-V1:
      //   신규 등록의 최초 비밀번호는 **선택한 서비스 credential** 로 저장된다.
      if (!formData.password) errors.password = '신규 등록에는 최초 서비스 비밀번호가 필요합니다.';
      else if (formData.password.length < 8) errors.password = '비밀번호는 최소 8자 이상이어야 합니다.';
      if (!formData.lastName) errors.lastName = '성을 입력하세요.';
      if (!formData.firstName) errors.firstName = '이름을 입력하세요.';
    } else {
      // 기존 사용자 권한 추가: 비밀번호는 **선택** — 해당 서비스 credential 이 없을 때만 쓰인다.
      // 이미 있으면 서버가 KEEP_EXISTING_CREDENTIAL 로 유지하고 덮어쓰지 않는다.
      if (formData.password && formData.password.length < 8) {
        errors.password = '초기 서비스 비밀번호는 최소 8자 이상이어야 합니다.';
      }
    }
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
        toast.success('운영자 정보가 수정되었습니다.');
      } else {
        // WO-O4O-ADMIN-SERVICE-OPERATOR-REGISTRATION-IDENTITY-V2-V1
        //   대상 서비스는 **하나**다. canonical serviceKey 변환은 security-core SSOT 에 위임한다.
        //   서버는 role 에서 파생한 키와 이 serviceKey 가 다르면 SERVICE_KEY_MISMATCH 로 거부한다.
        const canonicalServiceKey = resolveCanonicalServiceKey(targetServiceKey);
        const isNewUser = registerMode === 'new';
        const payload: Record<string, unknown> = {
          email: formData.email,
          roles: [targetRole],
          role: targetRole.split(':')[1] || 'operator',
          serviceKey: canonicalServiceKey,
          isEmailVerified: true,
          isActive: true,
        };
        if (isNewUser) {
          payload.firstName = formData.firstName;
          payload.lastName = formData.lastName;
          payload.name = `${formData.lastName} ${formData.firstName}`.trim();
        }
        // 기존 사용자 경로에서는 비밀번호가 **있을 때만** 보낸다(없는 credential 초기화 용도).
        if (formData.password) payload.password = formData.password;

        const res = await authClient.api.post('/admin/users', payload);
        const credentialPolicy = res?.data?.credentialPolicy;
        const serviceLabel = SERVICES[targetServiceKey as keyof typeof SERVICES]?.label ?? targetServiceKey;
        if (!isNewUser && credentialPolicy === 'KEEP_EXISTING_CREDENTIAL') {
          toast.success(`권한을 추가했습니다. ${serviceLabel} 기존 비밀번호는 그대로 유지됩니다.`);
        } else if (credentialPolicy === 'CREATED') {
          toast.success(`등록 완료 — ${serviceLabel} 로그인 비밀번호가 생성되었습니다.`);
        } else {
          toast.success('등록이 완료되었습니다.');
        }
      }
      closeModal();
      fetchUsers();
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const msg = err?.response?.data?.error || err?.response?.data?.message || '저장에 실패했습니다.';
      // 서버 계약 위반은 원인 필드에 직접 붙여 관리자가 무엇을 고쳐야 하는지 남긴다.
      if (code === 'SERVICE_PASSWORD_REQUIRED' || code === 'SERVICE_PASSWORD_TOO_SHORT') {
        setFormErrors((prev) => ({ ...prev, password: msg }));
      } else if (code === 'MULTI_SERVICE_NOT_ALLOWED' || code === 'SERVICE_KEY_MISMATCH') {
        setFormErrors((prev) => ({ ...prev, roles: msg }));
      }
      toast.error(msg);
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

      {/* WO-O4O-OPERATORS-PAGE-SILENT-NOOP-FIX-V1:
          목록 조회 실패를 지속 배너로 드러낸다. toast 만으로는 사라진 뒤 빈 표와 구분되지 않는다. */}
      {loadError && (
        <div
          role="alert"
          className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          <div>
            <p className="font-semibold">운영자 목록을 불러오지 못했습니다.</p>
            <p className="mt-1 break-all">{loadError}</p>
            <p className="mt-1 text-xs text-red-700">
              아래 표는 마지막으로 조회에 성공한 내용이거나 비어 있을 수 있습니다. 실제 권한 현황과 다를 수 있으니
              다시 시도한 뒤 확인하세요.
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

      {/* DataTable (canonical operator-ux-core) */}
      <DataTable<AssignmentRow>
        columns={columns}
        data={filteredRows}
        rowKey={(row) => row.key}
        tableId="admin-operators-assignments-list"
        loading={loading}
        emptyMessage={
          loadError
            ? '목록을 불러오지 못해 표시할 수 없습니다. 위의 [다시 시도]를 눌러 주세요.'
            : '조건에 맞는 운영 권한이 없습니다.'
        }
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
              <h2 className="text-lg font-semibold">
                {editingUserId ? '운영자 편집' : '서비스 운영자 등록'}
              </h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* 등록 유형 — WO-O4O-ADMIN-SERVICE-OPERATOR-REGISTRATION-IDENTITY-V2-V1
                  두 경로는 계약이 다르다(신규=계정+credential 생성 / 기존=권한 추가, 기존 credential 유지).
                  화면에서 먼저 갈라 관리자가 무엇이 일어나는지 알고 진행하게 한다. */}
              {!editingUserId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">등록 유형</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {([
                      { key: 'new' as const, title: '신규 사용자 등록', desc: '계정을 새로 만들고 선택한 서비스의 로그인 비밀번호를 생성합니다.' },
                      { key: 'existing' as const, title: '기존 사용자에게 권한 추가', desc: '계정은 그대로 두고 선택한 서비스 운영 권한만 추가합니다.' },
                    ]).map((opt) => (
                      <label
                        key={opt.key}
                        className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors ${
                          registerMode === opt.key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="register-mode"
                          checked={registerMode === opt.key}
                          onChange={() => {
                            setRegisterMode(opt.key);
                            setFormErrors({});
                          }}
                          className="mt-0.5 text-blue-600"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{opt.title}</div>
                          <div className="text-xs text-gray-500">{opt.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

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
                    {registerMode === 'new' ? '최초 서비스 비밀번호' : '초기 서비스 비밀번호 (선택)'}{' '}
                    {registerMode === 'new' && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      formErrors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="8자 이상"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    {registerMode === 'new'
                      ? '선택한 서비스의 로그인 비밀번호로 저장됩니다. 다른 서비스 로그인에는 사용되지 않습니다.'
                      : '해당 서비스 비밀번호가 아직 없을 때만 사용됩니다. 이미 있으면 기존 비밀번호를 그대로 유지하며 덮어쓰지 않습니다.'}
                  </p>
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

              {/* Name — 신규 계정 생성에서만 쓰인다(기존 사용자 권한 추가는 이름을 바꾸지 않는다). */}
              <div className={`grid grid-cols-2 gap-3 ${!editingUserId && registerMode === 'existing' ? 'hidden' : ''}`}>
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

              {/* Roles — 등록: 대상 서비스 1개 + 역할 1개
                  WO-O4O-ADMIN-SERVICE-OPERATOR-REGISTRATION-IDENTITY-V2-V1:
                    credential 은 서비스 단위이므로 등록도 서비스 하나로 고정한다.
                    여러 서비스를 한 번에 고르면 어느 credential 을 만드는지 정의되지 않는다
                    (서버도 MULTI_SERVICE_NOT_ALLOWED 로 거부한다). */}
              {!editingUserId ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    대상 서비스 · 역할 <span className="text-red-500">*</span>
                  </label>
                  {formErrors.roles && (
                    <p className="mb-2 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {formErrors.roles}
                    </p>
                  )}
                  <select
                    value={targetServiceKey}
                    onChange={(e) => changeTargetService(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {REGISTRABLE_SERVICE_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {SERVICES[key as keyof typeof SERVICES]?.label ?? key}
                      </option>
                    ))}
                  </select>
                  <div className="mt-1 text-xs text-slate-500">
                    canonical service key: <code>{resolveCanonicalServiceKey(targetServiceKey)}</code>
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {ASSIGNABLE_ROLES[targetServiceKey].map((role) => (
                      <label
                        key={role.value}
                        className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors ${
                          targetRole === role.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="target-role"
                          checked={targetRole === role.value}
                          onChange={() => setTargetRole(role.value)}
                          className="mt-0.5 text-blue-600"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{role.label}</div>
                          <div className="text-xs text-gray-500">{role.description}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5 font-mono">{role.value}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    플랫폼 계정(<code>platform:super_admin</code>)은 서비스 운영자 등록 대상이 아닙니다 —
                    <b> 설정 &gt; 관리자 계정</b> 화면에서 관리합니다.
                  </p>
                </div>
              ) : (
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
                {/* 카탈로그 밖 role(예: platform:super_admin, user)은 이 화면이 다루지 않는다.
                    체크박스에 없다고 해서 저장 시 사라지면 안 되므로 읽기 전용으로 보존·표시한다. */}
                {formData.roles.filter((r) => !CATALOG_ROLE_VALUES.has(r)).length > 0 && (
                  <div className="mb-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                    <div className="text-xs font-semibold text-slate-500 mb-1">이 화면에서 변경하지 않는 권한 (유지됨)</div>
                    <div className="flex flex-wrap gap-1">
                      {formData.roles
                        .filter((r) => !CATALOG_ROLE_VALUES.has(r))
                        .map((r) => (
                          <span key={r} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-700">
                            {r}
                          </span>
                        ))}
                    </div>
                  </div>
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
              )}

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
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {editingUserId ? '운영자 수정' : registerMode === 'new' ? '신규 운영자 등록' : '권한 추가'}
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
