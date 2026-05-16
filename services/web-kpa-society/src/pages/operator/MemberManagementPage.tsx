/**
 * MemberManagementPage - KPA-a 회원 관리 & 가입 신청 관리
 * WO-KPA-A-MEMBER-APPROVAL-UI-PHASE1-V1
 * WO-O4O-MEMBER-LIST-STANDARDIZATION-V1
 * WO-O4O-KPA-MEMBER-MANAGEMENT-CANONICAL-ALIGN-V1: DataTable canonical 정렬
 *   - DataTable / 컬럼 타입을 @o4o/operator-ux-core 로 통일 (다른 11개 canonical 화면과 일치)
 *   - Column<T> → ListColumnDef<T> (title→header, sorter→sortAccessor)
 *   - DataTable props 정렬 (dataSource→data, emptyText→emptyMessage, tableId 추가)
 *   - 내장 pagination prop → 외부 JSX 페이지네이션 (canonical 패턴)
 *   - 기존 컬럼/행/액션/Drawer/EditModal/DeleteRiskModal 동작 모두 유지
 *
 * MemberListLayout + @o4o/operator-ux-core DataTable 기반 표준화.
 * 탭: 전체 | 약사 | 약대생 | 가입 신청
 */

import { useState, useEffect, useCallback, useMemo, type CSSProperties, type ReactNode } from 'react';
import { toast } from '@o4o/error-handling';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  UserX,
  Loader2,
  AlertCircle,
  RefreshCw,
  Pencil,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import { ActionBar, BulkResultModal, RowActionMenu, ConfirmActionDialog, BaseDetailDrawer } from '@o4o/ui';
