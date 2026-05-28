/**
 * AdminMemberManagementPage — Neture admin 전용 회원 완전삭제 관리
 *
 * WO-O4O-NETURE-ADMIN-MEMBER-HARD-DELETE-V1
 *
 * - 잘못 가입된 회원, 테스트 계정, 탈퇴 후 재가입 필요 회원 정리
 * - 완전삭제(hard delete): service_memberships + role_assignments 제거, users 비활성화
 * - 승인/반려/정지/비활성화(soft delete)는 /operator/members 에서 수행 (legacy: /operator/users)
 * - 단일 선택 시만 완전삭제 가능 (대량 삭제 제외)
 *
 * 진입: AdminRoute (neture:admin 또는 platform:super_admin)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Trash2, RefreshCw, Users, ShieldAlert, AlertCircle } from 'lucide-react';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { api } from '../../lib/apiClient';
import { AdminMemberDeleteModal } from './components/AdminMemberDeleteModal';

// ─── Types ──────────────────────────────────────────────────────────────────

type MemberStatus = 'pending' | 'active' | 'suspended' | 'rejected' | 'withdrawn' | 'deleted' | string;

interface NMember {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  status: MemberStatus;
  isActive: boolean;
  roles: string[];
  memberships: Array<{ serviceKey: string; status: string; role: string }>;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: '승인 대기', bg: 'bg-amber-50',  color: 'text-amber-700'  },
  active:    { label: '활성',      bg: 'bg-green-50',  color: 'text-green-700'  },
  suspended: { label: '정지',      bg: 'bg-orange-50', color: 'text-orange-700' },
  rejected:  { label: '반려',      bg: 'bg-red-50',    color: 'text-red-700'    },
  withdrawn: { label: '탈퇴',      bg: 'bg-slate-100', color: 'text-slate-500'  },
  deleted:   { label: '삭제됨',    bg: 'bg-slate-200', color: 'text-slate-500'  },
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('ko-KR');
}

function getDisplayName(m: NMember): string {
  if (m.name) return m.name;
  const full = `${m.lastName || ''}${m.firstName || ''}`.trim();
  return full || m.email;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type TabKey = 'all' | 'pending' | 'active' | 'suspended' | 'rejected' | 'withdrawn';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'withdrawn', label: '탈퇴' },
  { key: 'suspended', label: '정지' },
  { key: 'rejected',  label: '반려' },
  { key: 'pending',   label: '승인 대기' },
  { key: 'active',    label: '활성' },
  { key: 'all',       label: '전체' },
];

export default function AdminMemberManagementPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [members, setMembers] = useState<NMember[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchMembers = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        serviceKey: 'neture',
      });
      if (searchQuery) params.set('search', searchQuery);
      if (activeTab !== 'all') params.set('status', activeTab);

      const res = await api.get<{ success: boolean; users: NMember[]; pagination: Pagination }>(
        `/operator/members?${params.toString()}`
      );
      setMembers(res.users || []);
      setPagination(res.pagination || { page, limit: 20, total: 0, totalPages: 1 });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '회원 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeTab]);

  useEffect(() => {
    fetchMembers(1);
    setPagination((p) => ({ ...p, page: 1 }));
  }, [fetchMembers]);

  // 탭/검색 전환 시 선택 정리
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const validIds = new Set(members.map((m) => m.id));
      const next = new Set<string>();
      let changed = false;
      prev.forEach((id) => {
        if (validIds.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [members]);

  // ── Operator role check helper ─────────────────────────────────────────────
  const OPERATOR_ROLES_SET = new Set(['neture:operator', 'neture:admin']);

  const getSelectedOperatorBlock = useCallback((): string | null => {
    if (selectedIds.size !== 1) return null;
    const [onlyId] = Array.from(selectedIds);
    const target = members.find((m) => m.id === onlyId);
    if (!target) return null;
    const activeOpRole = target.roles.find((r) => OPERATOR_ROLES_SET.has(r));
    return activeOpRole ?? null;
  }, [selectedIds, members]);

  // ── Hard delete entry ─────────────────────────────────────────────────────
  const handleHardDelete = useCallback(() => {
    if (selectedIds.size !== 1) return;
    const [onlyId] = Array.from(selectedIds);
    const target = members.find((m) => m.id === onlyId);
    if (!target) return;
    // Block delete if member has active operator role
    const blockingRole = target.roles.find((r) => OPERATOR_ROLES_SET.has(r));
    if (blockingRole) {
      // toast import is not in this file — use window alert as fallback
      alert(`이 계정은 '${blockingRole}' 운영자 권한을 보유하고 있습니다.\n운영자 관리(/admin/operators)에서 권한을 해제한 후 삭제해주세요.`);
      return;
    }
    setDeleteTarget({ id: onlyId, name: getDisplayName(target) });
  }, [selectedIds, members]);

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns: ListColumnDef<NMember>[] = useMemo(() => [
    {
      key: 'name',
      header: '회원',
      sortable: true,
      sortAccessor: (m) => getDisplayName(m),
      render: (_v, m) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-800">{getDisplayName(m)}</span>
          <span className="text-xs text-slate-500">{m.email}</span>
        </div>
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
      key: 'memberships',
      header: '서비스 연결',
      width: '110px',
      render: (_v, m) => (
        <span className="text-xs text-slate-500">{m.memberships.length}개</span>
      ),
    },
    {
      key: 'roles',
      header: '역할',
      width: '160px',
      render: (_v, m) => (
        <span className="text-xs text-slate-500 font-mono">
          {m.roles.length > 0 ? m.roles.join(', ') : '-'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: '가입일',
      width: '110px',
      sortable: true,
      sortAccessor: (m) => m.createdAt,
      render: (_v, m) => <span className="text-xs text-slate-500">{formatDate(m.createdAt)}</span>,
    },
  ], []);

  const page = pagination.page;
  const totalPages = pagination.totalPages;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* 헤더 경고 배너 */}
      <div className="flex items-start gap-3 mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
        <div className="text-sm text-red-700 space-y-1">
          <p className="font-semibold">admin 전용 회원관리 — 완전삭제 워크플로우</p>
          <p>
            잘못 가입된 회원, 테스트 계정 등을 완전삭제합니다.
            승인·반려·정지·비활성화(soft delete)는{' '}
            <a href="/operator/members" className="underline">운영자 회원관리</a>에서 수행하세요.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">전체 회원 (현재 필터)</p>
            <p className="text-xl font-bold text-slate-900">{pagination.total}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500">선택</p>
            <p className="text-xl font-bold text-slate-900">{selectedIds.size}명</p>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 검색 + 새로고침 */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') setSearchQuery(search); }}
          placeholder="이름, 이메일로 검색 (Enter)"
          className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          type="button"
          onClick={() => setSearchQuery(search)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          검색
        </button>
        <button
          type="button"
          onClick={() => fetchMembers(page)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" />새로고침
        </button>
      </div>

      {/* ActionBar — 완전삭제 (단일 선택 시만 활성) */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg">
          <span className="text-sm text-slate-600">{selectedIds.size}명 선택됨</span>
          {getSelectedOperatorBlock() ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">
              <ShieldAlert className="w-4 h-4" />
              운영자 권한 보유 — 먼저 운영자 관리에서 권한을 해제하세요
            </div>
          ) : (
            <button
              type="button"
              onClick={handleHardDelete}
              disabled={selectedIds.size !== 1}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
              title={selectedIds.size !== 1 ? '완전삭제는 1명 선택 시만 가능합니다' : '선택한 회원을 완전삭제합니다'}
            >
              <Trash2 className="w-4 h-4" />
              {selectedIds.size === 1 ? '완전삭제' : '완전삭제 (1명만)'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-slate-400 hover:text-slate-600"
          >
            선택 해제
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 mb-3 text-sm text-red-700 bg-red-50 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* DataTable */}
      <DataTable<NMember>
        columns={columns}
        data={members}
        rowKey="id"
        loading={loading}
        emptyMessage="회원이 없습니다."
        tableId="neture-admin-members"
        selectable
        selectedKeys={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            type="button"
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => { const next = Math.max(1, page - 1); fetchMembers(next); }}
            disabled={page <= 1 || loading}
          >
            이전
          </button>
          <span className="text-sm text-slate-600">{page} / {totalPages}</span>
          <button
            type="button"
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => { const next = Math.min(totalPages, page + 1); fetchMembers(next); }}
            disabled={page >= totalPages || loading}
          >
            다음
          </button>
        </div>
      )}

      {/* Hard delete modal */}
      {deleteTarget && (
        <AdminMemberDeleteModal
          userId={deleteTarget.id}
          userName={deleteTarget.name}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setSelectedIds((prev) => {
              const next = new Set(prev);
              next.delete(deleteTarget.id);
              return next;
            });
            fetchMembers(page);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}
