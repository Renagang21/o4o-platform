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

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { KpaEditUserModal, type KpaMemberForEdit, type ApiRequestFn } from '@o4o/operator-core-ui';
import {
  DataTable,
  MemberListLayout,
  StatusBadge,
  defineActionPolicy,
  buildRowActions,
  useBatchAction,
} from '@o4o/operator-ux-core';
import type { ListColumnDef, MemberTab } from '@o4o/operator-ux-core';
import { ACTIVITY_TYPE_LABELS } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

// ─── KpaEditUserModal API adapter ────────────────────────────
// KPA apiClient baseURL = /api/v1/kpa — paths are relative to that.
const kpaEditModalMakeRequest: ApiRequestFn = async (method, path, data) => {
  switch (method) {
    case 'GET': return apiClient.get(path);
    case 'PATCH': return apiClient.patch(path, data);
    case 'POST': return apiClient.post(path, data);
    case 'PUT': return apiClient.put(path, data);
    case 'DELETE': return apiClient.delete(path);
    default: throw new Error(`Unsupported method: ${method as string}`);
  }
};

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
  // WO-O4O-KPA-OPERATOR-MEMBER-LIST-BUSINESSINFO-TYPE-CANONICAL-ALIGN-V1:
  //   canonical key (ceoName / taxInvoiceEmail) 추가. backend 응답이 canonical 로 전환됨
  //   (member.controller.ts business_info 정규화). legacy key 는 fallback 호환 목적 유지.
  business_info?: {
    businessNumber: string | null;
    businessName: string | null;
    ceoName?: string | null;
    taxInvoiceEmail?: string | null;
    representativeName?: string | null;
    taxEmail?: string | null;
    // WO-O4O-KPA-MEMBER-EDIT-FORM-CURRENT-VALUE-FIX-V1:
    //   pharmacy_phone canonical = users.businessInfo.metadata.pharmacy_phone (JSONB).
    //   backend GET /kpa/members 가 business_info 응답 객체에 attach.
    pharmacy_phone?: string | null;
    // WO-O4O-KPA-PHARMACY-CONTACT-NAME-FIELD-V1
    contactName?: string | null;
    // WO-O4O-KPA-PHARMACY-OWNER-ADDRESS-CANONICALIZE-V1: canonical address fields
    zipCode?: string | null;
    address?: string | null;
    address2?: string | null;
    // WO-O4O-KPA-OPERATOR-MEMBER-BUSINESS-INFO-STRUCTURED-PROJECTION-V1:
    //   ownerPhone: 개설자 본인 연락처 (canonical pos 3).
    //   storeAddress: 구조화 주소 — heuristic split 없이 view 에서 직접 사용.
    ownerPhone?: string | null;
    storeAddress?: {
      zipCode?: string | null;
      baseAddress?: string | null;
      detailAddress?: string | null;
    } | null;
  } | null;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
  service_key?: string;
  // WO-O4O-KPA-MEMBER-CAPABILITY-NICKNAME-UI-CANONICAL-CLEANUP-V1:
  //   nickname canonical = users.nickname. backend GET /kpa/members user 객체에 추가.
  user?: { name?: string; email?: string; nickname?: string | null };
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

// WO-O4O-KPA-OPERATOR-MEMBER-CANONICAL-EDIT-COMPLETE-V1:
//   roleLabels 제거 — '조직 역할' 표시/편집 UI 가 모두 제거됨. 권한 표시는 capability chips (role_assignments SSOT) 만 사용.

