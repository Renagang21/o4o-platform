/**
 * OrganizationJoinRequestsPage - 조직 가입/역할 요청 관리 (운영자)
 *
 * WO-CONTEXT-JOIN-REQUEST-MVP-V1
 * WO-O4O-TABLE-STANDARD-V2 — DataTable 표준 전환
 * WO-O4O-TABLE-STANDARD-V3 — Batch API + ActionBar v2 + AI 요약
 *
 * 공통 joinRequestApi 사용
 */

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { ActionBar, BulkResultModal, RowActionMenu } from '@o4o/ui';
import { DataTable, Pagination, useBatchAction, defineActionPolicy, buildRowActions } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { joinRequestApi } from '../../api/joinRequestApi';
import type { OrganizationJoinRequest } from '../../types/joinRequest';
import {
  JOIN_REQUEST_TYPE_LABELS,
  REQUESTED_ROLE_LABELS,
} from '../../types/joinRequest';

// ─── V4-EXPANSION: Action Policy ───

const joinRequestPolicy = defineActionPolicy<OrganizationJoinRequest>('kpa:join-request', {
  inlineMax: 2,
  rules: [
    {
      key: 'approve',
      label: '승인',
      variant: 'primary',
      confirm: {
        title: '승인 확인',
        message: '이 요청을 승인하시겠습니까?',
        confirmText: '승인',
        showReason: true,
        reasonPlaceholder: '처리 메모 입력 (선택)',
      },
    },
    {
      key: 'reject',
      label: '반려',
      variant: 'danger',
      confirm: {
        title: '반려 확인',
        message: '이 요청을 반려하시겠습니까?',
        variant: 'danger',
        confirmText: '반려',
        showReason: true,
        reasonPlaceholder: '반려 사유 입력 (선택)',
      },
    },
  ],
});

const JOIN_REQUEST_ICONS: Record<string, React.ReactNode> = {
  approve: <CheckCircle className="w-4 h-4" />,
  reject: <XCircle className="w-4 h-4" />,
};

