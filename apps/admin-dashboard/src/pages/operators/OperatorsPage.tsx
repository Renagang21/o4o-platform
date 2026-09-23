/**
 * OperatorsPage — Assignment-Row Canonical (operator-ux-core DataTable)
 *
 * WO-O4O-ADMIN-ASSIGNMENT-ROW-LIST-CANONICALIZATION-V1 (assignment-row data model)
 * WO-O4O-ADMIN-OPERATORS-ROWACTION-EDIT-RESTORE-V1 (canonical DataTable + ActionBar
 *   + BulkResultModal + BaseDetailDrawer, RowActionMenu Edit + Revoke)
 * WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §1·§15·§17
 *   운영자 onboarding 이 Google Identity 기준으로 바뀌었다. **관리자는 더 이상 타인의
 *   비밀번호를 만들거나 재설정하지 않는다.** 이 화면에서 사라진 것:
 *     - 등록 폼의 비밀번호 입력 · 초기 서비스 비밀번호 · 비밀번호 정책 검증
 *     - 행 액션 "서비스 비밀번호 변경" 모달
 *     - `POST /admin/users` 를 통한 신규 계정 생성
 *   대신 두 경로만 남는다:
 *     (A) 기존 Google 사용자 검색·선택 → `POST /admin/operator-assignments` (userId 로 지정)
 *     (B) 미가입자 → `POST /admin/operator-invitations` (이메일 초대 → 본인이 Google 로 수락)
 *
 * 구조:
 * - 탭: 운영 권한(assignment row) / 초대 대기(operator_invitations)
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
import { Plus, RefreshCw, Shield, Users, X, Check, AlertCircle, UserX, Mail, Search, Send, Ban } from 'lucide-react';
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
// WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §17:
//   `@/lib/password-policy` import 를 제거했다. 이 화면에는 비밀번호 입력 자체가 없다.
import {
  ASSIGNABLE_ROLES,
  CATALOG_ROLE_VALUES,
  REGISTRABLE_SERVICE_KEYS,
  findRoleOption,
} from '@/lib/operator-role-catalog';


/**
 * 등록 경로 — 계약이 완전히 다르므로 화면에서 먼저 가른다 (§1).
 *   assign: 이미 O4O 에 있고 Google 이 연결된 사용자에게 지금 권한을 준다(즉시 반영).
 *   invite: 아직 계정이 없는 사람에게 이메일 초대를 보낸다(수락 시점에 권한이 생긴다).
 */
type RegisterMode = 'assign' | 'invite';

/** 지정 후보 — 서버가 Google 연결 여부까지 함께 준다(연결 없으면 지정 대상이 아니다). */
interface OperatorCandidate {
  userId: string;
  email: string;
  name: string | null;
  hasGoogleLink: boolean;
}

interface InvitationRow {
  id: string;
  invitedEmail: string;
  serviceKey: string;
  serviceName: string;
  role: string;
  status: 'pending' | 'accepted' | 'cancelled' | string;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  cancelledAt: string | null;
}

