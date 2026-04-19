/**
 * ProductApplicationManagementPage - 상품 판매 신청 관리 (Operator)
 *
 * WO-O4O-PRODUCT-APPROVAL-WORKFLOW-V1
 * WO-O4O-TABLE-STANDARD-V2 — DataTable 표준 전환
 *
 * /hub/b2b에서 약국이 신청한 상품을 조회하고 승인/거절합니다.
 * 승인 시 organization_product_listings에 자동 생성됩니다.
 *
 * API:
 *   GET   /operator/product-applications         — 목록 조회
 *   GET   /operator/product-applications/stats    — 통계
 *   PATCH /operator/product-applications/:id/approve — 승인
 *   PATCH /operator/product-applications/:id/reject  — 거절
 */

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { OperatorConfirmModal, useOperatorAction, ActionBar, BulkResultModal } from '@o4o/ui';
import { OperatorActionType } from '@o4o/types';
import { DataTable, Pagination, useBatchAction } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { apiClient } from '../../api/client';

// ============================================
// 타입
// ============================================

interface ProductApplication {
  id: string;
  organization_id: string;
  organizationName: string | null;
  service_key: string;
  external_product_id: string;
  product_name: string;
  product_metadata: {
    supplierName?: string;
    supplierId?: string;
    category?: string;
    [key: string]: unknown;
  };
  supplierName: string | null;
  /** 일반 공급가 */
  priceGeneral: number | null;
  /** 서비스 공급가 (KPA 기준) */
  priceGold: number | null;
  /** 소비자 참고가 */
  consumerReferencePrice: number | null;
  status: 'pending' | 'approved' | 'rejected';
  reject_reason: string | null;
  requested_by: string;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

/** KPA 기준 가격 표시: priceGold 우선 → priceGeneral fallback → '-' */
function formatKpaPrice(app: ProductApplication): string {
  const price = app.priceGold ?? app.priceGeneral;
  if (price == null) return '-';
  return price.toLocaleString('ko-KR') + '원';
}

/** priceGold 존재 시 '서비스가', 아니면 '일반가' */
function getPriceLabel(app: ProductApplication): string | null {
  if (app.priceGold != null) return '서비스가';
  if (app.priceGeneral != null) return '일반가';
  return null;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: '승인 대기', color: '#92400e', bg: '#fef3c7' },
  approved: { label: '승인', color: '#065f46', bg: '#d1fae5' },
  rejected: { label: '거절', color: '#991b1b', bg: '#fee2e2' },
};

// ============================================
// 컴포넌트
// ============================================