import {
  DataTable,
  MemberListLayout,
  StatusBadge,
  defineActionPolicy,
  buildRowActions,
  useBatchAction,
} from '@o4o/operator-ux-core';
import type { ListColumnDef, MemberTab } from '@o4o/operator-ux-core';
import { ACTIVITY_TYPE_LABELS, useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

// ─── Types ───────────────────────────────────────────────────

/** WO-KPA-A-MEMBER-STATUS-SEMANTICS-SEPARATION-V1: rejected 추가 */
type MemberStatus = 'pending' | 'active' | 'suspended' | 'rejected' | 'withdrawn';
type MemberRole = 'member' | 'operator' | 'admin';
type ApplicationStatus = 'submitted' | 'approved' | 'rejected' | 'cancelled';

interface KpaMember {
  // WO-O4O-KPA-OPERATOR-MEMBER-LIST-SOURCE-FIX-V1:
  //   id = kpa_members.id (존재 시) | service_memberships.id (없을 시) — 항상 유효한 UUID
  //   sm_id = service_memberships.id (항상 존재)
  //   has_kpa_member = KPA 도메인 프로필 존재 여부
  id: string;
  sm_id: string;
  has_kpa_member: boolean;
  user_id: string;
  organization_id: string | null;
  role: MemberRole | null;
  status: MemberStatus;
  kpa_status?: string | null;          // kpa_members.status (진단용, sm.status와 다를 수 있음)
  membership_type: string | null;      // null이면 KPA 프로필 미생성
  license_number: string | null;
  pharmacy_name: string | null;
  pharmacy_address?: string | null;
  // WO-O4O-KPA-MEMBER-PROFILE-CAPABILITY-COLUMN-ADD-V1: profile + capability
  activity_type?: string | null;       // kpa_members.activity_type (profile metadata)
  capabilities?: string[];             // role_assignments active roles (capability SSOT)
  // WO-O4O-KPA-REGISTER-MODAL-ACTIVITY-AND-PHARMACY-OWNER-INTEGRATION-V1:
  //   개설약사 가입 시 users.businessInfo 에 저장된 사업자 정보 일부.
  business_info?: {
    businessNumber: string | null;
    businessName: string | null;
    representativeName: string | null;
    taxEmail: string | null;
  } | null;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
  service_key?: string;
  user?: { name?: string; email?: string };
  organization?: { name?: string };
}

interface KpaApplication {
  id: string;
  user_id: string;
  organization_id: string;
  type: string;
  payload: Record<string, unknown>;
  status: ApplicationStatus;
  note: string | null;
  reviewer_id: string | null;
  review_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  user?: { name?: string; email?: string };
  organization?: { name?: string };
}

interface ApplicationStats {
  submitted: number;
  approved: number;
  rejected: number;
  cancelled: number;
}

// ─── Helpers ─────────────────────────────────────────────────

const roleLabels: Record<MemberRole, string> = {
  member: '회원',
  operator: '운영자',
  admin: '관리자',
};

// WO-O4O-KPA-MEMBER-PROFILE-CAPABILITY-COLUMN-ADD-V1:
//   role_assignments role 키 → 사용자 표시 라벨.
//   알려진 키만 매핑하고, 미매핑 키는 raw 값으로 안전하게 표시.
const CAPABILITY_LABELS: Record<string, string> = {
  'kpa:store_owner': '매장 운영',
  'kpa:operator': '운영자',
  'kpa:admin': '관리자',
  'kpa:pharmacist': '약사',
  'lms:instructor': '강사',
  'platform:super_admin': '플랫폼 관리자',
};

/** capability chip 정렬: store_owner → operator → admin → 그 외 */
const CAPABILITY_PRIORITY: Record<string, number> = {
  'platform:super_admin': 0,
  'kpa:admin': 1,
  'kpa:operator': 2,
  'kpa:store_owner': 3,
  'lms:instructor': 4,
  'kpa:pharmacist': 5,
};

function sortCapabilities(caps: string[]): string[] {
  return [...caps].sort((a, b) => {
    const pa = CAPABILITY_PRIORITY[a] ?? 99;
    const pb = CAPABILITY_PRIORITY[b] ?? 99;
    if (pa !== pb) return pa - pb;
    return a.localeCompare(b);
  });
}

function formatCapabilityLabel(role: string): string {
  return CAPABILITY_LABELS[role] ?? role;
}

const appStatusConfig: Record<ApplicationStatus, { label: string; color: string; bg: string }> = {
  submitted: { label: '대기', color: 'text-amber-700', bg: 'bg-amber-50' },
  approved: { label: '승인', color: 'text-green-700', bg: 'bg-green-50' },
  rejected: { label: '반려', color: 'text-red-700', bg: 'bg-red-50' },
  cancelled: { label: '취소', color: 'text-slate-500', bg: 'bg-slate-100' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

// ─── Action Policy (V4-EXPANSION) ────────────────────────────────

// WO-O4O-KPA-OPERATOR-MEMBER-LIST-SOURCE-FIX-V1:
//   has_kpa_member 가드: kpa_members 없는 사용자는 KPA 프로필 기반 액션 비활성화.
//   (승인/반려/정지/복원/수정은 kpa_members.id 기반 PATCH 엔드포인트를 사용하므로
//    kpa_members 없으면 백엔드 404. 목록 표시는 하되 액션은 비활성화.)
const memberActionPolicy = defineActionPolicy<KpaMember>('kpa:members', {
  inlineMax: 2,
  rules: [
    {
      key: 'approve',
      label: '승인',
      variant: 'primary',
      visible: (m) => m.status === 'pending' && m.has_kpa_member,
    },
    {
      key: 'reject',
      label: '반려',
      variant: 'danger',
      visible: (m) => m.status === 'pending' && m.has_kpa_member,
      confirm: {
        title: '회원 반려',
        message: '이 회원의 가입을 반려하시겠습니까?',
        variant: 'danger',
        confirmText: '반려',
      },
    },
    {
      key: 'suspend',
      label: '정지',
      variant: 'danger',
      visible: (m) => m.status === 'active' && m.has_kpa_member,
      confirm: {
        title: '회원 정지',
        message: '이 회원을 정지 처리하시겠습니까?',
        variant: 'danger',
        confirmText: '정지',
      },
    },
    {
      key: 'restore',
      label: '복원',
      variant: 'primary',
      visible: (m) => m.status === 'suspended' && m.has_kpa_member,
    },
    {
      key: 'edit',
      label: '수정',
      visible: (m) => m.status !== 'withdrawn' && m.has_kpa_member,
    },
    // WO-O4O-KPA-MEMBER-BULK-DELETE-WORKFLOW-REFACTOR-V1:
    //   점3개 메뉴는 회원 정보 수정/개별 관리 중심으로 정리. 삭제(탈퇴/완전삭제)는
    //   bulk action 영역(ActionBar) 으로 이관되어 일관된 워크플로우로 처리됨.
  ],
});

const MEMBER_ACTION_ICONS: Record<string, ReactNode> = {
  approve: <UserCheck className="w-4 h-4" />,
  reject: <UserX className="w-4 h-4" />,
  suspend: <ShieldAlert className="w-4 h-4" />,
  restore: <CheckCircle className="w-4 h-4" />,
  edit: <Pencil className="w-4 h-4" />,
  delete: <Trash2 className="w-4 h-4" />,
};

// ─── Tab Filter Config ─────────────────────────────────────────

/** membership_type 기반 클라이언트 필터 */
const ROLE_TAB_FILTER: Record<string, string[]> = {
  all: [],
  pharmacist: ['pharmacist', 'pharmacist_member'],
  student: ['student', 'pharmacy_student_member'],
  applications: [],
};

/** status 기반 서버사이드 필터 (WO-KPA-A-MEMBER-STATUS-SEMANTICS-SEPARATION-V1) */
const STATUS_TAB_FILTER: Record<string, MemberStatus | ''> = {
  all: '',
  pharmacist: '',
  student: '',
  'status-pending': 'pending',
  'status-active': 'active',
  'status-rejected': 'rejected',
  'status-suspended': 'suspended',
  applications: '',
};

// ─── Component ───────────────────────────────────────────────

export default function MemberManagementPage() {
  const { user: currentUser } = useAuth();
  // WO-O4O-KPA-ADMIN-MEMBER-MANAGEMENT-SEPARATION-V1:
  //   isKpaAdmin 분기 제거 — 완전삭제는 /admin/members 에서 처리. 본 페이지는 operator 표준 UX.

  // WO-O4O-OPERATOR-MEMBER-EDIT-ROLE-MANAGEMENT-V1:
  //   현재 사용자가 admin scope 보유 여부 (조직 역할 변경 자격).
  //   kpa:admin 또는 platform:super_admin 이면 PATCH /:id/role 호출 가능.
  const currentUserRoles = currentUser?.roles ?? [];
  const currentUserIsAdmin = currentUserRoles.some(
    (r) => r === 'kpa:admin' || r === 'platform:super_admin'
  );

  const [activeTab, setActiveTab] = useState('all');
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [memberTotal, setMemberTotal] = useState(0);
  const [pendingMemberCount, setPendingMemberCount] = useState(0);
  const [activeMemberCount, setActiveMemberCount] = useState(0);
  const [rejectedMemberCount, setRejectedMemberCount] = useState(0);
  const [suspendedMemberCount, setSuspendedMemberCount] = useState(0);
  const [pharmacistCount, setPharmacistCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);

  // Members state
  const [members, setMembers] = useState<KpaMember[]>([]);
  const [memberLoading, setMemberLoading] = useState(true);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberPage, setMemberPage] = useState(1);
  // WO-O4O-KPA-MEMBER-MANAGEMENT-CANONICAL-ALIGN-V1:
  //   외부 pagination JSX 사용 — API 가 반환하는 totalPages 를 보관
  const [memberTotalPages, setMemberTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  // WO-O4O-KPA-ADMIN-MEMBER-MANAGEMENT-SEPARATION-V1:
  //   완전삭제 진입점 + DeleteRiskModal 은 /admin/members (AdminMemberManagementPage) 로 이관.
  const [selectedMember, setSelectedMember] = useState<KpaMember | null>(null);
  // WO-O4O-OPERATOR-MEMBER-EDIT-ROLE-MANAGEMENT-V1:
  //   Drawer 인라인 편집 모드 + 폼 state.
  //   기존 EditMemberModal 제거 — 모든 편집은 Drawer 내부에서 진행.
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    name: string;
    membership_type: string;
    role: MemberRole;
    status: MemberStatus;
  }>({ name: '', membership_type: 'pharmacist', role: 'member', status: 'active' });
  const [savingEdit, setSavingEdit] = useState(false);

  // WO-O4O-KPA-MEMBER-BULK-ACTION-ALIGN-V1: bulk selection + batch hook
  //   - selectedIds: 현재 페이지 기준 회원 ID 집합 (canonical Set<string>)
  //   - batch: useBatchAction hook (loading/result/showResult + executeBatch + clearResult + retryFailed)
  //   - 탭 변경 / fetch 후 / batch 완료 시 selection clear (아래 effect 와 핸들러)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const batch = useBatchAction();

  // Stats fetch (application stats only — member counts are fetched in fetchMembers)
  useEffect(() => {
    apiClient.get<{ data: ApplicationStats }>('/applications/admin/stats')
      .then(r => setStats(r.data))
      .catch(() => {});
  }, []);

  // Fetch members — status 파라미터 지원 (WO-KPA-A-COMMUNITY-BLOCKER-CLEANUP-V1)
  const fetchMembers = useCallback(async (page = 1) => {
    setMemberLoading(true);
    setMemberError(null);
    try {
      const reqParams: Record<string, string | number | boolean | undefined> = { page, limit: 20 };
      if (searchQuery) reqParams.search = searchQuery;
      // 상태 기반 탭이면 서버사이드 필터
      const statusFilter = STATUS_TAB_FILTER[activeTab] || '';
      if (statusFilter) reqParams.status = statusFilter;
      const res = await apiClient.get<{ data: KpaMember[]; total: number; totalPages: number }>(
        '/members', reqParams,
      );
      setMembers(res.data);
      setMemberTotal(res.total);
      setMemberTotalPages(Math.max(1, res.totalPages || 1));

      // Count by membership_type + status (한 번만 조회)
      const allRes = await apiClient.get<{ data: KpaMember[]; total: number }>('/members', { limit: 1000 });
      const all = allRes.data || [];
      setPharmacistCount(all.filter(m => m.membership_type === 'pharmacist' || m.membership_type === 'pharmacist_member').length);
      setStudentCount(all.filter(m => m.membership_type === 'student' || m.membership_type === 'pharmacy_student_member').length);
      setPendingMemberCount(all.filter(m => m.status === 'pending').length);
      setActiveMemberCount(all.filter(m => m.status === 'active').length);
      setRejectedMemberCount(all.filter(m => m.status === 'rejected').length);
      setSuspendedMemberCount(all.filter(m => m.status === 'suspended').length);
    } catch (e: any) {
      setMemberError(e.message);
    } finally {
      setMemberLoading(false);
    }
  }, [searchQuery, activeTab]);

  useEffect(() => {
    if (activeTab !== 'applications') {
      fetchMembers(1);
    }
  }, [fetchMembers, activeTab]);

  async function handleStatusChange(memberId: string, newStatus: MemberStatus) {
    setActionLoading(memberId);
    try {
      await apiClient.patch(`/members/${memberId}/status`, { status: newStatus });
      await fetchMembers(memberPage);
    } catch (e: any) {
      toast.error(e.message || '상태 변경에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  }

  // ────────────────────────────────────────────────────────────
  // WO-O4O-OPERATOR-MEMBER-EDIT-ROLE-MANAGEMENT-V1:
  //   Drawer 인라인 편집 모드 helpers.
  //   - 편집 가능 필드: 이름, 회원 유형, 조직 역할, 상태
  //   - 이메일: 표시만 (수정 불가)
  //   - capability(권한 chip): 표시만 (별도 부여/회수 흐름 유지)
  //   - super_admin(platform:super_admin capability 보유자): 편집 진입 자체 차단
  //   - 조직 역할 변경: kpa:admin / platform:super_admin scope 필요 (백엔드 PATCH /:id/role)
  // ────────────────────────────────────────────────────────────

  const memberHasSuperAdmin = useCallback((m: KpaMember | null): boolean => {
    if (!m) return false;
    return (m.capabilities ?? []).includes('platform:super_admin');
  }, []);

  const openMemberEdit = useCallback((m: KpaMember) => {
    if (memberHasSuperAdmin(m)) {
      toast.error('super_admin 권한을 보유한 회원은 수정할 수 없습니다.');
      return;
    }
    setSelectedMember(m);
    setEditForm({
      name: m.user?.name || '',
      membership_type: m.membership_type || 'pharmacist',
      role: (m.role || 'member') as MemberRole,
      status: m.status,
    });
    setIsEditing(true);
  }, [memberHasSuperAdmin]);

  const enterEditMode = useCallback(() => {
    if (!selectedMember) return;
    if (memberHasSuperAdmin(selectedMember)) {
      toast.error('super_admin 권한을 보유한 회원은 수정할 수 없습니다.');
      return;
    }
    setEditForm({
      name: selectedMember.user?.name || '',
      membership_type: selectedMember.membership_type || 'pharmacist',
      role: (selectedMember.role || 'member') as MemberRole,
      status: selectedMember.status,
    });
    setIsEditing(true);
  }, [selectedMember, memberHasSuperAdmin]);

  const cancelEditMode = useCallback(() => setIsEditing(false), []);

  const saveMemberEdit = useCallback(async () => {
    if (!selectedMember) return;
    setSavingEdit(true);
    try {
      // 1) 사전 검증 — super_admin 방어 (이중 가드)
      if (memberHasSuperAdmin(selectedMember)) {
        throw new Error('super_admin 권한을 보유한 회원은 수정할 수 없습니다.');
      }

      // 2) 변경 사항 계산
      const currentName = (selectedMember.user?.name || '').trim();
      const newName = editForm.name.trim();
      const nameChanged = newName !== currentName;
      const typeChanged = editForm.membership_type !== (selectedMember.membership_type || '');
      const roleChanged = editForm.role !== (selectedMember.role || 'member');
      const statusChanged = editForm.status !== selectedMember.status;

      if (!nameChanged && !typeChanged && !roleChanged && !statusChanged) {
        setIsEditing(false);
        return;
      }

      // 3) 권한 사전 검증 (서버도 검증하지만 사용자 피드백 명확화)
      if (roleChanged) {
        if (!currentUserIsAdmin) {
          throw new Error('조직 역할 변경은 admin 권한이 필요합니다.');
        }
        if (currentUser && selectedMember.user_id === currentUser.id && editForm.role === 'admin') {
          throw new Error('자신을 admin으로 지정할 수 없습니다.');
        }
      }

      // 4) 순차 호출 — info → role → status
      //    순서 고정: role 변경이 status 변경 흐름(MembershipApprovalService)에 영향 줄 수 있어 status 가 마지막.
      if (nameChanged || typeChanged) {
        const payload: Record<string, string> = {};
        if (nameChanged) payload.name = newName;
        if (typeChanged) payload.membership_type = editForm.membership_type;
        await apiClient.patch(`/members/${selectedMember.id}/info`, payload);
      }
      if (roleChanged) {
        await apiClient.patch(`/members/${selectedMember.id}/role`, { role: editForm.role });
      }
      if (statusChanged) {
        await apiClient.patch(`/members/${selectedMember.id}/status`, { status: editForm.status });
      }

      toast.success('회원 정보가 저장되었습니다.');
      setIsEditing(false);
      // 5) 목록 + Drawer (selectedMember) 갱신 — selectedMember 는 별도 effect 가 members 변동 시 동기화.
      await fetchMembers(memberPage);
    } catch (e: any) {
      toast.error(e?.message || '저장에 실패했습니다.');
    } finally {
      setSavingEdit(false);
    }
  }, [selectedMember, editForm, memberHasSuperAdmin, currentUserIsAdmin, currentUser, fetchMembers, memberPage]);

  // 목록(fetchMembers) 갱신 후 Drawer 의 selectedMember 도 최신 데이터로 동기화.
  // selectedMember 가 현재 페이지에 없으면(필터 변경 등) 기존 객체 유지.
  useEffect(() => {
    setSelectedMember((prev) => {
      if (!prev) return prev;
      const refreshed = members.find((m) => m.id === prev.id);
      return refreshed ?? prev;
    });
  }, [members]);

  // Drawer 닫힘 시 편집 모드 해제
  useEffect(() => {
    if (!selectedMember) setIsEditing(false);
  }, [selectedMember]);

  // WO-O4O-KPA-MEMBER-BULK-ACTION-ALIGN-V1:
  //   sequential batch wrapper — 별도 backend bulk endpoint 없이 기존 PATCH /members/:id/status 를 N회 병렬 호출.
  //   useBatchAction 이 기대하는 응답 형태({ data: { results } })로 반환 → BulkResultModal 호환.
  //   per-id 실패는 results[].status='failed' 로 기록되어 retry 가능.
  const batchUpdateMemberStatus = useCallback(
    async (
      ids: string[],
      options?: Record<string, unknown>,
    ): Promise<{ data: { results: Array<{ id: string; status: 'success' | 'failed'; error?: string }> } }> => {
      const targetStatus = (options?.status as MemberStatus | undefined);
      if (!targetStatus) {
        return { data: { results: ids.map((id) => ({ id, status: 'failed' as const, error: 'status missing' })) } };
      }
      const settled = await Promise.allSettled(
        ids.map((id) => apiClient.patch(`/members/${id}/status`, { status: targetStatus })),
      );
      const results = settled.map((r, i) => {
        const id = ids[i];
        if (r.status === 'fulfilled') return { id, status: 'success' as const };
        const err = r.reason as { message?: string } | null;
        return { id, status: 'failed' as const, error: err?.message || 'Network error' };
      });
      return { data: { results } };
    },
    [],
  );

  // Selection 기반 bulk action 후보 ID 추출 — 현재 status 가 액션 정책에 부합하는 것만 (서버 거절 사전 차단)
  // WO-O4O-KPA-OPERATOR-MEMBER-LIST-SOURCE-FIX-V1: has_kpa_member 가드 추가
  //   kpa_members 없는 사용자는 bulk 작업에서도 제외 (PATCH /members/:id/status = kpa_members 기반)
  const selectedPendingIds = useMemo(
    () => members.filter((m) => selectedIds.has(m.id) && m.status === 'pending' && m.has_kpa_member).map((m) => m.id),
    [members, selectedIds],
  );
  const selectedActiveIds = useMemo(
    () => members.filter((m) => selectedIds.has(m.id) && m.status === 'active' && m.has_kpa_member).map((m) => m.id),
    [members, selectedIds],
  );
  const selectedSuspendedIds = useMemo(
    () => members.filter((m) => selectedIds.has(m.id) && m.status === 'suspended' && m.has_kpa_member).map((m) => m.id),
    [members, selectedIds],
  );
  // WO-O4O-KPA-MEMBER-BULK-DELETE-WORKFLOW-REFACTOR-V1: 탈퇴 처리 후보 — 아직 withdrawn 이 아닌 모든 회원
  // WO-O4O-KPA-OPERATOR-MEMBER-LIST-SOURCE-FIX-V1: has_kpa_member 가드 추가
  const selectedWithdrawableIds = useMemo(
    () => members.filter((m) => selectedIds.has(m.id) && m.status !== 'withdrawn' && m.has_kpa_member).map((m) => m.id),
    [members, selectedIds],
  );

  const runBulk = useCallback(
    async (ids: string[], status: MemberStatus, opts?: { keepSelection?: boolean }) => {
      if (ids.length === 0) return;
      const result = await batch.executeBatch(batchUpdateMemberStatus, ids, { status });
      if (result.successCount > 0) {
        if (!opts?.keepSelection) setSelectedIds(new Set());
        await fetchMembers(memberPage);
      }
    },
    [batch, batchUpdateMemberStatus, fetchMembers, memberPage],
  );

  const handleBulkApprove = useCallback(() => runBulk(selectedPendingIds, 'active'), [runBulk, selectedPendingIds]);
  const handleBulkReject = useCallback(() => runBulk(selectedPendingIds, 'rejected'), [runBulk, selectedPendingIds]);
  const handleBulkSuspend = useCallback(() => runBulk(selectedActiveIds, 'suspended'), [runBulk, selectedActiveIds]);
  const handleBulkRestore = useCallback(() => runBulk(selectedSuspendedIds, 'active'), [runBulk, selectedSuspendedIds]);
  // WO-O4O-KPA-MEMBER-BULK-DELETE-WORKFLOW-REFACTOR-V1
  //   탈퇴 처리(soft delete) bulk — selection 유지하여 admin 이 후속으로 완전삭제 이어갈 수 있게 한다.
  //   리스트 refresh 후 현재 페이지에서 사라진 항목은 기존 useEffect 가 selection 에서 정리.
  const handleBulkWithdraw = useCallback(
    () => runBulk(selectedWithdrawableIds, 'withdrawn', { keepSelection: true }),
    [runBulk, selectedWithdrawableIds],
  );
  // WO-O4O-KPA-ADMIN-MEMBER-MANAGEMENT-SEPARATION-V1:
  //   완전삭제(hard delete) 진입점은 /admin/members 로 이관 — 본 페이지에는 부재.

  // Client-side tab filtering (status tabs는 서버사이드이므로 여기선 membership_type만)
  const filteredMembers = useMemo(() => {
    if (activeTab === 'all' || activeTab === 'applications' || activeTab.startsWith('status-')) return members;
    const allowed = ROLE_TAB_FILTER[activeTab];
    if (!allowed || allowed.length === 0) return members;
    return members.filter(m => m.membership_type && allowed.includes(m.membership_type));
  }, [members, activeTab]);

  // WO-O4O-KPA-MEMBER-BULK-ACTION-ALIGN-V1:
  //   탭 변경 / fetch 결과 변경 시 *invalid* selection 만 정리 (현재 페이지에 없는 ID 제거).
  //   탭이 'applications' 로 바뀌면 회원 selection 자체가 의미 없으므로 전체 clear.
  useEffect(() => {
    if (activeTab === 'applications') {
      if (selectedIds.size > 0) setSelectedIds(new Set());
      return;
    }
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const validIds = new Set(members.map((m) => m.id));
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (validIds.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, members]);

  // Tabs — 유형 + 상태 기반 (WO-KPA-A-MEMBER-STATUS-SEMANTICS-SEPARATION-V1)
  const tabs: MemberTab[] = [
    { key: 'all', label: '전체', count: memberTotal },
    { key: 'pharmacist', label: '약사', count: pharmacistCount },
    { key: 'student', label: '약대생', count: studentCount },
    { key: 'status-pending', label: '승인대기', count: pendingMemberCount },
    { key: 'status-active', label: '승인완료', count: activeMemberCount },
    { key: 'status-rejected', label: '반려', count: rejectedMemberCount },
    { key: 'status-suspended', label: '정지', count: suspendedMemberCount },
    { key: 'applications', label: '가입 신청', count: stats?.submitted ?? 0 },
  ];

  // DataTable columns for members — WO-O4O-KPA-MEMBER-MANAGEMENT-CANONICAL-ALIGN-V1:
  //   ListColumnDef (operator-ux-core) 로 변경 — title→header, sorter→sortAccessor.
  //   sortAccessor 는 정렬 키 값만 반환 (BaseTable 이 비교는 자동 처리).
  const memberColumns: ListColumnDef<KpaMember>[] = [
    {
      key: 'name',
      header: '이름',
      sortable: true,
      width: '150px',
      render: (_v, m) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-sm font-medium text-slate-600 shrink-0">
            {(m.user?.name || '-').charAt(0)}
          </div>
          <span className="font-medium text-slate-800 text-sm">{m.user?.name || '-'}</span>
        </div>
      ),
      sortAccessor: (m) => m.user?.name || '',
    },
    {
      key: 'email',
      header: '이메일',
      sortable: true,
      width: '200px',
      render: (_v, m) => <span className="text-sm text-slate-600">{m.user?.email || '-'}</span>,
      sortAccessor: (m) => m.user?.email || '',
    },
    {
      key: 'membership_type',
      header: '유형',
      width: '100px',
      render: (_v, m) => {
        // WO-O4O-KPA-OPERATOR-MEMBER-LIST-SOURCE-FIX-V1: kpa_members 없는 경우 표시
        if (!m.has_kpa_member) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full border border-slate-200 bg-slate-50 text-slate-400 italic">
              KPA 프로필 없음
            </span>
          );
        }
        const isStudent = m.membership_type === 'student' || m.membership_type === 'pharmacy_student_member';
        return (
          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${
            isStudent
              ? 'bg-sky-50 border-sky-200 text-sky-700'
              : 'bg-teal-50 border-teal-200 text-teal-700'
          }`}>
            {isStudent ? '약대생' : '약사'}
          </span>
        );
      },
    },
    // WO-O4O-KPA-MEMBER-PROFILE-CAPABILITY-COLUMN-ADD-V1:
    //   activity_type = profile metadata (자기소개) — 자유 변경 가능
    {
      key: 'activity_type',
      header: '활동 유형',
      width: '120px',
      render: (_v, m) => (
        <span className="text-sm text-slate-600">
          {m.activity_type ? (ACTIVITY_TYPE_LABELS[m.activity_type] ?? m.activity_type) : '-'}
        </span>
      ),
    },
    {
      // 라벨 변경: '역할' → '조직 역할' (capability 컬럼과 혼동 방지)
      // kpa_members.role 은 회원/운영자/관리자 (조직 내 역할). RBAC capability 와 다름.
      key: 'role',
      header: '조직 역할',
      width: '90px',
      render: (_v, m) => <span className="text-sm text-slate-600">{m.role ? (roleLabels[m.role as MemberRole] ?? m.role) : '-'}</span>,
    },
    // WO-O4O-KPA-MEMBER-PROFILE-CAPABILITY-COLUMN-ADD-V1:
    //   capabilities = role_assignments active roles (RBAC SSOT) — 승인 절차로만 부여/회수
    {
      key: 'capabilities',
      header: '권한',
      width: '180px',
      render: (_v, m) => {
        const caps = sortCapabilities(m.capabilities ?? []);
        if (caps.length === 0) {
          return <span className="text-xs text-slate-400">일반 회원</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {caps.map((cap) => (
              <span
                key={cap}
                title={cap}
                className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700"
              >
                {formatCapabilityLabel(cap)}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: '상태',
      width: '80px',
      render: (_v, m) => <StatusBadge status={m.status} />,
    },
    {
      key: 'joined_at',
      header: '가입일',
      sortable: true,
      width: '100px',
      render: (_v, m) => <span className="text-sm text-slate-500">{formatDate(m.joined_at || m.created_at)}</span>,
      sortAccessor: (m) => new Date(m.joined_at || m.created_at).getTime(),
    },
    {
      key: '_actions',
      header: '액션',
      width: '60px',
      align: 'center',
      system: true,
      render: (_v, m) => (
        <RowActionMenu
          actions={buildRowActions(memberActionPolicy, m, {
            approve: () => handleStatusChange(m.id, 'active'),
            reject: () => handleStatusChange(m.id, 'rejected'),
            suspend: () => handleStatusChange(m.id, 'suspended'),
            restore: () => handleStatusChange(m.id, 'active'),
            edit: () => openMemberEdit(m),
            // WO-O4O-KPA-MEMBER-BULK-DELETE-WORKFLOW-REFACTOR-V1:
            //   삭제 콜백은 bulk action 으로 이관되어 행 메뉴에서는 더 이상 호출하지 않음.
          }, {
            icons: MEMBER_ACTION_ICONS,
            loading: actionLoading === m.id
              ? { approve: true, reject: true, suspend: true, restore: true }
              : undefined,
          })}
          inlineMax={memberActionPolicy.inlineMax}
        />
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">총 회원 수</p>
              <p className="text-xl font-bold text-slate-900">{memberTotal}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">승인 대기</p>
              <p className="text-xl font-bold text-slate-900">{pendingMemberCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">승인 완료</p>
              <p className="text-xl font-bold text-slate-900">{stats?.approved ?? '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Member List Layout */}
      <MemberListLayout
        title="회원 관리"
        description="회원 현황 조회 및 가입 신청 승인/반려"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        search={search}
        onSearchChange={setSearch}
        onSearch={setSearchQuery}
        searchPlaceholder="이름, 이메일로 검색"
        headerActions={
          <button
            onClick={() => { fetchMembers(memberPage); }}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />새로고침
          </button>
        }
      >
        {activeTab === 'applications' ? (
          <ApplicationsTab onReviewComplete={() => {
            apiClient.get<{ data: ApplicationStats }>('/applications/admin/stats')
              .then(r => setStats(r.data))
              .catch(() => {});
          }} />
        ) : (
          <>
            {memberError && (
              <div className="flex items-center gap-2 p-4 text-sm text-red-700 bg-red-50">
                <AlertCircle className="w-4 h-4 shrink-0" />{memberError}
              </div>
            )}

            {/* WO-O4O-KPA-MEMBER-BULK-ACTION-ALIGN-V1: bulk action toolbar
                operator scope 의 status-only 작업만 노출 (approve/reject/suspend/restore).
                bulk delete / bulk role 변경은 본 WO scope 외. */}
            <div className="mb-3">
              <ActionBar
                selectedCount={selectedIds.size}
                onClearSelection={() => setSelectedIds(new Set())}
                actions={[
                  {
                    key: 'approve',
                    label: `승인 (${selectedPendingIds.length})`,
                    onClick: handleBulkApprove,
                    variant: 'primary' as const,
                    icon: <UserCheck size={14} />,
                    loading: batch.loading,
                    group: 'actions',
                    tooltip: '선택된 가입 대기 회원을 일괄 승인합니다',
                    visible: selectedPendingIds.length > 0,
                    confirm: {
                      title: '회원 일괄 승인',
                      message: `선택한 회원 ${selectedPendingIds.length}명을 승인하시겠습니까?`,
                      variant: 'warning' as const,
                      confirmText: '승인',
                    },
                  },
                  {
                    key: 'reject',
                    label: `반려 (${selectedPendingIds.length})`,
                    onClick: handleBulkReject,
                    variant: 'danger' as const,
                    icon: <XCircle size={14} />,
                    loading: batch.loading,
                    group: 'danger',
                    tooltip: '선택된 가입 대기 회원을 일괄 반려합니다',
                    visible: selectedPendingIds.length > 0,
                    confirm: {
                      title: '회원 일괄 반려',
                      message: `선택한 회원 ${selectedPendingIds.length}명의 가입 신청을 반려하시겠습니까?`,
                      variant: 'danger' as const,
                      confirmText: '반려',
                    },
                  },
                  {
                    key: 'suspend',
                    label: `정지 (${selectedActiveIds.length})`,
                    onClick: handleBulkSuspend,
                    variant: 'warning' as const,
                    icon: <UserX size={14} />,
                    loading: batch.loading,
                    group: 'danger',
                    tooltip: '선택된 활성 회원을 일괄 정지합니다',
                    visible: selectedActiveIds.length > 0,
                    confirm: {
                      title: '회원 일괄 정지',
                      message: `선택한 회원 ${selectedActiveIds.length}명을 정지하시겠습니까?`,
                      variant: 'danger' as const,
                      confirmText: '정지',
                    },
                  },
                  {
                    key: 'restore',
                    label: `복원 (${selectedSuspendedIds.length})`,
                    onClick: handleBulkRestore,
                    variant: 'primary' as const,
                    icon: <CheckCircle size={14} />,
                    loading: batch.loading,
                    group: 'actions',
                    tooltip: '선택된 정지 회원을 일괄 복원합니다',
                    visible: selectedSuspendedIds.length > 0,
                    confirm: {
                      title: '회원 일괄 복원',
                      message: `선택한 회원 ${selectedSuspendedIds.length}명을 복원하시겠습니까?`,
                      variant: 'warning' as const,
                      confirmText: '복원',
                    },
                  },
                  // WO-O4O-KPA-MEMBER-BULK-DELETE-WORKFLOW-REFACTOR-V1: 탈퇴 처리 (soft delete) bulk
                  // operator + admin 모두 가능. withdrawn 이 아닌 모든 회원 대상.
                  {
                    key: 'withdraw',
                    label: `탈퇴 처리 (${selectedWithdrawableIds.length})`,
                    onClick: handleBulkWithdraw,
                    variant: 'warning' as const,
                    icon: <UserX size={14} />,
                    loading: batch.loading,
                    group: 'danger',
                    tooltip: '선택된 회원을 탈퇴(비활성) 처리합니다',
                    visible: selectedWithdrawableIds.length > 0,
                    confirm: {
                      title: '회원 일괄 탈퇴 처리',
                      message: `선택한 회원 ${selectedWithdrawableIds.length}명을 탈퇴(비활성) 처리하시겠습니까?\n탈퇴 처리 후에도 선택 상태는 유지되어 후속 작업을 이어갈 수 있습니다.`,
                      variant: 'warning' as const,
                      confirmText: '탈퇴 처리',
                    },
                  },
                  // WO-O4O-KPA-ADMIN-MEMBER-MANAGEMENT-SEPARATION-V1:
                  //   완전삭제(hard delete) 진입점은 /admin/members 로 이관.
                  //   운영자 화면은 승인/반려/정지/복원/탈퇴 처리(soft delete)까지만 담당.
                ]}
              />
            </div>

            <DataTable<KpaMember>
              columns={memberColumns}
              data={filteredMembers}
              rowKey="id"
              loading={memberLoading}
              emptyMessage="회원이 없습니다."
              tableId="kpa-operator-members"
              selectable
              selectedKeys={selectedIds}
              onSelectionChange={setSelectedIds}
              onRowClick={(m) => setSelectedMember(m)}
            />

            {/* WO-O4O-KPA-MEMBER-MANAGEMENT-CANONICAL-ALIGN-V1:
                operator-ux-core DataTable 은 내장 pagination 미지원 — 외부 JSX 로 분리.
                서버사이드 페이지(activeTab='all' 또는 status-* 탭) 일 때만 노출.
                client-side 필터(약사/약대생 탭) 일 때는 페이지네이션 의미 없으므로 숨김. */}
            {memberTotalPages > 1 && activeTab !== 'applications'
              && (activeTab === 'all' || activeTab.startsWith('status-')) && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => { const next = Math.max(1, memberPage - 1); setMemberPage(next); fetchMembers(next); }}
                  disabled={memberPage <= 1 || memberLoading}
                >
                  이전
                </button>
                <span className="text-sm text-slate-600">{memberPage} / {memberTotalPages}</span>
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => { const next = Math.min(memberTotalPages, memberPage + 1); setMemberPage(next); fetchMembers(next); }}
                  disabled={memberPage >= memberTotalPages || memberLoading}
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </MemberListLayout>

      {/* WO-O4O-KPA-MEMBER-BULK-ACTION-ALIGN-V1: bulk 결과 모달 */}
      <BulkResultModal
        open={batch.showResult}
        onClose={() => { batch.clearResult(); fetchMembers(memberPage); }}
        result={batch.result}
        onRetry={() => { batch.retryFailed(); }}
      />

      {/* WO-O4O-OPERATOR-MEMBER-EDIT-ROLE-MANAGEMENT-V1:
          기존 EditMemberModal 제거 — 모든 회원 수정은 Drawer 인라인 편집 모드로 통합. */}

      {/* WO-O4O-KPA-ADMIN-MEMBER-MANAGEMENT-SEPARATION-V1:
          완전삭제 진입점 + DeleteRiskModal 은 /admin/members 로 이관되었음. */}

      {/* 회원 상세 Drawer
          WO-O4O-OPERATOR-MEMBER-EDIT-ROLE-MANAGEMENT-V1:
            - 편집 모드(isEditing=true): footer 가 [저장, 취소] 로 전환.
            - 보기 모드: 기존 status 기반 quick action 유지 (super_admin 회원은 가드).
       */}
      <BaseDetailDrawer
        open={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        title={selectedMember ? (selectedMember.user?.name || '-') : ''}
        width={520}
        actions={selectedMember ? (
          isEditing ? [
            {
              label: '저장',
              onClick: () => { void saveMemberEdit(); },
              variant: 'primary' as const,
              loading: savingEdit,
              disabled: savingEdit,
            },
            {
              label: '취소',
              onClick: cancelEditMode,
              variant: 'default' as const,
              disabled: savingEdit,
            },
          ] : [
            ...(memberHasSuperAdmin(selectedMember) ? [] : [
              ...(selectedMember.status === 'pending' ? [
                {
                  label: '승인',
                  onClick: () => { handleStatusChange(selectedMember.id, 'active').then(() => setSelectedMember(null)); },
                  variant: 'primary' as const,
                  loading: actionLoading === selectedMember.id,
                  disabled: actionLoading === selectedMember.id,
                },
                {
                  label: '반려',
                  onClick: () => { handleStatusChange(selectedMember.id, 'rejected').then(() => setSelectedMember(null)); },
                  variant: 'danger' as const,
                  loading: actionLoading === selectedMember.id,
                  disabled: actionLoading === selectedMember.id,
                },
              ] : []),
              ...(selectedMember.status === 'active' ? [{
                label: '정지',
                onClick: () => { handleStatusChange(selectedMember.id, 'suspended').then(() => setSelectedMember(null)); },
                variant: 'danger' as const,
                loading: actionLoading === selectedMember.id,
                disabled: actionLoading === selectedMember.id,
              }] : []),
              ...(selectedMember.status === 'suspended' ? [{
                label: '복원',
                onClick: () => { handleStatusChange(selectedMember.id, 'active').then(() => setSelectedMember(null)); },
                variant: 'primary' as const,
                loading: actionLoading === selectedMember.id,
                disabled: actionLoading === selectedMember.id,
              }] : []),
            ]),
          ]
        ) : []}
      >
        {selectedMember && (() => {
          // WO-O4O-OPERATOR-MEMBER-EDIT-ROLE-MANAGEMENT-V1:
          //   편집/보기 모드 분기. super_admin 회원은 편집 진입 차단.
          const targetIsSuperAdmin = memberHasSuperAdmin(selectedMember);
          const targetIsSelf = !!currentUser && selectedMember.user_id === currentUser.id;
          const roleSelectDisabled = !currentUserIsAdmin; // admin scope 없으면 비활성
          const inputStyle: CSSProperties = {
            width: '100%',
            padding: '6px 10px',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            fontSize: 14,
            color: '#1e293b',
            background: '#fff',
          };
          const fieldRowStyle: CSSProperties = { display: 'flex', gap: 12, marginBottom: 10, alignItems: 'center' };
          const labelStyle: CSSProperties = { fontWeight: 600, color: '#64748b', minWidth: 70, flexShrink: 0 };
          const valueStyle: CSSProperties = { color: '#1e293b', flex: 1 };

          return (
            <div style={{ fontSize: 14, color: '#374151' }}>
              {/* 기본 정보 */}
              <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 16, color: '#475569', flexShrink: 0 }}>
                    {(selectedMember.user?.name || '-').charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="이름"
                        disabled={savingEdit}
                        style={{ ...inputStyle, fontWeight: 600, fontSize: 15, marginBottom: 4 }}
                      />
                    ) : (
                      <p style={{ fontWeight: 600, fontSize: 15, color: '#1e293b', marginBottom: 2 }}>
                        {selectedMember.user?.name || '-'}
                      </p>
                    )}
                    <p style={{ fontSize: 13, color: '#64748b' }} title="이메일은 수정할 수 없습니다">
                      {selectedMember.user?.email || '-'}
                    </p>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <StatusBadge status={selectedMember.status} />
                  </div>
                </div>
              </div>

              {/* 상세 필드 */}
              {/* 유형 */}
              <div style={fieldRowStyle}>
                <span style={labelStyle}>유형</span>
                {isEditing ? (
                  <select
                    value={editForm.membership_type}
                    onChange={(e) => setEditForm((f) => ({ ...f, membership_type: e.target.value }))}
                    disabled={savingEdit}
                    style={inputStyle}
                  >
                    <option value="pharmacist">약사</option>
                    <option value="student">약대생</option>
                    {/* legacy alias 값이 들어와 있는 경우 표시 유지 */}
                    {editForm.membership_type === 'pharmacist_member' && (
                      <option value="pharmacist_member">약사 (legacy)</option>
                    )}
                    {editForm.membership_type === 'pharmacy_student_member' && (
                      <option value="pharmacy_student_member">약대생 (legacy)</option>
                    )}
                  </select>
                ) : (
                  <span style={valueStyle}>
                    {selectedMember.membership_type === 'pharmacist' || selectedMember.membership_type === 'pharmacist_member'
                      ? '약사'
                      : selectedMember.membership_type === 'student' || selectedMember.membership_type === 'pharmacy_student_member'
                        ? '약대생'
                        : '-'}
                  </span>
                )}
              </div>

              {/* 활동 유형 — 표시 전용 */}
              {selectedMember.activity_type && (
                <div style={fieldRowStyle}>
                  <span style={labelStyle}>활동 유형</span>
                  <span style={valueStyle}>
                    {ACTIVITY_TYPE_LABELS[selectedMember.activity_type] ?? selectedMember.activity_type}
                  </span>
                </div>
              )}

              {/* 조직 역할 */}
              <div style={fieldRowStyle}>
                <span style={labelStyle}>조직 역할</span>
                {isEditing ? (
                  <div style={{ flex: 1 }}>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as MemberRole }))}
                      disabled={savingEdit || roleSelectDisabled}
                      style={inputStyle}
                    >
                      <option value="member">회원</option>
                      <option value="operator">운영자</option>
                      {/* self-escalation 차단: 자신을 admin 으로 못 만듦 (백엔드도 차단) */}
                      <option value="admin" disabled={targetIsSelf}>관리자</option>
                    </select>
                    {roleSelectDisabled && (
                      <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                        조직 역할 변경은 admin 권한이 필요합니다.
                      </p>
                    )}
                    {!roleSelectDisabled && targetIsSelf && (
                      <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                        자신을 admin으로 지정할 수 없습니다.
                      </p>
                    )}
                  </div>
                ) : (
                  <span style={valueStyle}>
                    {selectedMember.role ? (roleLabels[selectedMember.role as MemberRole] ?? selectedMember.role) : '-'}
                  </span>
                )}
              </div>

              {/* 상태 */}
              <div style={fieldRowStyle}>
                <span style={labelStyle}>상태</span>
                {isEditing ? (
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as MemberStatus }))}
                    disabled={savingEdit}
                    style={inputStyle}
                  >
                    <option value="pending">대기</option>
                    <option value="active">활성</option>
                    <option value="suspended">정지</option>
                    <option value="rejected">반려</option>
                    <option value="withdrawn">탈퇴</option>
                  </select>
                ) : (
                  <span style={valueStyle}><StatusBadge status={selectedMember.status} /></span>
                )}
              </div>

              {/* 면허번호 — 표시 전용 (info endpoint 가 받지만 본 WO 범위 외) */}
              {selectedMember.license_number && (
                <div style={fieldRowStyle}>
                  <span style={labelStyle}>면허번호</span>
                  <span style={valueStyle}>{selectedMember.license_number}</span>
                </div>
              )}

              {/* WO-O4O-KPA-REGISTER-MODAL-ACTIVITY-AND-PHARMACY-OWNER-INTEGRATION-V1:
                  직역(활동 유형) — 가입 단계에서 입력됨. 개설약사 여부 판단의 핵심 필드. */}
              {selectedMember.activity_type && (
                <div style={fieldRowStyle}>
                  <span style={labelStyle}>직역</span>
                  <span style={valueStyle}>
                    {ACTIVITY_TYPE_LABELS[selectedMember.activity_type] ?? selectedMember.activity_type}
                    {selectedMember.activity_type === 'pharmacy_owner' && (
                      <span style={{ marginLeft: 6, fontSize: 11, padding: '1px 6px', borderRadius: 9999, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                        개설약사
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* 약국명/근무처명 — 표시 전용 */}
              {selectedMember.pharmacy_name && (
                <div style={fieldRowStyle}>
                  <span style={labelStyle}>
                    {selectedMember.activity_type === 'pharmacy_owner' ? '약국명' : '근무처명'}
                  </span>
                  <span style={valueStyle}>{selectedMember.pharmacy_name}</span>
                </div>
              )}

              {/* 근무처/사업장 주소 — 표시 전용 */}
              {selectedMember.pharmacy_address && (
                <div style={fieldRowStyle}>
                  <span style={labelStyle}>
                    {selectedMember.activity_type === 'pharmacy_owner' ? '사업장 주소' : '근무처 주소'}
                  </span>
                  <span style={valueStyle}>{selectedMember.pharmacy_address}</span>
                </div>
              )}

              {/* 개설약사: 사업자 정보 — users.businessInfo 에서 enrich */}
              {selectedMember.business_info?.businessNumber && (
                <div style={fieldRowStyle}>
                  <span style={labelStyle}>사업자번호</span>
                  <span style={valueStyle}>{selectedMember.business_info.businessNumber}</span>
                </div>
              )}
              {selectedMember.business_info?.representativeName && (
                <div style={fieldRowStyle}>
                  <span style={labelStyle}>대표자명</span>
                  <span style={valueStyle}>{selectedMember.business_info.representativeName}</span>
                </div>
              )}
              {selectedMember.business_info?.taxEmail && (
                <div style={fieldRowStyle}>
                  <span style={labelStyle}>세금계산서 이메일</span>
                  <span style={valueStyle}>{selectedMember.business_info.taxEmail}</span>
                </div>
              )}

              {/* 가입일 */}
              <div style={fieldRowStyle}>
                <span style={labelStyle}>가입일</span>
                <span style={valueStyle}>{formatDate(selectedMember.joined_at || selectedMember.created_at)}</span>
              </div>

              {/* 권한 (capability chips) — 항상 표시 전용 */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
                <span style={labelStyle}>권한</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(() => {
                    const caps = sortCapabilities(selectedMember.capabilities ?? []);
                    if (caps.length === 0) return <span style={{ color: '#94a3b8', fontSize: 13 }}>일반 회원</span>;
                    return caps.map((cap) => (
                      <span
                        key={cap}
                        title={cap}
                        style={{
                          display: 'inline-flex', alignItems: 'center',
                          padding: '2px 8px', fontSize: 11, fontWeight: 500,
                          borderRadius: 9999,
                          backgroundColor: '#eef2ff', border: '1px solid #c7d2fe', color: '#4338ca',
                        }}
                      >
                        {formatCapabilityLabel(cap)}
                      </span>
                    ));
                  })()}
                </div>
              </div>

              {/* 정보 수정 진입 / super_admin 차단 안내 */}
              {!isEditing && (
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 12, alignItems: 'center' }}>
                  {targetIsSuperAdmin ? (
                    <span style={{ fontSize: 12, color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <ShieldAlert size={14} />
                      super_admin 권한을 보유한 회원은 본 화면에서 수정할 수 없습니다.
                    </span>
                  ) : (
                    <button
                      onClick={enterEditMode}
                      style={{ fontSize: 13, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <Pencil size={13} />
                      정보 수정
                    </button>
                  )}
                  {/* WO-O4O-KPA-ADMIN-MEMBER-MANAGEMENT-SEPARATION-V1:
                      완전삭제 진입점은 /admin/members 로 이관되었으므로 본 Drawer 의 삭제 버튼 제거 */}
                </div>
              )}
            </div>
          );
        })()}
      </BaseDetailDrawer>
    </div>
  );
}

// ─── Applications Tab (기존 유지) ────────────────────────────

function ApplicationsTab({ onReviewComplete }: { onReviewComplete: () => void }) {
  const [apps, setApps] = useState<KpaApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('submitted');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewTarget, setReviewTarget] = useState<string | null>(null);
  const [pendingReview, setPendingReview] = useState<{ id: string; status: 'approved' | 'rejected' } | null>(null);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const reqParams: Record<string, string | number | boolean | undefined> = { page, limit: 20 };
      if (statusFilter) reqParams.status = statusFilter;
      const res = await apiClient.get<{ data: KpaApplication[]; total: number; totalPages: number }>(
        '/applications/admin/all', reqParams,
      );
      setApps(res.data);
      setTotalPages(res.totalPages);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  function requestReview(appId: string, status: 'approved' | 'rejected') {
    setPendingReview({ id: appId, status });
  }

  async function executeReview() {
    if (!pendingReview) return;
    setActionLoading(pendingReview.id);
    try {
      await apiClient.patch(`/applications/${pendingReview.id}/review`, {
        status: pendingReview.status, review_comment: reviewComment || undefined,
      });
      setReviewTarget(null);
      setReviewComment('');
      setPendingReview(null);
      await fetchApps();
      onReviewComplete();
    } catch (e: any) {
      toast.error(e.message || '처리에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />신청 목록을 불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-red-500">
        <AlertCircle className="w-6 h-6 mb-2" />
        <p className="text-sm">{error}</p>
        <button onClick={fetchApps} className="mt-3 text-sm text-blue-600 hover:underline">다시 시도</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="text-sm border border-slate-300 rounded-md px-3 py-1.5 bg-white"
        >
          <option value="">전체</option>
          <option value="submitted">대기</option>
          <option value="approved">승인</option>
          <option value="rejected">반려</option>
          <option value="cancelled">취소</option>
        </select>
        <button onClick={fetchApps} className="text-sm text-slate-500 hover:text-slate-700">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
            <th className="px-4 py-3 font-medium">신청자</th>
            <th className="px-4 py-3 font-medium">이메일</th>
            <th className="px-4 py-3 font-medium">유형</th>
            <th className="px-4 py-3 font-medium">신청일</th>
            <th className="px-4 py-3 font-medium">상태</th>
            <th className="px-4 py-3 font-medium">메모</th>
            <th className="px-4 py-3 font-medium">액션</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {apps.length === 0 ? (
            <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">
              {statusFilter === 'submitted' ? '대기 중인 신청이 없습니다.' : '신청 내역이 없습니다.'}
            </td></tr>
          ) : apps.map(app => {
            const sc = appStatusConfig[app.status];
            return (
              <tr key={app.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{app.user?.name || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{app.user?.email || '-'}</td>
                <td className="px-4 py-3 text-slate-600">
                  {app.type === 'membership' ? '회원가입' : app.type === 'service' ? '서비스' : app.type}
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDate(app.created_at)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sc.color} ${sc.bg}`}>{sc.label}</span>
                </td>
                <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate" title={app.note || ''}>{app.note || '-'}</td>
                <td className="px-4 py-3">
                  {app.status === 'submitted' ? (
                    actionLoading === app.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    ) : reviewTarget === app.id ? (
                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          value={reviewComment}
                          onChange={e => setReviewComment(e.target.value)}
                          placeholder="코멘트 (선택)"
                          className="text-xs border border-slate-300 rounded px-2 py-1 w-36"
                        />
                        <div className="flex gap-1">
                          <button onClick={() => requestReview(app.id, 'approved')} className="px-2 py-0.5 text-xs bg-green-600 text-white rounded hover:bg-green-700">승인</button>
                          <button onClick={() => requestReview(app.id, 'rejected')} className="px-2 py-0.5 text-xs bg-red-500 text-white rounded hover:bg-red-600">반려</button>
                          <button onClick={() => { setReviewTarget(null); setReviewComment(''); }} className="px-2 py-0.5 text-xs text-slate-500 hover:underline">취소</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <button onClick={() => requestReview(app.id, 'approved')} className="p-1 text-green-600 hover:bg-green-50 rounded" title="승인"><CheckCircle className="w-4 h-4" /></button>
                        <button onClick={() => setReviewTarget(app.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="반려"><XCircle className="w-4 h-4" /></button>
                      </div>
                    )
                  ) : (
                    <span className="text-xs text-slate-400">{app.review_comment ? `"${app.review_comment}"` : '-'}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4 border-t border-slate-100">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border border-slate-300 rounded-md disabled:opacity-40">이전</button>
          <span className="text-sm text-slate-600">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border border-slate-300 rounded-md disabled:opacity-40">다음</button>
        </div>
      )}

      {/* Review Confirm Dialog (V4-EXPANSION) */}
      <ConfirmActionDialog
        open={!!pendingReview}
        onClose={() => setPendingReview(null)}
        onConfirm={executeReview}
        title={pendingReview?.status === 'approved' ? '가입 승인 확인' : '가입 반려 확인'}
        message={pendingReview?.status === 'approved'
          ? '이 가입 신청을 승인하시겠습니까?'
          : '이 가입 신청을 반려하시겠습니까?'}
        confirmText={pendingReview?.status === 'approved' ? '승인' : '반려'}
        variant={pendingReview?.status === 'rejected' ? 'danger' : 'default'}
        loading={!!actionLoading}
      />
    </div>
  );
}