export function OrganizationJoinRequestsPage() {
  const [requests, setRequests] = useState<OrganizationJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // V3: Batch action hook
  const batch = useBatchAction();

  // V3: AI summary state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<{
    summary: string;
    patterns: string[];
    recommendations: string[];
    warnings: string[];
    source: 'ai' | 'rule-based';
  } | null>(null);

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
    setAiSummary(null);
  }, [page]);

  const handleApprove = async (id: string, reason?: string) => {
    setActionLoading(id);
    try {
      await joinRequestApi.approve(id, reason);
      await loadRequests();
    } catch (err: any) {
      toast.error(err.message || '승인에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string, reason?: string) => {
    setActionLoading(id);
    try {
      await joinRequestApi.reject(id, reason);
      await loadRequests();
    } catch (err: any) {
      toast.error(err.message || '반려에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  // ─── V3: Batch Actions (single API call) ───

  const handleBatchApprove = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const result = await batch.executeBatch(
      (batchIds) => joinRequestApi.batchApprove(batchIds),
      ids,
    );
    if (result.successCount > 0) {
      setSelectedIds(new Set());
      loadRequests();
    }
  };

  const handleBatchReject = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const result = await batch.executeBatch(
      (batchIds) => joinRequestApi.batchReject(batchIds, '일괄 반려'),
      ids,
    );
    if (result.successCount > 0) {
      setSelectedIds(new Set());
      loadRequests();
    }
  };

  // ─── V3: AI Summary ───

  const handleAiSummarize = async () => {
    if (selectedIds.size === 0) return;
    setAiLoading(true);
    try {
      const selectedItems = requests.filter(r => selectedIds.has(r.id));
      const items = selectedItems.map(r => ({
        id: r.id,
        request_type: r.request_type,
        requested_role: r.requested_role,
        requested_sub_role: r.requested_sub_role,
        organization_id: r.organization_id,
        status: r.status,
        created_at: r.created_at,
      }));
      const res = await joinRequestApi.aiSummarize(items, '조직 가입/역할 요청');
      setAiSummary(res.data);
    } catch (err: any) {
      toast.error('AI 요약에 실패했습니다.');
    } finally {
      setAiLoading(false);
    }
  };

  // ─── V3: Status Info (선택 항목 분포) ───

  const buildStatusInfo = (): string | undefined => {
    if (selectedIds.size === 0) return undefined;
    const selected = requests.filter(r => selectedIds.has(r.id));
    const typeCounts: Record<string, number> = {};
    for (const r of selected) {
      const label = JOIN_REQUEST_TYPE_LABELS[r.request_type] || r.request_type;
      typeCounts[label] = (typeCounts[label] || 0) + 1;
    }
    return Object.entries(typeCounts).map(([k, v]) => `${k} ${v}건`).join(' / ');
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
      header: '액션',
      system: true,
      align: 'center',
      width: '80px',
      onCellClick: () => {},
      render: (_v, row) => (
        actionLoading === row.id ? (
          <div className="flex justify-center">
            <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : (
          <RowActionMenu
            inlineMax={joinRequestPolicy.inlineMax}
            actions={buildRowActions(joinRequestPolicy, row, {
              approve: (reason) => handleApprove(row.id, reason),
              reject: (reason) => handleReject(row.id, reason),
            }, { icons: JOIN_REQUEST_ICONS })}
          />
        )
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

      {/* V3: ActionBar with grouping + statusInfo */}
      <ActionBar
        selectedCount={selectedIds.size}
        onClearSelection={() => { setSelectedIds(new Set()); setAiSummary(null); }}
        statusInfo={buildStatusInfo()}
        actions={[
          {
            key: 'approve',
            label: `승인 (${selectedIds.size})`,
            onClick: handleBatchApprove,
            variant: 'primary',
            icon: <CheckCircle size={14} />,
            loading: batch.loading,
            group: 'actions',
            tooltip: '선택된 요청을 일괄 승인합니다',
          },
          {
            key: 'reject',
            label: `반려 (${selectedIds.size})`,
            onClick: handleBatchReject,
            variant: 'danger',
            icon: <XCircle size={14} />,
            loading: batch.loading,
            group: 'actions',
            tooltip: '선택된 요청을 일괄 반려합니다',
            confirm: {
              title: '일괄 반려 확인',
              message: `${selectedIds.size}개 요청을 일괄 반려합니다.`,
              variant: 'danger',
              confirmText: '반려',
            },
          },
          {
            key: 'ai-summary',
            label: 'AI 요약',
            onClick: handleAiSummarize,
            variant: 'default',
            icon: <Sparkles size={14} />,
            loading: aiLoading,
            group: 'ai',
            tooltip: '선택된 항목을 AI로 분석합니다',
            visible: selectedIds.size >= 2,
          },
        ]}
      />

      {/* V3: AI Summary Result */}
      {aiSummary && (
        <div className="mt-3 p-4 bg-violet-50 border border-violet-200 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-600" />
            <span className="text-sm font-medium text-violet-800">AI 분석 결과</span>
            <span className="text-xs text-violet-500">({aiSummary.source})</span>
            <button
              onClick={() => setAiSummary(null)}
              className="ml-auto text-xs text-violet-500 hover:text-violet-700"
            >
              닫기
            </button>
          </div>
          <p className="text-sm text-slate-700">{aiSummary.summary}</p>
          {aiSummary.patterns.length > 0 && (
            <div className="text-xs text-slate-600">
              <span className="font-medium">패턴:</span> {aiSummary.patterns.join(' / ')}
            </div>
          )}
          {aiSummary.recommendations.length > 0 && (
            <div className="text-xs text-blue-700">
              <span className="font-medium">추천:</span> {aiSummary.recommendations.join(' / ')}
            </div>
          )}
          {aiSummary.warnings.length > 0 && (
            <div className="text-xs text-amber-700">
              <span className="font-medium">주의:</span> {aiSummary.warnings.join(' / ')}
            </div>
          )}
        </div>
      )}

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

      {/* V3: BulkResultModal */}
      <BulkResultModal
        open={batch.showResult}
        onClose={() => { batch.clearResult(); loadRequests(); }}
        result={batch.result}
        onRetry={() => {
          batch.retryFailed();
        }}
      />
    </div>
  );
}