export default function ProductApplicationManagementPage() {
  const [applications, setApplications] = useState<ProductApplication[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0 });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { pendingAction, loading: actionHookLoading, requestAction, cancelAction, executeAction } = useOperatorAction();

  // Selection & V3 batch
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

  const loadStats = useCallback(async () => {
    try {
      const res = await apiClient.get<{ success: boolean; data: Stats }>('/operator/product-applications/stats');
      if (res.success) setStats(res.data);
    } catch {
      // silent
    }
  }, []);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await apiClient.get<{
        success: boolean;
        data: ProductApplication[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      }>('/operator/product-applications', params);

      setApplications(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (e: any) {
      setError(e.message || '신청 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { loadApplications(); }, [loadApplications]);

  // Reset selection on filter change
  useEffect(() => {
    setSelectedIds(new Set());
    setAiSummary(null);
  }, [statusFilter]);

  // ─── Individual Actions (OperatorConfirmModal) ───

  const openApproveModal = (appId: string) => {
    setActionTargetId(appId);
    requestAction(OperatorActionType.APPROVE);
  };

  const openRejectModal = (appId: string) => {
    setActionTargetId(appId);
    requestAction(OperatorActionType.REJECT);
  };

  const handleConfirmAction = async (reason?: string) => {
    if (!actionTargetId) return;
    const app = applications.find(a => a.id === actionTargetId);
    if (!app) return;

    setActionLoading(actionTargetId);
    await executeAction(async () => {
      if (pendingAction === OperatorActionType.APPROVE) {
        await apiClient.patch(`/operator/product-applications/${actionTargetId}/approve`, {});
        setToastMsg({ type: 'success', message: `"${app.product_name}" 승인 완료. 매장 진열 상품이 생성되었습니다.` });
      } else {
        await apiClient.patch(`/operator/product-applications/${actionTargetId}/reject`, { reason: reason || undefined });
        setToastMsg({ type: 'success', message: `"${app.product_name}" 거절 처리되었습니다.` });
      }
      loadApplications();
      loadStats();
    });
    setActionLoading(null);
    setActionTargetId(null);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // ─── V3: Batch Actions ───

  const handleBulkApprove = async () => {
    const pendingIds = [...selectedIds].filter((id) => {
      const app = applications.find((a) => a.id === id);
      return app?.status === 'pending';
    });
    if (pendingIds.length === 0) return;
    const result = await batch.executeBatch(
      (batchIds) => apiClient.post('/operator/product-applications/batch-approve', { ids: batchIds }),
      pendingIds,
    );
    if (result.successCount > 0) {
      setSelectedIds(new Set());
      loadApplications();
      loadStats();
    }
  };

  const handleBulkReject = async () => {
    const pendingIds = [...selectedIds].filter((id) => {
      const app = applications.find((a) => a.id === id);
      return app?.status === 'pending';
    });
    if (pendingIds.length === 0) return;
    const result = await batch.executeBatch(
      (batchIds) => apiClient.post('/operator/product-applications/batch-reject', { ids: batchIds, reason: '일괄 거절' }),
      pendingIds,
    );
    if (result.successCount > 0) {
      setSelectedIds(new Set());
      loadApplications();
      loadStats();
    }
  };

  // ─── V3: AI Summary ───

  const handleAiSummarize = async () => {
    if (selectedIds.size === 0) return;
    setAiLoading(true);
    try {
      const selectedItems = applications.filter(a => selectedIds.has(a.id));
      const items = selectedItems.map(a => ({
        id: a.id,
        product_name: a.product_name,
        supplierName: a.supplierName,
        organizationName: a.organizationName,
        status: a.status,
        requested_at: a.requested_at,
        category: a.product_metadata?.category,
      }));
      const res = await apiClient.post<{ success: boolean; data: any }>('/operator/ai/summarize-selection', {
        items,
        context: '상품 판매 신청 승인/거절 관리',
      });
      setAiSummary(res.data);
    } catch {
      setToastMsg({ type: 'error', message: 'AI 요약에 실패했습니다.' });
      setTimeout(() => setToastMsg(null), 4000);
    } finally {
      setAiLoading(false);
    }
  };

  const handleFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
    setPage(1);
  };

  // ─── Bulk action counts ───

  const selectedPendingCount = [...selectedIds].filter((id) => {
    const app = applications.find((a) => a.id === id);
    return app?.status === 'pending';
  }).length;

  // ─── Column Definitions ───

  const columns: ListColumnDef<ProductApplication>[] = [
    {
      key: 'organizationName',
      header: '약국',
      render: (_v, row) => row.organizationName || row.organization_id.slice(0, 8),
    },
    {
      key: 'product_name',
      header: '상품명',
      sortable: true,
      render: (_v, row) => (
        <span className="font-medium text-slate-800">{row.product_name}</span>
      ),
    },
    {
      key: 'supplierName',
      header: '공급사',
      render: (_v, row) => row.supplierName || '-',
    },
    {
      key: 'price',
      header: '공급가',
      align: 'right',
      render: (_v, row) => (
        <div>
          <span className="font-medium">{formatKpaPrice(row)}</span>
          {getPriceLabel(row) && (
            <div className="text-[10px] text-slate-400 mt-0.5">{getPriceLabel(row)}</div>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: '카테고리',
      render: (_v, row) => (row.product_metadata?.category as string) || '-',
    },
    {
      key: 'requested_at',
      header: '신청일',
      sortable: true,
      sortAccessor: (row) => new Date(row.requested_at).getTime(),
      render: (_v, row) => new Date(row.requested_at).toLocaleDateString('ko-KR'),
    },
    {
      key: 'status',
      header: '상태',
      render: (_v, row) => {
        const info = STATUS_LABELS[row.status] || STATUS_LABELS.pending;
        return (
          <div>
            <span
              className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold"
              style={{ backgroundColor: info.bg, color: info.color }}
            >
              {info.label}
            </span>
            {row.reject_reason && (
              <div className="text-[11px] text-slate-400 mt-0.5">사유: {row.reject_reason}</div>
            )}
          </div>
        );
      },
    },
    {
      key: '_actions',
      header: '액션',
      system: true,
      align: 'center',
      width: '120px',
      onCellClick: () => {},
      render: (_v, row) => {
        if (row.status !== 'pending') {
          if (row.status === 'approved' && row.reviewed_at) {
            return <span className="text-xs text-slate-400">{new Date(row.reviewed_at).toLocaleDateString('ko-KR')}</span>;
          }
          return null;
        }
        const isTarget = actionLoading === row.id;
        return (
          <div className="flex gap-1.5 justify-center">
            <button
              onClick={() => openApproveModal(row.id)}
              disabled={isTarget}
              className="px-3 py-1 rounded-md text-xs font-semibold bg-blue-700 text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {isTarget ? '처리중...' : '승인'}
            </button>
            <button
              onClick={() => openRejectModal(row.id)}
              disabled={isTarget}
              className="px-3 py-1 rounded-md text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              거절
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="max-w-[1100px] mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">상품 판매 신청 관리</h1>
      <p className="text-sm text-slate-500 mb-6">
        약국이 약국 HUB에서 신청한 B2B 상품을 승인하거나 거절합니다.
      </p>

      {/* Toast */}
      {toastMsg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm mb-4 ${
          toastMsg.type === 'success'
            ? 'bg-green-50 border-green-300 text-green-800'
            : 'bg-red-50 border-red-300 text-red-800'
        }`}>
          {toastMsg.message}
        </div>
      )}

      {/* Stats / Filter */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {([
          { key: 'all' as StatusFilter, label: '전체', count: stats.pending + stats.approved + stats.rejected },
          { key: 'pending' as StatusFilter, label: '승인 대기', count: stats.pending },
          { key: 'approved' as StatusFilter, label: '승인', count: stats.approved },
          { key: 'rejected' as StatusFilter, label: '거절', count: stats.rejected },
        ]).map(item => (
          <button
            key={item.key}
            onClick={() => handleFilterChange(item.key)}
            className={`px-4 py-2 rounded-lg border text-[13px] font-medium ${
              statusFilter === item.key
                ? 'bg-blue-800 text-white border-blue-800'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {item.label} ({item.count})
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="text-center py-10 text-red-600">
          {error}
          <div className="mt-3">
            <button
              onClick={loadApplications}
              className="px-4 py-1.5 text-[13px] border border-red-600 text-red-600 rounded-md hover:bg-red-50"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* V3: ActionBar + BulkResultModal */}
      <ActionBar
        selectedCount={selectedIds.size}
        onClearSelection={() => { setSelectedIds(new Set()); setAiSummary(null); }}
        actions={[
          {
            key: 'approve',
            label: `승인 (${selectedPendingCount})`,
            onClick: handleBulkApprove,
            variant: 'primary' as const,
            icon: <CheckCircle size={14} />,
            loading: batch.loading,
            group: 'actions',
            tooltip: '선택된 상품 신청을 일괄 승인합니다',
            visible: selectedPendingCount > 0,
          },
          {
            key: 'reject',
            label: `거절 (${selectedPendingCount})`,
            onClick: handleBulkReject,
            variant: 'danger' as const,
            icon: <XCircle size={14} />,
            loading: batch.loading,
            group: 'actions',
            tooltip: '선택된 상품 신청을 일괄 거절합니다',
            visible: selectedPendingCount > 0,
          },
          {
            key: 'ai-summary',
            label: 'AI 요약',
            onClick: handleAiSummarize,
            variant: 'default' as const,
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

      <BulkResultModal
        open={batch.showResult}
        onClose={() => { batch.clearResult(); loadApplications(); loadStats(); }}
        result={batch.result}
        onRetry={() => { batch.retryFailed(); }}
      />

      {/* DataTable */}
      {!error && (
        <DataTable<ProductApplication>
          columns={columns}
          data={applications}
          rowKey="id"
          loading={loading}
          emptyMessage={statusFilter === 'pending' ? '처리 대기 중인 신청이 없습니다.' : '해당 상태의 신청이 없습니다.'}
          tableId="kpa-product-applications"
          selectable
          selectedKeys={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      )}

      {/* Pagination */}
      {!error && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          total={total}
        />
      )}

      {/* Action Confirm Modal (WO-O4O-OPERATOR-ACTION-STANDARDIZATION-V1) */}
      {pendingAction && (
        <OperatorConfirmModal
          open
          actionType={pendingAction}
          onClose={() => { cancelAction(); setActionTargetId(null); }}
          onConfirm={handleConfirmAction}
          loading={actionHookLoading}
          requireReason={pendingAction === OperatorActionType.REJECT ? false : undefined}
          message={
            pendingAction === OperatorActionType.APPROVE
              ? '이 상품 신청을 승인하시겠습니까?\n승인 시 해당 약국의 매장 진열 상품에 자동 추가됩니다.'
              : undefined
          }
        />
      )}
    </div>
  );
}