type TabKey = 'assignments' | 'invitations';

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

  // 탭 — 운영 권한(부여됨) / 초대 대기(아직 Identity 가 확정되지 않음)
  const [tab, setTab] = useState<TabKey>('assignments');

  // 초대 목록 (§15)
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invitationsError, setInvitationsError] = useState<string | null>(null);

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserFormState>({ email: '', lastName: '', firstName: '', roles: [] });
  // 등록 모달 상태 — 기본은 '지정'이다. 초대는 "계정이 없을 때" 의 경로다.
  const [registerMode, setRegisterMode] = useState<RegisterMode>('assign');
  // 대상 서비스는 **기본값 없이 시작**한다. 첫 서비스를 자동 확정하면 관리자가 고르지 않은 서비스로
  // 등록이 나가고(과거 KPA 고정 결함), 화면 표시와 실제 serviceKey 가 어긋날 수 있다.
  const [targetServiceKey, setTargetServiceKey] = useState<string>('');
  const [targetRole, setTargetRole] = useState<string>('');
  // (A) 지정 경로 — 사람을 **검색해서 고른다**. 이메일을 타이핑해 넣지 않는다(email ≠ Identity Key).
  const [candidateQuery, setCandidateQuery] = useState('');
  const [candidates, setCandidates] = useState<OperatorCandidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<OperatorCandidate | null>(null);
  // (B) 초대 경로 — 이메일은 **수락 조건**이지 사람을 찾는 키가 아니다.
  const [inviteEmail, setInviteEmail] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchInvitations();
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

  /**
   * 초대 목록 조회 (§15).
   * 실패를 "초대 0건" 으로 위장하지 않는다 — 목록 조회와 같은 계약으로 지속 배너를 남긴다.
   */
  const fetchInvitations = async () => {
    try {
      setInvitationsLoading(true);
      const response = await authClient.api.get('/admin/operator-invitations');
      if (response.data?.success === false) {
        throw new Error(response.data?.error || '초대 목록 조회에 실패했습니다.');
      }
      const raw = response.data?.data ?? response.data?.invitations ?? [];
      if (!Array.isArray(raw)) throw new Error('초대 목록 응답 형식이 올바르지 않습니다.');
      setInvitations(raw as InvitationRow[]);
      setInvitationsError(null);
    } catch (err: any) {
      setInvitationsError(
        err?.response?.data?.error || err?.message || '초대 목록을 불러오지 못했습니다.',
      );
    } finally {
      setInvitationsLoading(false);
    }
  };

  // assignment-row flatMap + operator-only preset filter
  const allRows = useMemo<AssignmentRow[]>(
    () => flattenUsersToAssignments(users).filter((row) => isOperatorRole(row.role)),
    [users],
  );

  /** 탭 배지는 "아직 처리할 것" 만 센다 — 수락·취소된 초대는 대기가 아니다. */
  const pendingInvitations = useMemo(
    () => invitations.filter((i) => i.status === 'pending'),
    [invitations],
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
    setRegisterMode('assign');
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
    setCandidates([]);
    setCandidateQuery('');
    setInviteEmail('');
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
      const raw = res.data?.data ?? [];
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

    // ── 등록(지정/초대 공통) — 대상 서비스와 역할은 **명시 선택**이어야 한다 ──
    if (!targetServiceKey) errors.targetService = '대상 서비스를 선택하세요.';
    else if (!targetRole) errors.roles = '역할을 선택하세요.';

    if (registerMode === 'assign') {
      if (!selectedCandidate) errors.candidate = '대상 사용자를 검색해서 선택하세요.';
      else if (!selectedCandidate.hasGoogleLink) {
        errors.candidate = 'Google 계정이 연결되지 않은 사용자입니다. 본인이 Google 연결을 마친 뒤 지정할 수 있습니다.';
      }
    } else {
      if (!inviteEmail) errors.email = '초대할 이메일을 입력하세요.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) errors.email = '이메일 형식이 올바르지 않습니다.';
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
          roles: formData.roles,
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
      const canonicalServiceKey = resolveCanonicalServiceKey(targetServiceKey);
      const serviceLabel = SERVICES[targetServiceKey as keyof typeof SERVICES]?.label ?? targetServiceKey;

      if (registerMode === 'assign') {
        // (A) 직접 지정 — 대상은 언제나 userId 다.
        const res = await authClient.api.post('/admin/operator-assignments', {
          userId: selectedCandidate!.userId,
          serviceKey: canonicalServiceKey,
          role: targetRole,
        });
        const membershipPolicy = res?.data?.data?.membershipPolicy;
        const statuses: Record<string, string> = res?.data?.data?.membershipStatuses ?? {};
        if (membershipPolicy === 'KEEP_EXISTING_STATUS') {
          // 기존 가입 상태를 승격하지 않는다는 사실을 숨기지 않는다 (§6).
          const status = statuses[canonicalServiceKey] ?? '기존 상태';
          toast.success(`권한을 부여했습니다. ${serviceLabel} 가입 상태는 "${status}" 그대로 유지됩니다.`);
        } else {
          toast.success(`${serviceLabel} 운영 권한을 부여했습니다.`);
        }
        closeModal();
        fetchUsers();
      } else {
        // (B) 초대 — 이 시점에는 계정도 권한도 만들지 않는다. 초대 1행이 전부다.
        const res = await authClient.api.post('/admin/operator-invitations', {
          email: inviteEmail.trim(),
          serviceKey: canonicalServiceKey,
          role: targetRole,
        });
        if (res?.data?.data?.emailSent === false) {
          toast.error('초대는 생성됐지만 메일 발송에 실패했습니다. [초대 대기] 탭에서 재전송하세요.');
        } else {
          toast.success(`${inviteEmail.trim()} 로 초대 메일을 보냈습니다. 본인이 Google 로 수락하면 권한이 부여됩니다.`);
        }
        closeModal();
        setTab('invitations');
        fetchInvitations();
      }
    } catch (err: any) {
      const code = err?.response?.data?.code;
      const msg = err?.response?.data?.error || err?.response?.data?.message || '저장에 실패했습니다.';
      // 서버 계약 위반은 원인 필드에 직접 붙여 관리자가 무엇을 고쳐야 하는지 남긴다.
      if (code === 'ROLE_NOT_ASSIGNABLE' || code === 'SERVICE_KEY_MISMATCH' || code === 'SERVICE_KEY_REQUIRED') {
        setFormErrors((prev) => ({ ...prev, roles: msg }));
      } else if (code === 'USER_NOT_FOUND' || code === 'GOOGLE_LINK_REQUIRED') {
        setFormErrors((prev) => ({ ...prev, candidate: msg }));
      } else if (code === 'INVITATION_DUPLICATE' || code === 'INVALID_EMAIL') {
        setFormErrors((prev) => ({ ...prev, email: msg }));
      }
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── 초대 재전송 · 취소 (§15) ───
  const resendInvitation = async (row: InvitationRow) => {
    try {
      await authClient.api.post(`/admin/operator-invitations/${row.id}/resend`);
      toast.success(`${row.invitedEmail} 로 초대를 다시 보냈습니다. 이전 링크는 무효가 됩니다.`);
      fetchInvitations();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || '재전송에 실패했습니다.');
    }
  };

  const cancelInvitation = async (row: InvitationRow) => {
    // 취소는 초대만 무효화한다 — 이미 부여된 권한을 회수하지 않는다는 점을 문구로 분명히 한다.
    if (
      !confirm(
        `${row.invitedEmail} 의 초대를 취소하시겠습니까?\n\n※ 초대 링크만 무효가 되며, 이미 부여된 권한은 이 조작으로 회수되지 않습니다.`,
      )
    ) {
      return;
    }
    try {
      await authClient.api.post(`/admin/operator-invitations/${row.id}/cancel`);
      toast.success('초대를 취소했습니다.');
      fetchInvitations();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || '취소에 실패했습니다.');
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
            // WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §17:
            //   "서비스 비밀번호 변경" 액션을 제거했다. 운영자는 Google 로 로그인하며
            //   관리자가 타인의 비밀번호를 만들거나 재설정하는 경로는 존재하지 않는다.
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

      {/* 탭 — WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §15
          "운영 권한" = 이미 부여된 것(role_assignments), "초대 대기" = 아직 사람이 확정되지 않은 것.
          초대는 계정도 권한도 아니므로 같은 표에 섞지 않는다. */}
      <div className="mb-4 flex gap-1 border-b border-gray-200">
        {([
          { key: 'assignments' as const, label: '운영 권한', count: filteredRows.length },
          { key: 'invitations' as const, label: '초대 대기', count: pendingInvitations.length },
        ]).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{t.count}</span>
          </button>
        ))}
      </div>

      {tab === 'assignments' && (
      <>
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

      </>
      )}

      {/* 초대 대기 탭 (§15) — 재전송 · 취소 */}
      {tab === 'invitations' && (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">초대 대기</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                초대 시점에는 계정 · 권한이 만들어지지 않습니다. 수신자가 <b>같은 이메일의 Google 계정</b>으로
                수락할 때 권한이 부여됩니다.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchInvitations}
              disabled={invitationsLoading}
              className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              새로고침
            </button>
          </div>

          {/* 조회 실패를 "초대 0건" 으로 위장하지 않는다. */}
          {invitationsError && (
            <div role="alert" className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <p className="font-semibold">초대 목록을 불러오지 못했습니다.</p>
              <p className="mt-1 break-all">{invitationsError}</p>
            </div>
          )}

          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">초대 이메일</th>
                <th className="px-4 py-2 font-medium">서비스</th>
                <th className="px-4 py-2 font-medium">역할</th>
                <th className="px-4 py-2 font-medium">상태</th>
                <th className="px-4 py-2 font-medium">만료</th>
                <th className="px-4 py-2 font-medium text-right">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invitationsLoading && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">불러오는 중...</td></tr>
              )}
              {!invitationsLoading && invitations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    {invitationsError ? '목록을 불러오지 못해 표시할 수 없습니다.' : '대기 중인 초대가 없습니다.'}
                  </td>
                </tr>
              )}
              {!invitationsLoading && invitations.map((row) => {
                const expired = row.status === 'pending' && new Date(row.expiresAt).getTime() <= Date.now();
                const statusLabel = expired
                  ? '만료'
                  : row.status === 'pending' ? '대기'
                  : row.status === 'accepted' ? '수락됨'
                  : row.status === 'cancelled' ? '취소됨'
                  : row.status;
                return (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 break-all text-gray-900">{row.invitedEmail}</td>
                    <td className="px-4 py-2 text-gray-700">{row.serviceName || row.serviceKey}</td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-700">{row.role}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          expired ? 'bg-amber-100 text-amber-800'
                            : row.status === 'pending' ? 'bg-blue-100 text-blue-800'
                            : row.status === 'accepted' ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {new Date(row.expiresAt).toLocaleString('ko-KR')}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-2">
                        {/* 수락 · 취소된 초대는 되살리지 않는다(서버도 거부한다). */}
                        <button
                          type="button"
                          onClick={() => resendInvitation(row)}
                          disabled={row.status !== 'pending'}
                          className="flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-40"
                        >
                          <Send className="h-3.5 w-3.5" />
                          재전송
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelInvitation(row)}
                          disabled={row.status !== 'pending'}
                          className="flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-40"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          취소
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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

      {/* WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §17:
          "서비스 비밀번호 변경" 모달을 제거했다. 이 화면에는 비밀번호 입력 필드가 하나도 없다. */}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingUserId ? '운영자 편집' : '서비스 운영자 지정 · 초대'}
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
                      { key: 'assign' as const, title: '기존 사용자 지정', desc: '이미 가입하고 Google 이 연결된 사용자를 검색해 선택합니다. 선택 즉시 권한이 부여됩니다.' },
                      { key: 'invite' as const, title: '초대 (미가입자)', desc: '이메일로 초대를 보냅니다. 본인이 Google 로 수락하는 시점에 계정과 권한이 만들어집니다.' },
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

              {/* 대상 —
                  WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §1·§5·§7
                  (A) 지정: 사람을 **검색해서 고른다**. 전송되는 값은 userId 다(email 은 Identity Key 가 아니다).
                  (B) 초대: 이메일은 사람을 찾는 키가 아니라 **수락 조건**이다. */}
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
              ) : registerMode === 'assign' ? (
                <div>
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
                          } ${c.hasGoogleLink ? '' : 'opacity-70'}`}
                        >
                          <input
                            type="radio"
                            name="candidate"
                            className="mt-1 text-blue-600"
                            checked={selectedCandidate?.userId === c.userId}
                            disabled={!c.hasGoogleLink}
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
                                Google 계정 미연결 — 본인이 연결을 마쳐야 지정할 수 있습니다.
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
                    검색 결과에 없다면 아직 가입하지 않은 사람입니다 — <b>초대</b> 경로를 사용하세요.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    초대할 이메일 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      formErrors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="operator@example.com"
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {formErrors.email}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    초대 메일에는 <b>비밀번호가 포함되지 않습니다.</b> 수신자가 <b>같은 이메일의 Google 계정</b>으로
                    수락해야 권한이 부여됩니다. 이 단계에서는 계정도 권한도 만들어지지 않습니다.
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
                          <code>{resolveCanonicalServiceKey(targetServiceKey)}</code>
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
                  // 등록에서는 대상 서비스·역할이 확정되기 전에는 제출할 수 없다.
                  disabled={
                    submitting
                    || (!editingUserId
                        && (!targetServiceKey
                            || !targetRole
                            || (registerMode === 'assign' && !selectedCandidate?.hasGoogleLink)))
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
                      {editingUserId ? '운영자 수정' : registerMode === 'assign' ? '권한 부여' : '초대 메일 보내기'}
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