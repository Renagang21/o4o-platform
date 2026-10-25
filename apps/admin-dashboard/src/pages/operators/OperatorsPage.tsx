import UsersListClean from '../users/UsersListClean';
import BusinessOperatorAssignments from './BusinessOperatorAssignments';
/**
 * OperatorsPage — Assignment-Row Canonical (operator-ux-core DataTable)
 *
 * WO-O4O-ADMIN-ASSIGNMENT-ROW-LIST-CANONICALIZATION-V1 (assignment-row data model)
 * WO-O4O-ADMIN-OPERATORS-ROWACTION-EDIT-RESTORE-V1 (canonical DataTable + ActionBar
 *   + BulkResultModal + BaseDetailDrawer, RowActionMenu Edit + Revoke)
 * WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §1·§15·§17
 *   운영자 onboarding은 이메일 초대·확인 수락을 사용한다. **관리자는 더 이상 타인의
 *   비밀번호를 만들거나 재설정하지 않는다.** 이 화면에서 사라진 것:
 *     - 등록 폼의 비밀번호 입력 · 초기 서비스 비밀번호 · 비밀번호 정책 검증
 *     - 행 액션 "서비스 비밀번호 변경" 모달
 *     - `POST /admin/users` 를 통한 신규 계정 생성
 *   운영자 지정은 기존 사용자 선택 또는 미가입 이메일 초대 → 메일 확인·수락을 거친다.
 *   기존 지정자는 권한을 유지하며 같은 화면에서 확인 메일을 받는다.
 *
 * 구조:
 * - 목록: 운영 권한(assignment row) 단일
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
import { Plus, RefreshCw, Shield, Users, X, Check, AlertCircle, UserX, Search } from 'lucide-react';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { ActionBar, BulkResultModal, RowActionMenu, FilterBar, BaseDetailDrawer } from '@o4o/ui';
import type { ActionBarAction } from '@o4o/ui';
import { DataTable, useBatchAction } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import PageHeader from '@/components/common/PageHeader';
import OperatorInvitationsPanel, { type Invite } from './OperatorInvitationsPanel';
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
// WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §17:
//   `@/lib/password-policy` import 를 제거했다. 이 화면에는 비밀번호 입력 자체가 없다.
import {
  ASSIGNABLE_ROLES,
  CATALOG_ROLE_VALUES,
  REGISTRABLE_SERVICE_KEYS,
} from '@/lib/operator-role-catalog';
import { Link } from 'react-router-dom';
import {
  parseBusinessLedgerResponse,
  registerPresetPath,
  resolveBusinessLedgerStatus,
  type BusinessLedgerState,
  type BusinessLedgerStatus,
} from '@/lib/business-ledger';

const LEDGER_BADGE: Record<Exclude<BusinessLedgerStatus, 'not_applicable'>, { label: string; className: string }> = {
  loading: { label: '확인 중', className: 'bg-gray-100 text-gray-500' },
  error: { label: '조회 실패', className: 'bg-amber-100 text-amber-800' },
  unregistered: { label: '사업 미등록', className: 'bg-red-100 text-red-700' },
  active: { label: '사업 운영', className: 'bg-green-100 text-green-800' },
  closed: { label: '사업 마감', className: 'bg-gray-200 text-gray-700' },
};

/** 역할 행의 사업 원장 상태. 사업 한정 역할(pharmacy · carepharm · megapharm)이 아니면 '-'. */
function BusinessLedgerCell({ serviceKey, ledger }: { serviceKey: string; ledger: BusinessLedgerState }) {
  const status = resolveBusinessLedgerStatus(serviceKey, ledger);
  if (status === 'not_applicable') return <span className="text-xs text-gray-400">-</span>;
  const badge = LEDGER_BADGE[status];
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span
        className={`px-2 py-0.5 rounded text-xs font-medium ${badge.className}`}
        title={status === 'error' && ledger.status === 'error' ? ledger.message : undefined}
      >
        {badge.label}
      </span>
      {status === 'unregistered' && (
        <Link
          to={registerPresetPath(serviceKey)}
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-blue-600 underline"
        >
          사업 등록
        </Link>
      )}
    </span>
  );
}


