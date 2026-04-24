/**
 * MemberManagementPage - KPA-a 회원 관리 & 가입 신청 관리
 * WO-KPA-A-MEMBER-APPROVAL-UI-PHASE1-V1
 * WO-O4O-MEMBER-LIST-STANDARDIZATION-V1
 *
 * MemberListLayout + @o4o/ui DataTable 기반 표준화.
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
import { DataTable, RowActionMenu, ConfirmActionDialog } from '@o4o/ui';
import type { Column } from '@o4o/ui';
import { MemberListLayout, StatusBadge, defineActionPolicy, buildRowActions } from '@o4o/operator-ux-core';
import type { MemberTab } from '@o4o/operator-ux-core';
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
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editTarget, setEditTarget] = useState<KpaMember | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

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

  // DataTable columns for members
  const memberColumns: Column<KpaMember>[] = [
    {
      key: 'name',
      title: '이름',
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
      sorter: (a, b) => (a.user?.name || '').localeCompare(b.user?.name || ''),
    },
    {
      key: 'email',
      title: '이메일',
      sortable: true,
      width: '200px',
      render: (_v, m) => <span className="text-sm text-slate-600">{m.user?.email || '-'}</span>,
      sorter: (a, b) => (a.user?.email || '').localeCompare(b.user?.email || ''),
    },
    {
      key: 'membership_type',
      title: '유형',
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
    {
      key: 'role',
      title: '역할',
      width: '80px',
      render: (_v, m) => <span className="text-sm text-slate-600">{roleLabels[m.role]}</span>,
    },
    {
      key: 'status',
      title: '상태',
      width: '80px',
      render: (_v, m) => <StatusBadge status={m.status} />,
    },
    {
      key: 'joined_at',
      title: '가입일',
      sortable: true,
      width: '100px',
      render: (_v, m) => <span className="text-sm text-slate-500">{formatDate(m.joined_at || m.created_at)}</span>,
      sorter: (a, b) => new Date(a.joined_at || a.created_at).getTime() - new Date(b.joined_at || b.created_at).getTime(),
    },
    {
      key: '_actions',
      title: '액션',
      width: '60px',
      align: 'center',
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
              dataSource={filteredMembers}
              rowKey="id"
              loading={memberLoading}
              emptyText="회원이 없습니다."
              pagination={{
                current: memberPage,
                pageSize: 20,
                total: activeTab === 'all' ? memberTotal : filteredMembers.length,
                onChange: (page) => { setMemberPage(page); fetchMembers(page); },
              }}
            />
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
