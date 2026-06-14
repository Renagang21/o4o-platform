/**
 * ProductApplicationManagementConsole — 공급 상품 신청 승인 (Operator, service-neutral)
 *
 * WO-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-ENABLE-GP-KCOS-V1 (Phase 3)
 *
 * KPA `ProductApplicationManagementPage` 에서 추출한 공통 콘솔. service 측은
 * `api`(자체 client + 경로) + `config`(라벨/accent) 만 주입한다. 동작/UX 동일.
 *
 * approve 는 백엔드 ProductApprovalV2Service(activateListing:true)로 위임 — per-store 단건 OPL active.
 */

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Sparkles, Trash2 } from 'lucide-react';
import { OperatorConfirmModal, useOperatorAction, ActionBar, BulkResultModal, RowActionMenu, BaseDetailDrawer } from '@o4o/ui';
import type { RowActionItem } from '@o4o/ui';
import { OperatorActionType } from '@o4o/types';
import { DataTable, Pagination, useBatchAction } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import type {
  ProductApplication,
  ProductApplicationStats,
  ProductApplicationStatusFilter,
  ProductApplicationsAccent,
  ProductApplicationManagementConsoleProps,
} from './types';

// ============================================
// helpers
// ============================================

/** 가격 표시: priceGold(서비스가) 우선 → priceGeneral(일반가) fallback → '-' */
function formatPrice(app: ProductApplication): string {
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

const ACCENT_ACTIVE_CLASS: Record<ProductApplicationsAccent, string> = {
  blue: 'bg-blue-800 text-white border-blue-800',
  teal: 'bg-teal-700 text-white border-teal-700',
  pink: 'bg-pink-700 text-white border-pink-700',
};

// ============================================
// component
// ============================================

export function ProductApplicationManagementConsole({ api, config }: ProductApplicationManagementConsoleProps) {
  const {
    title = '공급 상품 신청 승인',
    description = '매장이 공급 상품 카탈로그에서 신청한 상품을 승인하거나 거절합니다.',
    orgLabel = '약국',
    accent = 'blue',
    tableId = 'product-applications',
  } = config ?? {};
  const activeFilterClass = ACCENT_ACTIVE_CLASS[accent];

  const [applications, setApplications] = useState<ProductApplication[]>([]);
  const [stats, setStats] = useState<ProductApplicationStats>({ pending: 0, approved: 0, rejected: 0 });
  const [statusFilter, setStatusFilter] = useState<ProductApplicationStatusFilter>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { pendingAction, loading: actionHookLoading, requestAction, cancelAction, executeAction } = useOperatorAction();

  // Selection & batch
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const batch = useBatchAction();

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState<ProductApplication | null>(null);

  // AI summary state
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
      setStats(await api.stats());
    } catch {
      // silent
    }
  }, [api]);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.list({
        page,
        limit: 20,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setApplications(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (e: any) {
      setError(e?.message || '신청 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [api, page, statusFilter]);

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
        await api.approve(actionTargetId);
        setToastMsg({ type: 'success', message: `"${app.product_name}" 승인 완료. 매장 진열 상품이 생성되었습니다.` });
      } else {
        await api.reject(actionTargetId, reason || undefined);
        setToastMsg({ type: 'success', message: `"${app.product_name}" 거절 처리되었습니다.` });
      }
      loadApplications();
      loadStats();
    });
    setActionLoading(null);
    setActionTargetId(null);
    setSelectedApp(null);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // ─── Batch Actions ───

  const handleBulkApprove = async () => {
    const pendingIds = [...selectedIds].filter((id) => {
      const app = applications.find((a) => a.id === id);
      return app?.status === 'pending';
    });
    if (pendingIds.length === 0) return;
    const result = await batch.executeBatch(
      (batchIds) => api.batchApprove(batchIds),
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
      (batchIds) => api.batchReject(batchIds, '일괄 거절'),
      pendingIds,
    );
    if (result.successCount > 0) {
      setSelectedIds(new Set());
      loadApplications();
      loadStats();
    }
  };

  // ─── Delete Handlers ───

  const handleDeleteItem = useCallback(async (id: string) => {
    setDeleteLoading(true);
    try {
      await api.remove(id);
      setToastMsg({ type: 'success', message: '신청 이력이 삭제되었습니다.' });
      loadApplications();
      loadStats();
    } catch {
      setToastMsg({ type: 'error', message: '삭제에 실패했습니다.' });
    } finally {
      setDeleteLoading(false);
      setTimeout(() => setToastMsg(null), 4000);
    }
  }, [api, loadApplications, loadStats]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const ids = [...selectedIds];
    const result = await batch.executeBatch(
      (batchIds) => api.batchDelete(batchIds),
      ids,
    );
    if (result.successCount > 0) {
      setSelectedIds(new Set());
      loadApplications();
      loadStats();
    }
  }, [api, selectedIds, batch, loadApplications, loadStats]);

  // ─── AI Summary ───

  const handleAiSummarize = async () => {
    if (selectedIds.size === 0 || !api.aiSummarize) return;
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
      const summary = await api.aiSummarize(items, '공급 상품 신청 승인/거절 관리');
      setAiSummary(summary);
    } catch {
      setToastMsg({ type: 'error', message: 'AI 요약에 실패했습니다.' });
      setTimeout(() => setToastMsg(null), 4000);
    } finally {
      setAiLoading(false);
    }
  };

  const handleFilterChange = (filter: ProductApplicationStatusFilter) => {
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
      header: orgLabel,
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
          <span className="font-medium">{formatPrice(row)}</span>
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
      width: '80px',
      onCellClick: () => {},
      render: (_v, row) => {
        const isTarget = actionLoading === row.id;
        const rowActions: RowActionItem[] = [
          ...(row.status === 'pending' ? [
            {
              key: 'approve',
              label: '승인',
              variant: 'primary' as const,
              loading: isTarget,
              onClick: () => openApproveModal(row.id),
            },
            {
              key: 'reject',
              label: '거절',
              variant: 'danger' as const,
              loading: isTarget,
              onClick: () => openRejectModal(row.id),
            },
          ] : []),
          {
            key: 'delete',
            label: '삭제',
            variant: 'danger' as const,
            loading: deleteLoading,
            divider: row.status === 'pending',
            onClick: () => handleDeleteItem(row.id),
            confirm: {
              title: '신청 이력 삭제',
              message: '이 신청 이력을 삭제하시겠습니까?\n승인된 경우 매장 진열 상품은 유지됩니다.',
              variant: 'danger',
            },
          },
        ];

        const reviewedDate = row.status === 'approved' && row.reviewed_at
          ? <span className="text-xs text-slate-400 mr-1">{new Date(row.reviewed_at).toLocaleDateString('ko-KR')}</span>
          : null;

        return (
          <div className="flex items-center gap-1 justify-center">
            {reviewedDate}
            <RowActionMenu actions={rowActions} />
          </div>
        );
      },
    },
  ];

  return (
    <div className="max-w-[1100px] mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-sm text-slate-500 mb-6">{description}</p>

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
          { key: 'all' as ProductApplicationStatusFilter, label: '전체', count: stats.pending + stats.approved + stats.rejected },
          { key: 'pending' as ProductApplicationStatusFilter, label: '승인 대기', count: stats.pending },
          { key: 'approved' as ProductApplicationStatusFilter, label: '승인', count: stats.approved },
          { key: 'rejected' as ProductApplicationStatusFilter, label: '거절', count: stats.rejected },
        ]).map(item => (
          <button
            key={item.key}
            onClick={() => handleFilterChange(item.key)}
            className={`px-4 py-2 rounded-lg border text-[13px] font-medium ${
              statusFilter === item.key
                ? activeFilterClass
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

      {/* ActionBar + BulkResultModal */}
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
            visible: !!api.aiSummarize && selectedIds.size >= 2,
          },
          {
            key: 'bulk-delete',
            label: `선택 삭제 (${selectedIds.size})`,
            onClick: handleBulkDelete,
            variant: 'danger' as const,
            icon: <Trash2 size={14} />,
            loading: batch.loading,
            group: 'danger',
            tooltip: '선택된 신청 이력을 삭제합니다. 승인된 매장 진열 상품은 유지됩니다.',
            visible: selectedIds.size > 0,
          },
        ]}
      />

      {/* AI Summary Result */}
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
          tableId={tableId}
          selectable
          selectedKeys={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowClick={(row) => setSelectedApp(row)}
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

      {/* Action Confirm Modal */}
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
              ? `이 상품 신청을 승인하시겠습니까?\n승인 시 해당 ${orgLabel}의 매장 진열 상품에 자동 추가됩니다.`
              : undefined
          }
        />
      )}

      {/* 상품 신청 상세 Drawer */}
      <BaseDetailDrawer
        open={!!selectedApp}
        onClose={() => setSelectedApp(null)}
        title={selectedApp?.product_name ?? ''}
        width={560}
        actions={selectedApp?.status === 'pending' ? [
          {
            label: '거절',
            onClick: () => { openRejectModal(selectedApp!.id); },
            variant: 'danger' as const,
            loading: actionLoading === selectedApp?.id,
            disabled: actionLoading === selectedApp?.id,
          },
          {
            label: '승인',
            onClick: () => { openApproveModal(selectedApp!.id); },
            variant: 'primary' as const,
            loading: actionLoading === selectedApp?.id,
            disabled: actionLoading === selectedApp?.id,
          },
        ] : []}
      >
        {selectedApp && (
          <div style={{ fontSize: 14, color: '#374151' }}>
            {/* 상태 badge */}
            <div style={{ marginBottom: 16 }}>
              {(() => {
                const info = STATUS_LABELS[selectedApp.status] || STATUS_LABELS.pending;
                return (
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      backgroundColor: info.bg,
                      color: info.color,
                    }}
                  >
                    {info.label}
                  </span>
                );
              })()}
            </div>

            {/* 기본 정보 */}
            {[
              { label: orgLabel, value: selectedApp.organizationName || selectedApp.organization_id.slice(0, 8) },
              { label: '공급사', value: selectedApp.supplierName || '-' },
              { label: '공급가', value: formatPrice(selectedApp) + (getPriceLabel(selectedApp) ? ` (${getPriceLabel(selectedApp)})` : '') },
              { label: '카테고리', value: (selectedApp.product_metadata?.category as string) || '-' },
              { label: '신청일', value: new Date(selectedApp.requested_at).toLocaleDateString('ko-KR') },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                <span style={{ fontWeight: 600, color: '#64748b', minWidth: 70, flexShrink: 0 }}>{item.label}</span>
                <span style={{ color: '#1e293b' }}>{item.value}</span>
              </div>
            ))}

            {/* 처리 결과 (pending 아닌 경우) */}
            {selectedApp.status !== 'pending' && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                {selectedApp.reviewed_at && (
                  <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                    <span style={{ fontWeight: 600, color: '#64748b', minWidth: 70 }}>처리일</span>
                    <span style={{ color: '#1e293b' }}>{new Date(selectedApp.reviewed_at).toLocaleDateString('ko-KR')}</span>
                  </div>
                )}
                {selectedApp.reject_reason && (
                  <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                    <span style={{ fontWeight: 600, color: '#64748b', minWidth: 70 }}>거절 사유</span>
                    <span style={{ color: '#dc2626' }}>{selectedApp.reject_reason}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </BaseDetailDrawer>
    </div>
  );
}

export default ProductApplicationManagementConsole;
