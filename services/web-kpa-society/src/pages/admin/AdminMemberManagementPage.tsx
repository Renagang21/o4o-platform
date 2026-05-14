/**
 * AdminMemberManagementPage — KPA 관리자(admin) 전용 회원관리
 *
 * WO-O4O-KPA-ADMIN-MEMBER-MANAGEMENT-SEPARATION-V1
 *
 * /operator/members 와 분리된 admin 전용 회원관리 화면.
 *   - 잘못 가입된 회원 / 탈퇴 처리된 회원 / 테스트 회원 정리
 *   - 면허번호(license_number) 중복 해소를 위한 완전삭제 워크플로우
 *   - 승인/반려/정지/복원/탈퇴 처리는 /operator/members 잔존
 *
 * 정책 (WO-O4O-KPA-MEMBER-HARDDELETE-ADMIN-FOR-MISREGISTRATION-V1 + 본 WO):
 *   - hard delete: kpa:admin 전용 (백엔드 가드)
 *   - 활동 데이터(forum_post / forum_comment) 있어도 완전삭제 가능 — 강한 경고로 보호
 *   - 단일 선택 시만 완전삭제 (DeleteRiskModal 단일 회원 기준)
 *
 * 진입: AdminAuthGuard (kpa:admin 또는 membershipRole='admin')
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Trash2, RefreshCw, Users, AlertCircle, ShieldAlert } from 'lucide-react';
import { ActionBar } from '@o4o/ui';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef, MemberTab } from '@o4o/operator-ux-core';
import { MemberListLayout } from '@o4o/operator-ux-core';
import { apiClient } from '../../api/client';
import { MemberDeleteRiskModal } from './components/MemberDeleteRiskModal';

// ─── Types ──────────────────────────────────────────────────────

type MemberStatus = 'pending' | 'active' | 'suspended' | 'rejected' | 'withdrawn';

interface KpaMember {
  // WO-O4O-KPA-OPERATOR-MEMBER-LIST-SOURCE-FIX-V1:
  //   id = kpa_members.id (존재 시) | service_memberships.id (없을 시)
  id: string;
  sm_id: string;
  has_kpa_member: boolean;
  user_id: string;
  organization_id: string | null;
  role: string | null;
  status: MemberStatus;
  membership_type: string | null;
  license_number: string | null;
  pharmacy_name: string | null;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
  user?: { name?: string; email?: string };
}

// ─── Status Display ─────────────────────────────────────────────

const STATUS_LABEL: Record<MemberStatus, { label: string; bg: string; color: string }> = {
  pending:   { label: '승인 대기', bg: 'bg-amber-50',  color: 'text-amber-700' },
  active:    { label: '활성',     bg: 'bg-green-50',  color: 'text-green-700' },
  suspended: { label: '정지',     bg: 'bg-orange-50', color: 'text-orange-700' },
  rejected:  { label: '반려',     bg: 'bg-red-50',    color: 'text-red-700' },
  withdrawn: { label: '탈퇴',     bg: 'bg-slate-100', color: 'text-slate-500' },
};

const STATUS_TAB_FILTER: Record<string, MemberStatus | ''> = {
  all: '',
  'status-withdrawn': 'withdrawn',
  'status-suspended': 'suspended',
  'status-rejected':  'rejected',
  'status-pending':   'pending',
  'status-active':    'active',
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('ko-KR');
}

function maskLicense(license: string | null): string {
  if (!license) return '-';
  if (license.length <= 4) return license;
  // 앞 2글자 + ****
  return license.slice(0, 2) + '*'.repeat(Math.max(0, license.length - 2));
}

// ─── Page ────────────────────────────────────────────────────────

export default function AdminMemberManagementPage() {
  const [activeTab, setActiveTab] = useState('status-withdrawn');
  const [members, setMembers] = useState<KpaMember[]>([]);
  const [memberTotal, setMemberTotal] = useState(0);
  const [memberPage, setMemberPage] = useState(1);
  const [memberTotalPages, setMemberTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Status counts (전체 lifecycle 대시보드용)
  const [counts, setCounts] = useState({
    withdrawn: 0,
    suspended: 0,
    rejected: 0,
    pending: 0,
    active: 0,
    total: 0,
  });

  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────
  const fetchMembers = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const reqParams: Record<string, string | number | boolean | undefined> = { page, limit: 20 };
      if (searchQuery) reqParams.search = searchQuery;
      const statusFilter = STATUS_TAB_FILTER[activeTab] || '';
      if (statusFilter) reqParams.status = statusFilter;

      const res = await apiClient.get<{ data: KpaMember[]; total: number; totalPages: number }>(
        '/members',
        reqParams,
      );
      setMembers(res.data);
      setMemberTotal(res.total);
      setMemberTotalPages(Math.max(1, res.totalPages || 1));

      // 별도 1-shot 으로 lifecycle 카운트 (limit=1000)
      const allRes = await apiClient.get<{ data: KpaMember[]; total: number }>('/members', { limit: 1000 });
      const all = allRes.data || [];
      setCounts({
        withdrawn: all.filter((m) => m.status === 'withdrawn').length,
        suspended: all.filter((m) => m.status === 'suspended').length,
        rejected:  all.filter((m) => m.status === 'rejected').length,
        pending:   all.filter((m) => m.status === 'pending').length,
        active:    all.filter((m) => m.status === 'active').length,
        total:     allRes.total ?? all.length,
      });
    } catch (e: any) {
      setError(e.message || '회원 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeTab]);

  useEffect(() => {
    fetchMembers(1);
    setMemberPage(1);
  }, [fetchMembers]);

  // 탭/검색 전환 시 사라진 selection 정리
  useEffect(() => {
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
  }, [members]);

  // ── Hard delete entry — single select ────────────────────────
  const handleHardDelete = useCallback(() => {
    if (selectedIds.size !== 1) return;
    const [onlyId] = Array.from(selectedIds);
    setDeleteTargetId(onlyId);
  }, [selectedIds]);

  // ── Tabs (lifecycle 정리 대상 중심으로 정렬) ─────────────────
  const tabs: MemberTab[] = [
    { key: 'status-withdrawn', label: '탈퇴',     count: counts.withdrawn },
    { key: 'status-suspended', label: '정지',     count: counts.suspended },
    { key: 'status-rejected',  label: '반려',     count: counts.rejected },
    { key: 'status-pending',   label: '승인 대기', count: counts.pending },
    { key: 'status-active',    label: '활성',     count: counts.active },
    { key: 'all',              label: '전체',     count: memberTotal },
  ];

  // ── Columns ──────────────────────────────────────────────────
  const columns: ListColumnDef<KpaMember>[] = useMemo(() => [
    {
      key: 'user.name',
      header: '회원',
      sortable: true,
      sortAccessor: (m) => m.user?.name ?? '',
      render: (_v, m) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-800">{m.user?.name ?? '-'}</span>
          <span className="text-xs text-slate-500">{m.user?.email ?? '-'}</span>
        </div>
      ),
    },
    {
      key: 'membership_type',
      header: '구분',
      width: '100px',
      render: (_v, m) => {
        if (!m.has_kpa_member) {
          return <span className="text-xs px-2 py-0.5 bg-slate-50 text-slate-400 rounded italic">KPA 프로필 없음</span>;
        }
        const isStudent = m.membership_type === 'student' || m.membership_type === 'pharmacy_student_member';
        return (
          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
            {isStudent ? '약대생' : '약사'}
          </span>
        );
      },
    },
    {
      key: 'license_number',
      header: '면허번호',
      width: '140px',
      render: (_v, m) => (
        <span className="text-xs font-mono text-slate-600" title={m.license_number ?? ''}>
          {maskLicense(m.license_number)}
        </span>
      ),
    },
    {
      key: 'status',
      header: '상태',
      width: '110px',
      sortable: true,
      sortAccessor: (m) => m.status,
      render: (_v, m) => {
        const meta = STATUS_LABEL[m.status] ?? { label: m.status, bg: 'bg-slate-100', color: 'text-slate-700' };
        return (
          <span className={`text-xs px-2 py-0.5 rounded ${meta.bg} ${meta.color}`}>{meta.label}</span>
        );
      },
    },
    {
      key: 'updated_at',
      header: '최근 변경',
      width: '120px',
      sortable: true,
      sortAccessor: (m) => m.updated_at,
      render: (_v, m) => <span className="text-xs text-slate-500">{formatDate(m.updated_at)}</span>,
    },
    {
      key: 'created_at',
      header: '가입일',
      width: '120px',
      sortable: true,
      sortAccessor: (m) => m.created_at,
      render: (_v, m) => <span className="text-xs text-slate-500">{formatDate(m.created_at)}</span>,
    },
  ], []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* 헤더 안내 */}
      <div className="flex items-start gap-3 mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
        <div className="text-sm text-red-700 space-y-1">
          <p className="font-semibold">관리자 전용 회원관리 — 완전삭제 워크플로우</p>
          <p>
            잘못 가입된 회원, 탈퇴 처리된 회원, 테스트 회원 등의 데이터를 완전삭제하여{' '}
            <strong>면허번호 중복 / 가입 이력</strong>을 해제합니다.
            승인/반려/정지/복원/탈퇴 처리 는{' '}
            <a href="/operator/members" className="underline">운영자 회원관리</a>{' '}
            에서 수행하세요.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">총 회원</p>
              <p className="text-xl font-bold text-slate-900">{counts.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">탈퇴 (정리 대상)</p>
              <p className="text-xl font-bold text-slate-900">{counts.withdrawn}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">정지 + 반려</p>
              <p className="text-xl font-bold text-slate-900">{counts.suspended + counts.rejected}</p>
            </div>
          </div>
        </div>
      </div>

      {/* MemberListLayout — operator 와 동일 컴포넌트 */}
      <MemberListLayout
        title="회원관리 (관리자)"
        description="잘못 가입된 회원 정리 / 면허번호 중복 해소 / 완전삭제 워크플로우"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        search={search}
        onSearchChange={setSearch}
        onSearch={setSearchQuery}
        searchPlaceholder="이름, 이메일로 검색"
        headerActions={
          <button
            onClick={() => fetchMembers(memberPage)}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />새로고침
          </button>
        }
      >
        {error && (
          <div className="flex items-center gap-2 p-4 text-sm text-red-700 bg-red-50">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {/* Admin bulk action — 완전삭제만 (단일 선택 시만 활성) */}
        <div className="mb-3">
          <ActionBar
            selectedCount={selectedIds.size}
            onClearSelection={() => setSelectedIds(new Set())}
            actions={[
              {
                key: 'hard-delete',
                label: selectedIds.size === 1 ? '완전삭제' : '완전삭제 (1명만)',
                onClick: handleHardDelete,
                variant: 'danger' as const,
                icon: <Trash2 size={14} />,
                group: 'danger' as const,
                tooltip: selectedIds.size === 1
                  ? '선택한 회원을 완전삭제합니다 (면허번호/연결 데이터까지 정리)'
                  : '완전삭제는 1명 선택 시에만 가능합니다',
                visible: selectedIds.size > 0,
                disabled: selectedIds.size !== 1,
              },
            ]}
          />
        </div>

        <DataTable<KpaMember>
          columns={columns}
          data={members}
          rowKey="id"
          loading={loading}
          emptyMessage="회원이 없습니다."
          tableId="kpa-admin-members"
          selectable
          selectedKeys={selectedIds}
          onSelectionChange={setSelectedIds}
        />

        {/* Pagination */}
        {memberTotalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              type="button"
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => { const next = Math.max(1, memberPage - 1); setMemberPage(next); fetchMembers(next); }}
              disabled={memberPage <= 1 || loading}
            >
              이전
            </button>
            <span className="text-sm text-slate-600">{memberPage} / {memberTotalPages}</span>
            <button
              type="button"
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => { const next = Math.min(memberTotalPages, memberPage + 1); setMemberPage(next); fetchMembers(next); }}
              disabled={memberPage >= memberTotalPages || loading}
            >
              다음
            </button>
          </div>
        )}
      </MemberListLayout>

      {/* Hard delete modal */}
      {deleteTargetId && (
        <MemberDeleteRiskModal
          memberId={deleteTargetId}
          onClose={() => setDeleteTargetId(null)}
          onDeleted={() => {
            setSelectedIds((prev) => {
              if (!prev.has(deleteTargetId)) return prev;
              const next = new Set(prev);
              next.delete(deleteTargetId);
              return next;
            });
            fetchMembers(memberPage);
          }}
        />
      )}
    </div>
  );
}
