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
  X,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { RowActionMenu, ConfirmActionDialog, BaseDetailDrawer } from '@o4o/ui';
import {
  DataTable,
  MemberListLayout,
  StatusBadge,
  defineActionPolicy,
  buildRowActions,
} from '@o4o/operator-ux-core';
import type { ListColumnDef, MemberTab } from '@o4o/operator-ux-core';
import { ACTIVITY_TYPE_LABELS } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

// ─── Types ───────────────────────────────────────────────────

/** WO-KPA-A-MEMBER-STATUS-SEMANTICS-SEPARATION-V1: rejected 추가 */
type MemberStatus = 'pending' | 'active' | 'suspended' | 'rejected' | 'withdrawn';
type MemberRole = 'member' | 'operator' | 'admin';
type ApplicationStatus = 'submitted' | 'approved' | 'rejected' | 'cancelled';

interface KpaMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: MemberRole;
  status: MemberStatus;
  membership_type: 'pharmacist' | 'student';
  license_number: string | null;
  pharmacy_name: string | null;
  // WO-O4O-KPA-MEMBER-PROFILE-CAPABILITY-COLUMN-ADD-V1: profile + capability
  activity_type?: string | null;       // kpa_members.activity_type (profile metadata)
  capabilities?: string[];             // role_assignments active roles (capability SSOT)
  joined_at: string | null;
  created_at: string;
  updated_at: string;
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

