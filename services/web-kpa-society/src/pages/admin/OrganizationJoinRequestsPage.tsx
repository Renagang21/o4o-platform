/**
 * OrganizationJoinRequestsPage - 조직 가입/역할 요청 관리 (운영자)
 *
 * WO-CONTEXT-JOIN-REQUEST-MVP-V1
 * WO-O4O-TABLE-STANDARD-V2 — DataTable 표준 전환
 *
 * 공통 joinRequestApi 사용
 */

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { ActionBar } from '@o4o/ui';
import { DataTable, Pagination } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { joinRequestApi } from '../../api/joinRequestApi';
import type { OrganizationJoinRequest } from '../../types/joinRequest';
import {
  JOIN_REQUEST_TYPE_LABELS,
  REQUESTED_ROLE_LABELS,
} from '../../types/joinRequest';

export function OrganizationJoinRequestsPage() {
  const [requests, setRequests] = useState<OrganizationJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reviewNoteId, setReviewNoteId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  // Selection & Bulk
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await joinRequestApi.getPending({ page, limit: 20 });
      setRequests(response.data.items);
      setTotalPages(response.data.pagination.totalPages);
      setTotal(response.data.pagination.total ?? response.data.items.length);
    } catch (err: any) {
      setError(err.message || '요청 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Reset selection on page change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page]);

  const handleApprove = async (id: string) => {
    if (!confirm('이 요청을 승인하시겠습니까?')) return;
    setActionLoading(id);
    try {
      const note = reviewNoteId === id ? reviewNote : undefined;
      await joinRequestApi.approve(id, note);
      setReviewNoteId(null);
      setReviewNote('');
      await loadRequests();
    } catch (err: any) {
      toast.error(err.message || '승인에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('이 요청을 반려하시겠습니까?')) return;
    setActionLoading(id);
    try {
      const note = reviewNoteId === id ? reviewNote : undefined;
      await joinRequestApi.reject(id, note);
      setReviewNoteId(null);
      setReviewNote('');
      await loadRequests();
    } catch (err: any) {
      toast.error(err.message || '반려에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Bulk Actions ───

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkProcessing(true);
    let success = 0;
    for (const id of selectedIds) {
      try {
        await joinRequestApi.approve(id);
        success++;
      } catch { /* continue */ }
    }
    setIsBulkProcessing(false);
    setSelectedIds(new Set());
    toast.success(`${success}건 일괄 승인 완료`);
    loadRequests();
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkProcessing(true);
    let success = 0;
    for (const id of selectedIds) {
      try {
        await joinRequestApi.reject(id, '일괄 반려');
        success++;
      } catch { /* continue */ }
    }
    setIsBulkProcessing(false);
    setSelectedIds(new Set());
    toast.success(`${success}건 일괄 반려 완료`);
    loadRequests();
  };

  // ─── Column Definitions ───

  const columns: ListColumnDef<OrganizationJoinRequest>[] = [
    {
      key: 'request_type',
      header: '요청 유형',
      render: (_v, row) => JOIN_REQUEST_TYPE_LABELS[row.request_type] || row.request_type,
    },
    {
      key: 'requested_role',
      header: '요청 역할',
      render: (_v, row) => REQUESTED_ROLE_LABELS[row.requested_role] || row.requested_role,
    },
    {
      key: 'requested_sub_role',
      header: '세부 역할',
      render: (_v, row) => row.requested_sub_role || '-',
    },
    {
      key: 'user_id',
      header: '요청자 ID',
      render: (_v, row) => (
        <span className="text-xs font-mono text-slate-600">{row.user_id.slice(0, 8)}...</span>
      ),
    },
    {
      key: 'organization_id',
      header: '조직 ID',
      render: (_v, row) => (
        <span className="text-xs font-mono text-slate-600">{row.organization_id.slice(0, 8)}...</span>
      ),
    },
    {
      key: 'created_at',
      header: '요청일',
      sortable: true,
      sortAccessor: (row) => new Date(row.created_at).getTime(),
      render: (_v, row) => new Date(row.created_at).toLocaleDateString('ko-KR'),
    },
    {
      key: '_actions',
      header: '처리',
      system: true,
      align: 'center',
      width: '220px',
      onCellClick: () => {},
      render: (_v, row) => (
        <div>
          <div className="flex gap-1.5 justify-center">
            <button
              onClick={() =>
                reviewNoteId === row.id
                  ? setReviewNoteId(null)
                  : (setReviewNoteId(row.id), setReviewNote(''))
              }
              className="px-2.5 py-1 text-xs bg-slate-100 border border-slate-300 rounded hover:bg-slate-200"
            >
              메모
            </button>
            <button
              onClick={() => handleApprove(row.id)}
              disabled={actionLoading === row.id}
              className="px-3 py-1 text-xs font-semibold text-white bg-green-500 rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              승인
            </button>
            <button
              onClick={() => handleReject(row.id)}
              disabled={actionLoading === row.id}
              className="px-3 py-1 text-xs font-semibold text-white bg-red-500 rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              반려
            </button>
          </div>
          {reviewNoteId === row.id && (
            <div className="mt-2">
              <input
                type="text"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="처리 메모 입력"
                className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          )}
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-2">조직 가입/역할 요청 관리</h2>
        <p className="text-sm text-slate-500 mb-6">대기 중인 가입 및 역할 요청을 확인하고 승인/반려합니다.</p>
        <div className="text-center py-10 text-red-600">
          {error}
          <button
            onClick={loadRequests}
            className="block mx-auto mt-3 px-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-200"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-2">조직 가입/역할 요청 관리</h2>
      <p className="text-sm text-slate-500 mb-6">대기 중인 가입 및 역할 요청을 확인하고 승인/반려합니다.</p>

      {/* ActionBar */}
      <ActionBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        actions={[
          {
            key: 'approve',
            label: `승인 (${selectedIds.size})`,
            onClick: handleBulkApprove,
            variant: 'primary',
            icon: <CheckCircle size={14} />,
            loading: isBulkProcessing,
          },
          {
            key: 'reject',
            label: `반려 (${selectedIds.size})`,
            onClick: handleBulkReject,
            variant: 'danger',
            icon: <XCircle size={14} />,
            loading: isBulkProcessing,
          },
        ]}
      />

      {/* DataTable */}
      <DataTable<OrganizationJoinRequest>
        columns={columns}
        data={requests}
        rowKey="id"
        loading={loading}
        emptyMessage="대기 중인 요청이 없습니다."
        tableId="kpa-org-join-requests"
        selectable
        selectedKeys={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        total={total}
      />
    </div>
  );
}