/**
 * WO-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1: 신규 권한은 초대와 본인 수락 뒤 활성화한다.
 *   기존 계정은 ID로 선택하고 미가입자는 이메일로 초대한다.
 */

/** 초대 후보 — Google 연결 여부는 참고 정보이며 서비스 운영자 초대를 제한하지 않는다. */
interface OperatorCandidate {
  userId: string;
  email: string;
  name: string | null;
  hasGoogleLink: boolean;
}

interface Facets {
  service: string;
  role: string;
}
const EMPTY_FACETS: Facets = { service: '', role: '' };

/** 편집 전용 폼 — 비밀번호 필드는 존재하지 않는다 (§17). */
interface UserFormState {
  email: string;
  lastName: string;
  firstName: string;
  roles: string[];
}

export default function OperatorsPage() {
  const [showLegacy, setShowLegacy] = useState(false);
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
  const [formData, setFormData] = useState<UserFormState>({ email: '', lastName: '', firstName: '', roles: [] });
  // 대상 서비스는 **기본값 없이 시작**한다. 첫 서비스를 자동 확정하면 관리자가 고르지 않은 서비스로
  // 등록이 나가고(과거 KPA 고정 결함), 화면 표시와 실제 serviceKey 가 어긋날 수 있다.
  const [targetServiceKey, setTargetServiceKey] = useState<string>('');
  const [targetRole, setTargetRole] = useState<string>('');
  // (A) 지정 경로 — 사람을 **검색해서 고른다**. 이메일을 타이핑해 넣지 않는다(email ≠ Identity Key).
  const [candidateQuery, setCandidateQuery] = useState('');
  const [candidates, setCandidates] = useState<OperatorCandidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<OperatorCandidate | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [invitations, setInvitations] = useState<Invite[] | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitationVersion, setInvitationVersion] = useState(0);
  const [assignmentNotice, setAssignmentNotice] = useState<string | null>(null);

  // 사업 원장(semi_franchises) — 계정 상태와 별개. 실패는 '미등록'과 구분해 보여준다.
  const [businessLedger, setBusinessLedger] = useState<BusinessLedgerState>({ status: 'loading' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchBusinessLedger = async () => {
    setBusinessLedger({ status: 'loading' });
    try {
      const response = await authClient.api.get('/neture/admin/semi-franchises');
      setBusinessLedger({ status: 'ok', byKey: parseBusinessLedgerResponse(response.data) });
    } catch (err: any) {
      setBusinessLedger({
        status: 'error',
        message: err?.response?.data?.error || err?.message || '사업 원장을 조회하지 못했습니다.',
      });
    }
  };

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
    void fetchBusinessLedger();
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
    () => flattenUsersToAssignments(users).filter((row) => isOperatorRole(row.role) && row.parsedRole.serviceKey !== 'platform'),
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
    setFormData({ email: '', lastName: '', firstName: '', roles: [] });
    setTargetServiceKey('');
    setTargetRole('');
    setCandidateQuery('');
    setCandidates([]);
    setSelectedCandidate(null);
    setInviteEmail('');
    setFormErrors({});
    setShowModal(true);
  };

  /**
   * 대상 서비스 변경 — 역할 선택은 **항상 초기화**한다.
   * 자동으로 첫 역할을 채우지 않는다(관리자가 보지 않은 역할이 확정되는 것을 막는다).
   * 다른 서비스의 role 이 남아 표시 서비스와 실제 role 이 어긋나는 것도 함께 막는다.
   */
  const changeTargetService = (svc: string) => {
    setTargetServiceKey(svc);
    setTargetRole('');
    setFormErrors((prev) => ({ ...prev, targetService: '', roles: '' }));
  };

  const openEditModal = (row: AssignmentRow) => {
    setEditingUserId(row.userId);
    setFormData({
      email: row.userEmail,
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
    setFormData({ email: '', lastName: '', firstName: '', roles: [] });
    setSelectedCandidate(null);
    setInviteEmail('');
    setCandidates([]);
    setCandidateQuery('');
    setFormErrors({});
  };

  /**
   * 지정 후보 검색 (§5).
   * 관리자는 사람을 **고른다** — 고른 결과는 언제나 userId 로 전송된다.
   * Google 연결이 없는 사용자도 숨기지 않고 사유와 함께 보여준다(검색해도 안 나오는 이유를 없앤다).
   */
  const searchCandidates = async () => {
    const q = candidateQuery.trim();
    if (q.length < 2) {
      setFormErrors((prev) => ({ ...prev, candidate: '두 글자 이상 입력하세요.' }));
      return;
    }
    setCandidatesLoading(true);
    setFormErrors((prev) => ({ ...prev, candidate: '' }));
    try {
      const res = await authClient.api.get('/admin/operator-assignments/candidates', { params: { q } });
      // WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 Smoke A (2026-09-25):
      //   백엔드 계약은 `{ success, data: { candidates: [...] } }` 인데 여기서는 `data` 를 배열로
      //   기대해 `Array.isArray` 에서 통째로 버려졌다 — 후보가 몇 명이든 화면은 늘 "결과 없음" 이었고
      //   직접 지정 경로가 구조적으로 막혀 있었다. 계약대로 `data.candidates` 를 읽는다.
      //   (과거 응답 형태를 쓰는 배포가 남아 있을 수 있어 배열 형태도 함께 허용한다.)
      const payload = res.data?.data;
      const raw = Array.isArray(payload) ? payload : (payload?.candidates ?? []);
      setCandidates(Array.isArray(raw) ? (raw as OperatorCandidate[]) : []);
    } catch (err: any) {
      setFormErrors((prev) => ({
        ...prev,
        candidate: err?.response?.data?.error || err?.message || '검색에 실패했습니다.',
      }));
      setCandidates([]);
    } finally {
      setCandidatesLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (editingUserId) {
      // 편집: 이름·역할만 다룬다. 비밀번호는 이 화면 어디에도 없다.
      if (!formData.lastName) errors.lastName = '성을 입력하세요.';
      if (!formData.firstName) errors.firstName = '이름을 입력하세요.';
      if (formData.roles.length === 0) errors.roles = '역할을 최소 1개 선택하세요.';
      setFormErrors(errors);
      return Object.keys(errors).length === 0;
    }

    // ── 등록 — 대상 서비스와 역할은 **명시 선택**이어야 한다 ──
    if (!targetServiceKey) errors.targetService = '대상 서비스를 선택하세요.';
    else if (!targetRole) errors.roles = '역할을 선택하세요.';

    if (!selectedCandidate && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) {
      errors.candidate = '기존 사용자를 선택하거나 미가입자의 초대 이메일을 입력하세요.';
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
        // 편집은 이름·역할만 보낸다. password 를 보내지 않으며 서버도 PASSWORD_NOT_ALLOWED_HERE 로 거부한다.
        await authClient.api.put(`/admin/users/${editingUserId}`, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          name: `${formData.lastName} ${formData.firstName}`.trim(),

        });
        toast.success('운영자 정보가 수정되었습니다.');
        closeModal();
        fetchUsers();
        return;
      }

      // 선택이 비어 있으면 요청 자체를 만들지 않는다(validateForm 이 이미 막지만 계약을 코드로 고정한다).
      if (!targetServiceKey || !targetRole) {
        setSubmitting(false);
        return;
      }
      // role prefix('kpa','cosmetics') ≠ canonical service_key('kpa-society','k-cosmetics').
      // 변환은 @o4o/security-core SSOT 에 위임한다 — 로컬 중복 매핑을 만들지 않는다.
      const canonicalServiceKey = resolveCanonicalServiceKey(targetRole.split(':')[0]);
      const serviceLabel = SERVICES[targetServiceKey as keyof typeof SERVICES]?.label ?? targetServiceKey;

      await authClient.api.post('/admin/service-operator-invitations', {
        ...(selectedCandidate ? { targetUserId: selectedCandidate.userId } : { email: inviteEmail.trim() }),
        serviceKey: canonicalServiceKey, role: targetRole,
      });
      setAssignmentNotice(`${serviceLabel} 운영자 확인 메일을 보냈습니다. 대상자의 로그인·이메일 확인·수락 후 새 권한이 부여됩니다. 기존 서비스 가입 상태는 유지됩니다.`);
      toast.success('운영자 확인 메일을 보냈습니다.');
      setInvitationVersion(v => v + 1);
      closeModal();
      fetchUsers();
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const msg = err?.response?.data?.error || err?.response?.data?.message || '저장에 실패했습니다.';
      // 서버 계약 위반은 원인 필드에 직접 붙여 관리자가 무엇을 고쳐야 하는지 남긴다.
      if (code === 'ROLE_NOT_ASSIGNABLE' || code === 'SERVICE_KEY_MISMATCH' || code === 'SERVICE_KEY_REQUIRED') {
        setFormErrors((prev) => ({ ...prev, roles: msg }));
      } else if (code === 'USER_NOT_FOUND' || code === 'GOOGLE_LINK_REQUIRED') {
        setFormErrors((prev) => ({ ...prev, candidate: msg }));
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
      key: 'emailConfirmation', header: '이메일 확인', width: '130px',
      render: (_, row) => {
        if (!CATALOG_ROLE_VALUES.has(row.role)) return <span>대상 아님</span>;
        if (!invitations) return <span>확인 상태 미조회</span>;
        const invite = invitations.find(i => (i.target_user_id === row.userId || i.accepted_user_id === row.userId) && i.role === row.role);
        return <span>{!invite ? '기존 권한 유지' : invite.status === 'accepted' ? '확인 완료' : invite.status === 'cancelled' ? '확인 취소' : invite.expired ? '확인 만료' : '확인 대기'}</span>;
      },
    },
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
      // 사용자 계정 상태(users.status). 역할 유효성 · 사업 개설과는 별개 — 사업은 다음 열.
      key: 'status',
      header: '계정 상태',
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
      key: 'businessLedger',
      header: '사업 원장',
      width: '150px',
      render: (_, row) => <BusinessLedgerCell serviceKey={row.parsedRole.serviceKey} ledger={businessLedger} />,
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
            // WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §17:
            //   "서비스 비밀번호 변경" 액션을 제거했다. 운영자는 본인 계정으로 로그인하며
            //   관리자가 타인의 비밀번호를 만들거나 재설정하는 경로는 존재하지 않는다.
            { key: 'revoke', label: `권한 해제 (${row.roleMeta.label})`, variant: 'danger', onClick: () => handleRevokeRole(row) },
          ]}
        />
      ),
    },
  ];

  // Role facet 옵션 — 운영 권한만 노출 (admin/operator/super_admin/branch_*)
  const operatorRoleOptions = getRoleOptions().filter(o => allRows.some(row => row.parsedRole.roleKey === o.value));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <PageHeader
        title="서비스 관리자·운영자"
        subtitle="서비스별 담당자를 지정하고 운영 권한을 관리합니다."
        backUrl="/"
        backLabel="Dashboard"
        actions={[
          { id: 'add', label: '서비스 담당자 지정', onClick: openCreateModal, variant: 'primary', icon: <Plus className="w-4 h-4" /> },
          { id: 'refresh', label: 'Refresh', onClick: fetchUsers, variant: 'secondary', icon: <RefreshCw className="w-4 h-4" /> },
        ]}
      />

      {assignmentNotice && (
        <div role="status" className="mb-4 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p className="min-w-0 flex-1">{assignmentNotice}</p>
          <button type="button" aria-label="지정 결과 안내 닫기" onClick={() => setAssignmentNotice(null)} className="shrink-0 rounded p-1 hover:bg-blue-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats — WO-O4O-ADMIN-OPERATORS-REDUNDANT-ACTIVE-KPI-REMOVE-V1: Active KPI 제거 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <StatCard label="Operators" value={stats.users} color="text-gray-900" Icon={Users} />
        <StatCard label="Admin Roles" value={stats.admins} color="text-orange-600" Icon={Shield} />
        <StatCard label="Operator Roles" value={stats.operators} color="text-blue-600" Icon={Shield} />
      </div>

      {/* WO-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1: 운영 권한과 초대 대기를 분리해 표시한다. */}
      <>
      {/* FilterBar */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <FilterBar
          searchPlaceholder="이름, 이메일, 서비스, 역할 검색..."
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            { key: 'service', placeholder: 'All Services', options: [...getServiceOptions().filter(option => option.value !== 'platform'), ...['pharmacy','carepharm','megapharm','pharmcoop'].map(key => ({ value: key, label: SERVICES[key as keyof typeof SERVICES].label }))] },
            { key: 'role', placeholder: 'All Operator Roles', options: operatorRoleOptions },
          ]}
          filterValues={facets as unknown as Record<string, string>}
          onFilterChange={(k, v) => setFacets((prev) => ({ ...prev, [k]: v } as Facets))}
        />
      </div>

      <p className="mb-4 rounded border bg-white p-4 text-sm">서비스별 Admin·Operator를 지정·해제합니다. 각 서비스 Admin은 자기 서비스에서 Operator를 관리할 수 있습니다. 계정 활성 여부와 실제 서비스 접근 가능 여부는 다릅니다. 전체 관리자 계정은 <Link to="/settings/admin-accounts" className="text-blue-700 underline">전체 관리자 계정</Link>에서 관리합니다.</p>
      <details className="mb-4 rounded border bg-white p-4" onToggle={e => setShowLegacy(e.currentTarget.open)}><summary className="cursor-pointer font-medium">기존·기타 권한 정리</summary>{showLegacy && <UsersListClean />}</details>
      <BusinessOperatorAssignments />

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

      </>


      <OperatorInvitationsPanel version={invitationVersion} onLoaded={setInvitations} />

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
              <dt className="text-gray-500">계정 상태</dt>
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
              <dt className="text-gray-500">사업 원장</dt>
              <dd className="col-span-2">
                <BusinessLedgerCell serviceKey={detailTarget.parsedRole.serviceKey} ledger={businessLedger} />
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

      {/* WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §17:
          "서비스 비밀번호 변경" 모달을 제거했다. 이 화면에는 비밀번호 입력 필드가 하나도 없다. */}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingUserId ? '운영자 편집' : '서비스 운영자 지정'}
              </h2>
              <button onClick={closeModal} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* WO-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1: 기존 사용자 선택과 미가입 이메일 초대를 구분한다.
                  미가입자는 이메일 초대 후 본인이 가입·수락한다. */}

              {/* 대상 —
                  WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §1·§5·§7
                  (A) 지정: 사람을 **검색해서 고른다**. 전송되는 값은 userId 다(email 은 Identity Key 가 아니다).
                  전송되는 값은 userId 다(email 은 Identity Key 가 아니다). */}
              {editingUserId ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">미가입자 초대 이메일</label>
                  <input type="email" aria-label="미가입자 초대 이메일" value={inviteEmail}
                    onChange={e => { setInviteEmail(e.target.value); setSelectedCandidate(null); }}
                    className="w-full rounded border p-2 mb-3" placeholder="operator@example.com" />
                  <p className="text-xs text-gray-500 mb-2">가입자는 아래에서 선택하세요. 이메일로 기존 계정을 자동 연결하지 않습니다.</p>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    대상 사용자 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={candidateQuery}
                      onChange={(e) => setCandidateQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          searchCandidates();
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="이메일 또는 이름으로 검색 (2자 이상)"
                    />
                    <button
                      type="button"
                      onClick={searchCandidates}
                      disabled={candidatesLoading}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
                    >
                      <Search className="w-4 h-4" />
                      {candidatesLoading ? '검색 중...' : '검색'}
                    </button>
                  </div>

                  {selectedCandidate && (
                    <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
                      <div className="font-medium text-slate-800">
                        {selectedCandidate.name || '(이름 없음)'} ({selectedCandidate.email})
                      </div>
                      <div className="mt-0.5 text-xs font-mono text-slate-500">userId: {selectedCandidate.userId}</div>
                    </div>
                  )}

                  {candidates.length > 0 && (
                    <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-gray-200 divide-y">
                      {candidates.map((c) => (
                        <label
                          key={c.userId}
                          className={`flex items-start gap-2 p-2 text-sm cursor-pointer ${
                            selectedCandidate?.userId === c.userId ? 'bg-blue-50' : 'hover:bg-gray-50'
                          } `}
                        >
                          <input
                            type="radio"
                            name="candidate"
                            className="mt-1 text-blue-600"
                            checked={selectedCandidate?.userId === c.userId}

                            onChange={() => {
                              setSelectedCandidate(c);
                              setFormErrors((prev) => ({ ...prev, candidate: '' }));
                            }}
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900">{c.name || '(이름 없음)'}</div>
                            <div className="text-xs text-gray-500 break-all">{c.email}</div>
                            {/* 연결 없는 사용자를 목록에서 숨기지 않는다 — 왜 지정할 수 없는지 보이게 한다. */}
                            {!c.hasGoogleLink && (
                              <div className="mt-0.5 text-xs text-amber-700">
                                Google 계정 미연결 — 이메일 계정으로도 확인·수락할 수 있습니다.
                              </div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {formErrors.candidate && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {formErrors.candidate}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    검색 결과가 없으면 이름·이메일과 검색어를 먼저 확인하세요. 공통 계정이 없다면 본인이 가입하고,
                    이메일 계정도 본인 인증과 초대 수락을 완료하면 서비스 운영 권한을 받을 수 있습니다.
                    해당 서비스의 사전 가입은 지정의 필수 조건이 아닙니다.
                  </p>
                </div>
              )}

              {/* 이름 — 편집에서만 다룬다. 등록은 더 이상 계정을 만들지 않으므로 이름을 받지 않는다. */}
              {editingUserId && (
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
              )}

              {/* Roles — 등록: 대상 서비스 1개 + 역할 1개
                  WO-O4O-ADMIN-SERVICE-OPERATOR-REGISTRATION-IDENTITY-V2-V1:
                  WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §16:
                    대상 서비스는 하나다. role 과 serviceKey 가 어긋나면 서버가
                    SERVICE_KEY_MISMATCH 로 거부한다(프런트 카탈로그를 신뢰하지 않는다). */}
              {!editingUserId ? (
                <div className="space-y-4">
                  {/* STEP 1 — 대상 서비스 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      1. 대상 서비스 <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {REGISTRABLE_SERVICE_KEYS.map((key) => {
                        const meta = SERVICES[key as keyof typeof SERVICES];
                        const selected = targetServiceKey === key;
                        return (
                          <label
                            key={key}
                            className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors ${
                              selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="target-service"
                              value={key}
                              checked={selected}
                              onChange={() => changeTargetService(key)}
                              className="mt-0.5 text-blue-600"
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{meta?.label ?? key}</div>
                              {/* 표시명이 아니라 SSOT 변환 결과를 그대로 보여준다 — 화면과 요청이 같은 값이다. */}
                              <div className="text-[10px] text-gray-400 mt-0.5 font-mono">
                                {resolveCanonicalServiceKey(key)}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    {formErrors.targetService && (
                      <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {formErrors.targetService}
                      </p>
                    )}
                  </div>

                  {/* STEP 2 — 역할 (선택한 서비스의 역할만) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      2. 역할 <span className="text-red-500">*</span>
                    </label>
                    {formErrors.roles && (
                      <p className="mb-2 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {formErrors.roles}
                      </p>
                    )}
                    {!targetServiceKey ? (
                      <div className="rounded-lg bg-slate-50 border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500">
                        먼저 대상 서비스를 선택하세요. 선택한 서비스의 역할만 표시됩니다.
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                        <div className="mt-2 text-xs text-slate-500">
                          요청에 실리는 값 — service key:{' '}
                          <code>{resolveCanonicalServiceKey(targetRole.split(':')[0])}</code>
                          {targetRole && (
                            <>
                              {' '}· role: <code>{targetRole}</code>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <p className="text-xs text-slate-500">
                    플랫폼 계정(<code>platform:super_admin</code>)은 서비스 운영자 등록 대상이 아닙니다 —
                    <b> 설정 &gt; 관리자 계정</b> 화면에서 관리합니다.
                  </p>
                </div>
              ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  보유 권한 (조회 전용 — 추가는 초대, 해제는 행 메뉴)
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
                                  disabled
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
                  // 등록에서는 대상 서비스·역할이 확정되기 전에는 제출할 수 없다.
                  disabled={
                    submitting
                    || (!editingUserId
                        && (!targetServiceKey
                            || !targetRole
                            || (!selectedCandidate && !inviteEmail.trim())))
                  }
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
                      {editingUserId ? '운영자 수정' : '확인 메일 보내기'}
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