const memberActionPolicy = defineActionPolicy<KpaMember>('kpa:members', {
  inlineMax: 2,
  rules: [
    {
      key: 'approve',
      label: '승인',
      variant: 'primary',
      visible: (m) => m.status === 'pending',
    },
    {
      key: 'reject',
      label: '반려',
      variant: 'danger',
      visible: (m) => m.status === 'pending',
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
      visible: (m) => m.status === 'active',
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
      visible: (m) => m.status === 'suspended',
    },
    {
      key: 'edit',
      label: '수정',
      visible: (m) => m.status !== 'withdrawn',
    },
    {
      key: 'delete',
      label: '삭제',
      variant: 'danger',
      visible: (m) => m.status !== 'withdrawn',
      divider: true,
    },
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
  pharmacist: ['pharmacist'],
  student: ['student'],
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

// ─── Edit Member Modal (WO-KPA-A-MEMBER-EDIT-AND-DELETE-FLOW-V1) ───

function EditMemberModal({
  member,
  onClose,
  onSaved,
}: {
  member: KpaMember;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: member.user?.name || '',
    membership_type: member.membership_type,
    license_number: member.license_number || '',
    pharmacy_name: member.pharmacy_name || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.patch(`/members/${member.id}/info`, form);
      toast.success('회원 정보가 수정되었습니다.');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message || '수정 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">회원 정보 수정</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">이름</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">유형</label>
            <select value={form.membership_type} onChange={e => setForm(f => ({ ...f, membership_type: e.target.value as any }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="pharmacist">약사</option>
              <option value="student">약대생</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">면허번호</label>
            <input type="text" value={form.license_number} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">약국명</label>
            <input type="text" value={form.pharmacy_name} onChange={e => setForm(f => ({ ...f, pharmacy_name: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="text-xs text-slate-400">이메일: {member.user?.email || '-'} (읽기 전용)</div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">취소</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50">
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Risk Modal (WO-KPA-A-MEMBER-EDIT-AND-DELETE-FLOW-V1) ───

interface DeleteRiskData {
  member: { id: string; userId: string; name: string; email: string; status: string; membershipType: string; role: string };
  risks: { memberServices: number; forumPosts: number; forumComments: number; approvalRequests: number; auditLogs: number };
  totalImpact: number;
  canHardDelete: boolean;
  message: string;
}

function DeleteRiskModal({
  memberId,
  onClose,
  onDeleted,
}: {
  memberId: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DeleteRiskData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmMode, setConfirmMode] = useState<'soft' | 'hard' | null>(null);

  useEffect(() => {
    apiClient.get<{ data: DeleteRiskData }>(`/members/${memberId}/delete-risk`)
      .then(r => setData(r.data))
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [memberId]);

  const executeDelete = async () => {
    if (!confirmMode) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/members/${memberId}?mode=${confirmMode}`);
      toast.success(confirmMode === 'soft' ? '탈퇴 처리 완료' : '완전 삭제 완료');
      onDeleted();
      onClose();
    } catch (e: any) {
      toast.error(e.message || (confirmMode === 'soft' ? '처리 실패' : '삭제 실패'));
    } finally {
      setDeleting(false);
      setConfirmMode(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-bold text-slate-900">회원 삭제 확인</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : data ? (
          <div className="space-y-4">
            {/* 회원 정보 */}
            <div className="bg-slate-50 rounded-lg p-4 space-y-1">
              <p className="text-sm font-medium text-slate-800">{data.member.name}</p>
              <p className="text-xs text-slate-500">{data.member.email}</p>
              <div className="flex gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 bg-slate-200 rounded">{data.member.membershipType === 'pharmacist' ? '약사' : '약대생'}</span>
                <span className="text-xs px-2 py-0.5 bg-slate-200 rounded">{data.member.status}</span>
              </div>
            </div>

            {/* 영향 데이터 */}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">삭제 시 영향받는 데이터</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '서비스 연결', value: data.risks.memberServices },
                  { label: '포럼 게시글', value: data.risks.forumPosts },
                  { label: '포럼 댓글', value: data.risks.forumComments },
                  { label: '승인 요청', value: data.risks.approvalRequests },
                  { label: '감사 로그', value: data.risks.auditLogs },
                ].map(item => (
                  <div key={item.label} className={`flex justify-between px-3 py-2 rounded text-sm ${item.value > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500'}`}>
                    <span>{item.label}</span>
                    <span className="font-medium">{item.value}건</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 경고 */}
            {!data.canHardDelete && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700">포럼 게시글/댓글 또는 감사 로그가 있어 완전삭제가 제한됩니다. 탈퇴(비활성) 처리를 권장합니다.</p>
              </div>
            )}

            {/* 액션 */}
            <div className="flex flex-col gap-2 pt-2">
              <button onClick={() => setConfirmMode('soft')} disabled={deleting}
                className="w-full px-4 py-2.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg disabled:opacity-50">
                탈퇴 처리 (비활성화)
              </button>
              <button onClick={() => setConfirmMode('hard')} disabled={deleting || !data.canHardDelete}
                className="w-full px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">
                {!data.canHardDelete ? '완전삭제 불가 (연결 데이터 존재)' : '완전삭제 (되돌릴 수 없음)'}
              </button>
              <button onClick={onClose} className="w-full px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 rounded-lg">취소</button>
            </div>

            {/* Delete Confirm Dialog (V4-EXPANSION) */}
            <ConfirmActionDialog
              open={!!confirmMode}
              onClose={() => setConfirmMode(null)}
              onConfirm={executeDelete}
              title={confirmMode === 'hard' ? '완전 삭제 확인' : '탈퇴 처리 확인'}
              message={confirmMode === 'hard'
                ? '이 회원 데이터를 완전히 삭제합니다.\n이 작업은 되돌릴 수 없습니다.'
                : '이 회원을 탈퇴(비활성) 처리하시겠습니까?'}
              confirmText={confirmMode === 'hard' ? '완전 삭제' : '탈퇴 처리'}
              variant={confirmMode === 'hard' ? 'danger' : 'warning'}
              loading={deleting}
            />
          </div>
        ) : (
          <p className="text-center text-sm text-red-500 py-4">리스크 정보를 불러오지 못했습니다.</p>
        )}
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────

export default function MemberManagementPage() {
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
  const [editTarget, setEditTarget] = useState<KpaMember | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<KpaMember | null>(null);

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
      setPharmacistCount(all.filter(m => m.membership_type === 'pharmacist').length);
      setStudentCount(all.filter(m => m.membership_type === 'student').length);
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

  // Client-side tab filtering (status tabs는 서버사이드이므로 여기선 membership_type만)
  const filteredMembers = useMemo(() => {
    if (activeTab === 'all' || activeTab === 'applications' || activeTab.startsWith('status-')) return members;
    const allowed = ROLE_TAB_FILTER[activeTab];
    if (!allowed || allowed.length === 0) return members;
    return members.filter(m => allowed.includes(m.membership_type));
  }, [members, activeTab]);

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
      width: '80px',
      render: (_v, m) => (
        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${
          m.membership_type === 'student'
            ? 'bg-sky-50 border-sky-200 text-sky-700'
            : 'bg-teal-50 border-teal-200 text-teal-700'
        }`}>
          {m.membership_type === 'student' ? '약대생' : '약사'}
        </span>
      ),
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
      render: (_v, m) => <span className="text-sm text-slate-600">{roleLabels[m.role]}</span>,
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
            edit: () => setEditTarget(m),
            delete: () => setDeleteTargetId(m.id),
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
            <DataTable<KpaMember>
              columns={memberColumns}
              data={filteredMembers}
              rowKey="id"
              loading={memberLoading}
              emptyMessage="회원이 없습니다."
              tableId="kpa-operator-members"
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

      {/* WO-KPA-A-MEMBER-EDIT-AND-DELETE-FLOW-V1: 수정 모달 */}
      {editTarget && (
        <EditMemberModal
          member={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => fetchMembers(memberPage)}
        />
      )}

      {/* WO-KPA-A-MEMBER-EDIT-AND-DELETE-FLOW-V1: 삭제 리스크 모달 */}
      {deleteTargetId && (
        <DeleteRiskModal
          memberId={deleteTargetId}
          onClose={() => setDeleteTargetId(null)}
          onDeleted={() => fetchMembers(memberPage)}
        />
      )}

      {/* 회원 상세 Drawer */}
      <BaseDetailDrawer
        open={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        title={selectedMember ? (selectedMember.user?.name || '-') : ''}
        width={520}
        actions={selectedMember ? [
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
        {selectedMember && (
          <div style={{ fontSize: 14, color: '#374151' }}>
            {/* 기본 정보 */}
            <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 16, color: '#475569', flexShrink: 0 }}>
                  {(selectedMember.user?.name || '-').charAt(0)}
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 15, color: '#1e293b', marginBottom: 2 }}>{selectedMember.user?.name || '-'}</p>
                  <p style={{ fontSize: 13, color: '#64748b' }}>{selectedMember.user?.email || '-'}</p>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <StatusBadge status={selectedMember.status} />
                </div>
              </div>
            </div>

            {/* 상세 필드 — WO-O4O-KPA-MEMBER-PROFILE-CAPABILITY-COLUMN-ADD-V1:
                활동 유형(profile metadata) + 조직 역할(kpa_members.role) 분리.
                권한(capabilities) 은 chip 으로 별도 렌더 (아래). */}
            {([
              { label: '유형', value: selectedMember.membership_type === 'pharmacist' ? '약사' : '약대생' },
              selectedMember.activity_type
                ? { label: '활동 유형', value: ACTIVITY_TYPE_LABELS[selectedMember.activity_type] ?? selectedMember.activity_type }
                : null,
              { label: '조직 역할', value: roleLabels[selectedMember.role] },
              selectedMember.license_number ? { label: '면허번호', value: selectedMember.license_number } : null,
              selectedMember.pharmacy_name ? { label: '약국명', value: selectedMember.pharmacy_name } : null,
              { label: '가입일', value: formatDate(selectedMember.joined_at || selectedMember.created_at) },
            ] as ({ label: string; value: string } | null)[]).filter(Boolean).map((item) => (
              <div key={item!.label} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                <span style={{ fontWeight: 600, color: '#64748b', minWidth: 70 }}>{item!.label}</span>
                <span style={{ color: '#1e293b' }}>{item!.value}</span>
              </div>
            ))}

            {/* 권한 (capability chips) */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 600, color: '#64748b', minWidth: 70 }}>권한</span>
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

            {/* 수정/삭제 링크 */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 12 }}>
              <button
                onClick={() => { setEditTarget(selectedMember); setSelectedMember(null); }}
                style={{ fontSize: 13, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                정보 수정
              </button>
              <button
                onClick={() => { setDeleteTargetId(selectedMember.id); setSelectedMember(null); }}
                style={{ fontSize: 13, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                삭제
              </button>
            </div>
          </div>
        )}
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