// WO-O4O-KPA-MEMBER-PROFILE-CAPABILITY-COLUMN-ADD-V1:
//   role_assignments role 키 → 사용자 표시 라벨.
//   알려진 키만 매핑하고, 미매핑 키는 raw 값으로 안전하게 표시.
// WO-O4O-KPA-MEMBER-CAPABILITY-NICKNAME-UI-CANONICAL-CLEANUP-V1:
//   `kpa:pharmacist` 매핑 제거 — 마이그레이션 20260326300000 으로 soft-deactivate 된 deprecated role.
//   '약사' 는 `유형` 컬럼(membership_type) 에서만 표현한다. capability column 의 의미는
//   `RBAC 추가 권한` (운영자/관리자/매장 운영/강사/플랫폼 관리자 등) 전용.
const CAPABILITY_LABELS: Record<string, string> = {
  'kpa:store_owner': '매장 운영',
  'kpa:operator': '운영자',
  'kpa:admin': '관리자',
  'lms:instructor': '강사',
  'platform:super_admin': '플랫폼 관리자',
};

/** capability chip 정렬: super_admin → admin → operator → store_owner → instructor → 그 외 */
const CAPABILITY_PRIORITY: Record<string, number> = {
  'platform:super_admin': 0,
  'kpa:admin': 1,
  'kpa:operator': 2,
  'kpa:store_owner': 3,
  'lms:instructor': 4,
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

/** status 기반 서버사이드 필터 (WO-KPA-A-MEMBER-STATUS-SEMANTICS-SEPARATION-V1)
 *  WO-O4O-OPERATOR-MEMBER-WITHDRAWN-TAB-ADD-V1: 'status-withdrawn' 정식 추가.
 *  service_memberships.status='withdrawn' 은 WO-O4O-SM-WITHDRAWN-STATUS-CANONICAL-ALIGNMENT-V1
 *  에서 canonical 정렬됨 — backend GET /kpa/members?status=withdrawn 그대로 동작. */
const STATUS_TAB_FILTER: Record<string, MemberStatus | ''> = {
  all: '',
  pharmacist: '',
  student: '',
  'status-pending': 'pending',
  'status-active': 'active',
  'status-rejected': 'rejected',
  'status-suspended': 'suspended',
  'status-withdrawn': 'withdrawn',
  applications: '',
};

// ─── Component ───────────────────────────────────────────────

export default function MemberManagementPage() {
  // WO-O4O-KPA-ADMIN-MEMBER-MANAGEMENT-SEPARATION-V1:
  //   isKpaAdmin 분기 제거 — 완전삭제는 /admin/members 에서 처리. 본 페이지는 operator 표준 UX.
  // WO-O4O-KPA-OPERATOR-ACTIVITYTYPE-STOREOWNER-REALIGNMENT-V1:
  //   useAuth / currentUserIsAdmin 제거 — 조직 역할 select 가 사라져 본 화면에서 admin scope
  //   판정이 더 이상 필요 없음. admin scope 권한 수정은 admin.neture.co.kr 로 이관.

  // WO-O4O-KPA-MEMBER-REGISTRATION-NOTIFICATION-PHASE1-V1:
  //   알림 클릭 deeplink — /operator/members?tab=status-pending 지원.
  //   유효하지 않은 tab 값은 'all' 로 fallback.
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>(() => {
    const VALID_TABS = new Set([
      'all', 'pharmacist', 'student', 'applications',
      'status-pending', 'status-active', 'status-rejected', 'status-suspended', 'status-withdrawn',
    ]);
    const initial = searchParams.get('tab');
    return initial && VALID_TABS.has(initial) ? initial : 'all';
  });
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [memberTotal, setMemberTotal] = useState(0);
  const [pendingMemberCount, setPendingMemberCount] = useState(0);
  const [activeMemberCount, setActiveMemberCount] = useState(0);
  const [rejectedMemberCount, setRejectedMemberCount] = useState(0);
  const [suspendedMemberCount, setSuspendedMemberCount] = useState(0);
  // WO-O4O-OPERATOR-MEMBER-WITHDRAWN-TAB-ADD-V1: withdrawn count
  const [withdrawnMemberCount, setWithdrawnMemberCount] = useState(0);
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
  // WO-O4O-OPERATOR-EDITUSER-MODAL-KPA-INTEGRATION-V1:
  //   Drawer 인라인 편집 제거 → KpaEditUserModal 독립 모달로 이전.
  const [editModalOpen, setEditModalOpen] = useState(false);
  // editingMember: Drawer를 닫은 후 모달에 전달할 대상 — selectedMember 와 생명주기를 분리.
  const [editingMember, setEditingMember] = useState<KpaMember | null>(null);

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
      // WO-O4O-OPERATOR-MEMBER-WITHDRAWN-TAB-ADD-V1: withdrawn lifecycle count
      setWithdrawnMemberCount(all.filter(m => m.status === 'withdrawn').length);
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
      // WO-O4O-KPA-ORGANIZATIONS-RAW-SQL-COLUMN-ALIGNMENT-V1:
      //   PATCH /:id/status 가 store_owner auto-activation 실패/보류 시 warnings[] 를 동봉.
      //   saveMemberEdit (PATCH /info) 와 동일 패턴으로 운영자에게 toast 노출.
      const res = await apiClient.patch<{ data: any; warnings?: string[] }>(
        `/members/${memberId}/status`,
        { status: newStatus },
      );
      if (Array.isArray(res?.warnings) && res.warnings.length > 0) {
        for (const w of res.warnings) {
          toast.warning(w);
        }
      }
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

  // WO-O4O-OPERATOR-MEMBER-WITHDRAWN-TAB-ADD-V1:
  //   withdrawn 회원은 lifecycle 종료 상태 — 정보 수정 차단.
  //   복구(withdrawn→active) 는 본 WO 범위 외 (별도 흐름 필요 시 후속 WO).
  const memberIsWithdrawn = useCallback((m: KpaMember | null): boolean => {
    if (!m) return false;
    return m.status === 'withdrawn';
  }, []);

  // WO-O4O-OPERATOR-EDITUSER-MODAL-KPA-INTEGRATION-V1:
  //   편집은 KpaEditUserModal 독립 모달로 이전.
  //   openMemberEdit: Drawer 열기 + 모달 즉시 진입 (행 액션 경로).
  const openMemberEdit = useCallback((m: KpaMember) => {
    if (memberHasSuperAdmin(m)) {
      toast.error('super_admin 권한을 보유한 회원은 수정할 수 없습니다.');
      return;
    }
    if (memberIsWithdrawn(m)) {
      toast.error('탈퇴 처리된 회원은 수정할 수 없습니다.');
      return;
    }
    setEditingMember(m);
    setSelectedMember(null);
    setEditModalOpen(true);
  }, [memberHasSuperAdmin, memberIsWithdrawn]);

  // 목록(fetchMembers) 갱신 후 Drawer 의 selectedMember 도 최신 데이터로 동기화.
  // selectedMember 가 현재 페이지에 없으면(필터 변경 등) 기존 객체 유지.
  useEffect(() => {
    setSelectedMember((prev) => {
      if (!prev) return prev;
      const refreshed = members.find((m) => m.id === prev.id);
      return refreshed ?? prev;
    });
  }, [members]);

  // Drawer 닫힘 시 편집 모달 해제 불필요 — editingMember 가 모달 생명주기를 독립 관리.
  // (editingMember 는 setSelectedMember(null) 이후에도 유지됨)

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
    // WO-O4O-OPERATOR-MEMBER-WITHDRAWN-TAB-ADD-V1: 탈퇴 탭 정식 추가
    { key: 'status-withdrawn', label: '탈퇴', count: withdrawnMemberCount },
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
      width: '170px',
      render: (_v, m) => (
        // WO-O4O-KPA-MEMBER-CAPABILITY-NICKNAME-UI-CANONICAL-CLEANUP-V1:
        //   이름 아래에 nickname 보조 표시 (users.nickname). 닉네임 없으면 줄 자체 생략.
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-sm font-medium text-slate-600 shrink-0">
            {(m.user?.name || '-').charAt(0)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-slate-800 text-sm truncate">{m.user?.name || '-'}</span>
            {m.user?.nickname && (
              <span className="text-[11px] text-slate-500 truncate" title="닉네임">@{m.user.nickname}</span>
            )}
          </div>
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
        // WO-O4O-KPA-OPERATOR-MEMBER-CANONICAL-EDIT-COMPLETE-V1:
        //   "KPA 프로필 없음" 라벨 제거 — backfill migration 으로 kpa_members 가 모든
        //   KPA 회원에 보장됨. 미존재 row 가 잔존해도 운영자가 즉시 편집 가능하므로
        //   별도 경고 라벨 불필요. membership_type 이 NULL 일 때만 '미분류' 표시.
        if (!m.membership_type) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full border border-slate-200 bg-slate-50 text-slate-400 italic">
              미분류
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
    // WO-O4O-KPA-OPERATOR-MEMBER-CANONICAL-EDIT-COMPLETE-V1:
    //   '조직 역할' (member/operator/admin) column 제거. 실제 권한 SSOT 는 role_assignments
    //   (capability chips). operator/admin/super_admin 권한 관리는 admin.neture.co.kr 전용.

    // WO-O4O-KPA-MEMBER-PROFILE-CAPABILITY-COLUMN-ADD-V1:
    //   capabilities = role_assignments active roles (RBAC SSOT) — 승인 절차로만 부여/회수
    // WO-O4O-KPA-MEMBER-CAPABILITY-NICKNAME-UI-CANONICAL-CLEANUP-V1:
    //   컬럼명 '권한' → '추가 권한'. 약사/약대생은 `유형` 컬럼에서 표현하고,
    //   본 컬럼은 RBAC 추가 권한(운영자/관리자/매장 운영 등) 전용으로 의미를 정리.
    //   capabilities 비어있을 때 '일반 회원' 라벨 제거 — '—' 으로 단순 placeholder.
    {
      key: 'capabilities',
      header: '추가 권한',
      width: '180px',
      render: (_v, m) => {
        const caps = sortCapabilities(m.capabilities ?? []);
        if (caps.length === 0) {
          return <span className="text-xs text-slate-300">—</span>;
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
        searchPlaceholder="이름, 이메일, 닉네임, 약국명, 사업자번호, 면허번호 검색"
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
        actions={selectedMember && !memberHasSuperAdmin(selectedMember) ? [
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
        ] : []}
      >
        {selectedMember && (() => {
          // WO-O4O-OPERATOR-EDITUSER-MODAL-KPA-INTEGRATION-V1:
          //   Drawer 는 view-only. 편집은 KpaEditUserModal 독립 모달.
          const targetIsSuperAdmin = memberHasSuperAdmin(selectedMember);
          const hasStoreOwnerCap = (selectedMember.capabilities ?? []).includes('kpa:store_owner');
          const fieldRowStyle = { display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-start' as const, flexWrap: 'wrap' as const };
          const labelStyle = { fontWeight: 600, color: '#64748b', minWidth: 100, flexShrink: 0, paddingTop: 2 };
          const valueStyle = { color: '#1e293b', flex: 1, minWidth: 0, wordBreak: 'break-word' as const, overflowWrap: 'break-word' as const };

          return (
            <div style={{ fontSize: 14, color: '#374151' }}>
              {/* 기본 정보 */}
              <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 16, color: '#475569', flexShrink: 0 }}>
                    {(selectedMember.user?.name || '-').charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 15, color: '#1e293b', marginBottom: 2 }}>
                      {selectedMember.user?.name || '-'}
                    </p>
                    <p style={{ fontSize: 13, color: '#64748b' }} title="이메일은 수정할 수 없습니다">
                      {selectedMember.user?.email || '-'}
                    </p>
                    {selectedMember.user?.nickname && (
                      <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }} title="닉네임 (users.nickname)">
                        @{selectedMember.user.nickname}
                      </p>
                    )}
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <StatusBadge status={selectedMember.status} />
                  </div>
                </div>
              </div>

              {/* 유형 */}
              <div style={fieldRowStyle}>
                <span style={labelStyle}>유형</span>
                <span style={valueStyle}>
                  {selectedMember.membership_type === 'pharmacist' || selectedMember.membership_type === 'pharmacist_member'
                    ? '약사'
                    : selectedMember.membership_type === 'student' || selectedMember.membership_type === 'pharmacy_student_member'
                      ? '약대생'
                      : '-'}
                </span>
              </div>

              {/* 상태 */}
              <div style={fieldRowStyle}>
                <span style={labelStyle}>상태</span>
                <span style={valueStyle}><StatusBadge status={selectedMember.status} /></span>
              </div>

              {/* 면허번호 */}
              {selectedMember.license_number && (
                <div style={fieldRowStyle}>
                  <span style={labelStyle}>면허번호</span>
                  <span style={valueStyle}>{selectedMember.license_number}</span>
                </div>
              )}

              {/* 직역 */}
              <div style={fieldRowStyle}>
                <span style={labelStyle}>직역</span>
                <span style={valueStyle}>
                  {selectedMember.activity_type
                    ? (ACTIVITY_TYPE_LABELS[selectedMember.activity_type] ?? selectedMember.activity_type)
                    : '-'}
                  {selectedMember.activity_type === 'pharmacy_owner' && (
                    <span style={{ marginLeft: 6, fontSize: 11, padding: '1px 6px', borderRadius: 9999, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                      개설약사
                    </span>
                  )}
                </span>
              </div>

              {/* 매장 권한 */}
              <div style={fieldRowStyle}>
                <span style={labelStyle}>매장 권한</span>
                <span style={valueStyle}>
                  {hasStoreOwnerCap ? (
                    <span style={{ fontSize: 12, padding: '1px 8px', borderRadius: 9999, background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                      store_owner 보유
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>store_owner 미보유</span>
                  )}
                </span>
              </div>

              {/* 약국/근무처 정보 */}
              {selectedMember.activity_type === 'pharmacy_owner' ? (() => {
                const bi = selectedMember.business_info;
                const sAddr = bi?.storeAddress;
                let addrZip = '', addrBase = '', addrDetail = '';
                if (sAddr && (sAddr.zipCode || sAddr.baseAddress || sAddr.detailAddress)) {
                  addrZip = sAddr.zipCode || '';
                  addrBase = sAddr.baseAddress || '';
                  addrDetail = sAddr.detailAddress || '';
                } else if (bi?.zipCode || bi?.address || bi?.address2) {
                  addrZip = bi.zipCode || ''; addrBase = bi.address || ''; addrDetail = bi.address2 || '';
                } else {
                  const addrRaw = (selectedMember.pharmacy_address || '').trim();
                  const zipMatch = addrRaw.match(/^(\d{5})\s+(.+)$/);
                  addrZip = zipMatch ? zipMatch[1] : ''; addrBase = zipMatch ? zipMatch[2] : addrRaw;
                }
                return (
                  <>
                    <div style={fieldRowStyle}><span style={labelStyle}>약국명</span><span style={valueStyle}>{selectedMember.pharmacy_name || '-'}</span></div>
                    <div style={fieldRowStyle}><span style={labelStyle}>약국 전화번호</span><span style={valueStyle}>{bi?.pharmacy_phone || '-'}</span></div>
                    <div style={fieldRowStyle}><span style={labelStyle}>개설자 연락처</span><span style={valueStyle}>{bi?.ownerPhone || '-'}</span></div>
                    <div style={fieldRowStyle}><span style={labelStyle}>대표자명</span><span style={valueStyle}>{bi?.ceoName || bi?.representativeName || '-'}</span></div>
                    <div style={fieldRowStyle}><span style={labelStyle}>담당자명</span><span style={valueStyle}>{bi?.contactName || '-'}</span></div>
                    <div style={fieldRowStyle}><span style={labelStyle}>사업자등록번호</span><span style={valueStyle}>{bi?.businessNumber || '-'}</span></div>
                    <div style={fieldRowStyle}><span style={labelStyle}>세금계산서 이메일</span><span style={valueStyle}>{bi?.taxInvoiceEmail || bi?.taxEmail || '-'}</span></div>
                    <div style={fieldRowStyle}><span style={labelStyle}>우편번호</span><span style={valueStyle}>{addrZip || '-'}</span></div>
                    <div style={fieldRowStyle}><span style={labelStyle}>기본주소</span><span style={valueStyle}>{addrBase || '-'}</span></div>
                    <div style={fieldRowStyle}><span style={labelStyle}>상세주소</span><span style={valueStyle}>{addrDetail || '-'}</span></div>
                  </>
                );
              })() : (
                <>
                  {selectedMember.pharmacy_name && (
                    <div style={fieldRowStyle}><span style={labelStyle}>근무처명</span><span style={valueStyle}>{selectedMember.pharmacy_name}</span></div>
                  )}
                  {selectedMember.pharmacy_address && (
                    <div style={fieldRowStyle}><span style={labelStyle}>근무처 주소</span><span style={valueStyle}>{selectedMember.pharmacy_address}</span></div>
                  )}
                </>
              )}

              {/* 가입일 */}
              <div style={fieldRowStyle}>
                <span style={labelStyle}>가입일</span>
                <span style={valueStyle}>{formatDate(selectedMember.joined_at || selectedMember.created_at)}</span>
              </div>

              {/* 추가 권한 */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
                <span style={labelStyle}>추가 권한</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(() => {
                    const caps = sortCapabilities(selectedMember.capabilities ?? []);
                    if (caps.length === 0) return <span style={{ color: '#cbd5e1', fontSize: 13 }}>—</span>;
                    return caps.map((cap) => (
                      <span key={cap} title={cap} style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', fontSize: 11, fontWeight: 500, borderRadius: 9999, backgroundColor: '#eef2ff', border: '1px solid #c7d2fe', color: '#4338ca' }}>
                        {formatCapabilityLabel(cap)}
                      </span>
                    ));
                  })()}
                </div>
              </div>

              {/* 정보 수정 / 차단 안내 */}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                {targetIsSuperAdmin ? (
                  <span style={{ fontSize: 12, color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <ShieldAlert size={14} />
                    super_admin 권한을 보유한 회원은 본 화면에서 수정할 수 없습니다.
                  </span>
                ) : memberIsWithdrawn(selectedMember) ? (
                  <>
                    <span style={{ fontSize: 12, color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <ShieldAlert size={14} />
                      탈퇴 처리된 회원은 수정할 수 없습니다.
                    </span>
                    <a href="/admin/members" style={{ fontSize: 12, color: '#2563eb', textDecoration: 'underline' }}>
                      관리자 회원관리로 이동
                    </a>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setEditingMember(selectedMember);
                      setSelectedMember(null);
                      setEditModalOpen(true);
                    }}
                    style={{ fontSize: 13, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Pencil size={13} />
                    정보 수정
                  </button>
                )}
              </div>

              {/* 전체 상세 페이지 */}
              {selectedMember.user_id && (
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                  <a href={`/operator/users/${selectedMember.user_id}`} style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}>
                    전체 상세 페이지 →
                  </a>
                </div>
              )}
            </div>
          );
        })()}
      </BaseDetailDrawer>

      {/* WO-O4O-OPERATOR-EDITUSER-MODAL-KPA-INTEGRATION-V1: KPA 회원 편집 독립 모달 */}
      {editModalOpen && editingMember && (
        <KpaEditUserModal
          member={editingMember as KpaMemberForEdit}
          makeRequest={kpaEditModalMakeRequest}
          onClose={() => { setEditModalOpen(false); setEditingMember(null); }}
          onSuccess={() => {
            setEditModalOpen(false);
            setEditingMember(null);
            void fetchMembers(memberPage);
          }}
        />
      )}
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

      <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[680px]">
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
      </div>

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
