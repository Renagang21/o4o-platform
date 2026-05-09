/**
 * GlycopharmMembersPage
 *
 * WO-GLYCOPHARM-OPERATOR-MEMBER-MANAGEMENT-V1
 * WO-O4O-OPERATOR-DATATABLE-SOURCE-ALIGN-V1: DataTable @o4o/ui → @o4o/operator-ux-core
 *
 * 운영자용 약사 회원 신청 목록 / 상세 / 승인 / 거절 화면
 */

import { useState, useEffect } from 'react';
import {
  Users, CheckCircle, XCircle, Filter, RefreshCw, AlertCircle,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { BaseDetailDrawer } from '@o4o/ui';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { glycopharmApi } from '@/api/glycopharm';
import type { GlycopharmMemberRecord, GlycopharmMemberStatus } from '@/api/glycopharm';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';

type SubRoleFilter = '' | 'pharmacy_owner' | 'staff_pharmacist';

const SUBROLE_LABEL: Record<string, string> = {
  pharmacy_owner: '약국경영자',
  staff_pharmacist: '근무약사',
};


export default function GlycopharmMembersPage() {
  const [members, setMembers] = useState<GlycopharmMemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const totalPages = total > 0 ? Math.ceil(total / 20) : 0;

  // Filters
  const [statusFilter, setStatusFilter] = useState<GlycopharmMemberStatus | ''>('');
  const [subRoleFilter, setSubRoleFilter] = useState<SubRoleFilter>('');
  const [keyword, setKeyword] = useState('');

  // Detail modal
  const [selected, setSelected] = useState<GlycopharmMemberRecord | null>(null);

  // Approve confirm modal
  const [approveTarget, setApproveTarget] = useState<GlycopharmMemberRecord | null>(null);

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState<GlycopharmMemberRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Action state
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadMembers();
  }, [statusFilter, subRoleFilter, page]);

  const loadMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await glycopharmApi.listGlycopharmMembers({
        status: statusFilter || undefined,
        subRole: subRoleFilter || undefined,
        page,
        limit: 20,
      });
      setMembers(res.data.items);
      setTotal(res.data.total);
    } catch (err: any) {
      setError(err?.message || '목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setStatusFilter('');
    setSubRoleFilter('');
    setKeyword('');
    setPage(1);
  };

  // Client-side keyword filter (pharmacyName / licenseNumber)
  const filtered = keyword.trim()
    ? members.filter((m) => {
        const q = keyword.trim().toLowerCase();
        return (
          m.metadata?.pharmacyName?.toLowerCase().includes(q) ||
          m.metadata?.licenseNumber?.toLowerCase().includes(q)
        );
      })
    : members;

  const handleApprove = async () => {
    if (!approveTarget) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await glycopharmApi.approveMember(approveTarget.id);
      setApproveTarget(null);
      loadMembers();
    } catch (err: any) {
      setActionError(err?.response?.data?.error || '승인 처리 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await glycopharmApi.rejectMember(rejectTarget.id, rejectReason.trim() || undefined);
      setRejectTarget(null);
      setRejectReason('');
      loadMembers();
    } catch (err: any) {
      setActionError(err?.response?.data?.error || '거절 처리 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (record: GlycopharmMemberRecord) => {
    setSelected(null);
    setRejectReason('');
    setActionError(null);
    setRejectTarget(record);
  };

  const openApproveModal = (record: GlycopharmMemberRecord) => {
    setSelected(null);
    setActionError(null);
    setApproveTarget(record);
  };

  const hasFilters = statusFilter || subRoleFilter;

  const columns: ListColumnDef<GlycopharmMemberRecord>[] = [
    {
      key: 'membershipType',
      header: '유형',
      width: '80px',
      render: () => '약사',
    },
    {
      key: 'subRole',
      header: '세부직역',
      width: '130px',
      render: (v) => (v ? (SUBROLE_LABEL[v as string] ?? v) : '-'),
    },
    {
      key: 'licenseNumber',
      header: '면허번호',
      width: '130px',
      render: (_v, r) => r.metadata?.licenseNumber || '-',
    },
    {
      key: 'pharmacyName',
      header: '약국명',
      render: (_v, r) => r.metadata?.pharmacyName || '-',
    },
    {
      key: 'status',
      header: '상태',
      width: '100px',
      render: (v) => <StatusBadge status={v} />,
    },
    {
      key: 'createdAt',
      header: '신청일',
      width: '110px',
      sortable: true,
      sortAccessor: (r) => new Date(r.createdAt).getTime(),
      render: (v) => new Date(v).toLocaleDateString('ko-KR'),
    },
    {
      key: '_actions',
      header: '관리',
      system: true,
      width: '80px',
      align: 'right',
      render: (_v, record) => (
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {record.status === 'pending' && (
            <>
              <button
                onClick={() => openApproveModal(record)}
                title="승인"
                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => openRejectModal(record)}
                title="거절"
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="약사 회원 관리"
        description="약사 회원 신청을 검토하고 승인/거절 처리합니다."
        icon={<Users className="w-6 h-6 text-primary-600" />}
        actions={
          <button
            onClick={() => { setPage(1); loadMembers(); }}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            title="새로고침"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">필터</span>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto text-sm text-primary-600 hover:text-primary-700"
            >
              필터 초기화
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">상태</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as GlycopharmMemberStatus | '');
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">전체</option>
              <option value="pending">대기</option>
              <option value="approved">승인됨</option>
              <option value="rejected">반려됨</option>
              <option value="suspended">정지됨</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">세부직역</label>
            <select
              value={subRoleFilter}
              onChange={(e) => {
                setSubRoleFilter(e.target.value as SubRoleFilter);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">전체</option>
              <option value="pharmacy_owner">약국경영자</option>
              <option value="staff_pharmacist">근무약사</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">검색 (약국명 / 면허번호)</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="약국명 또는 면허번호"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-sm text-slate-500">
          총 <span className="font-medium text-slate-700">{total}</span>건
        </span>
      </div>

      {/* Error */}
      {error && !loading && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center mb-4">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadMembers}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm">
        <DataTable<GlycopharmMemberRecord>
          columns={columns}
          data={filtered}
          rowKey="id"
          loading={loading}
          onRowClick={(r) => setSelected(r)}
          emptyMessage="등록된 약사 회원 신청이 없습니다"
          tableId="glycopharm-operator-members"
        />
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 py-4 border-t border-slate-100">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-2 border rounded-lg disabled:opacity-50 hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" />
              이전
            </button>
            <span className="text-sm text-slate-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-2 border rounded-lg disabled:opacity-50 hover:bg-slate-50"
            >
              다음
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── 상세 Drawer ── */}
      <BaseDetailDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.metadata?.pharmacyName || '회원 신청 상세'}
        width={520}
        actions={
          selected?.status === 'pending'
            ? [
                { label: '거절', onClick: () => openRejectModal(selected), variant: 'danger' },
                { label: '승인', onClick: () => openApproveModal(selected), variant: 'primary' },
              ]
            : []
        }
      >
        {selected && (
          <div style={{ fontSize: 14, color: '#374151' }}>
            {[
              { label: '사용자 ID', value: <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{selected.userId}</span> },
              { label: '회원 유형', value: '약사' },
              { label: '세부직역', value: selected.subRole ? (SUBROLE_LABEL[selected.subRole] ?? selected.subRole) : '-' },
              { label: '면허번호', value: selected.metadata?.licenseNumber || '-' },
              { label: '약국명', value: selected.metadata?.pharmacyName || '-' },
              { label: '약국 주소', value: selected.metadata?.pharmacyAddress || '-' },
              { label: '상태', value: <StatusBadge status={selected.status} /> },
              ...(selected.rejectionReason ? [{ label: '거절 사유', value: <span style={{ color: '#dc2626' }}>{selected.rejectionReason}</span> }] : []),
              { label: '신청일', value: new Date(selected.createdAt).toLocaleDateString('ko-KR') },
              ...(selected.approvedAt ? [{ label: '승인일', value: new Date(selected.approvedAt).toLocaleDateString('ko-KR') }] : []),
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                <span style={{ fontWeight: 600, color: '#64748b', minWidth: 80, flexShrink: 0 }}>{item.label}</span>
                <span style={{ color: '#1e293b' }}>{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </BaseDetailDrawer>

      {/* ── 승인 확인 모달 ── */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5">
              <h2 className="text-lg font-bold text-slate-800 mb-2">승인 확인</h2>
              <p className="text-slate-500 text-sm">
                이 회원 신청을 승인하시겠습니까?
                승인 시 <strong className="text-slate-700">glycopharm:pharmacist</strong> 역할이 부여됩니다.
              </p>
              {actionError && (
                <div className="mt-3 flex items-center gap-2 bg-red-50 text-red-700 rounded-lg px-3 py-2 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {actionError}
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => { setApproveTarget(null); setActionError(null); }}
                disabled={actionLoading}
                className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? '처리 중...' : '승인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 거절 모달 ── */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5">
              <h2 className="text-lg font-bold text-slate-800 mb-2">거절 처리</h2>
              <p className="text-slate-500 text-sm mb-3">거절 사유를 입력하면 신청자 화면에 표시됩니다.</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="거절 사유 입력 (선택)"
                rows={3}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {actionError && (
                <div className="mt-3 flex items-center gap-2 bg-red-50 text-red-700 rounded-lg px-3 py-2 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {actionError}
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => { setRejectTarget(null); setRejectReason(''); setActionError(null); }}
                disabled={actionLoading}
                className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? '처리 중...' : '거절'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
