/**
 * PharmacyRequestManagementPage - 약국 서비스 신청 관리 (운영자)
 *
 * WO-KPA-A-PHARMACY-REQUEST-OPERATOR-UI-V1
 * WO-O4O-OPERATOR-LIST-TABLE-STANDARD-V3: card 목록 → DataTable 표준 전환
 * WO-O4O-KPA-OPERATOR-PARTIAL-CANONICAL-ALIGN-V1:
 *   PARTIAL → TRUE CANONICAL — ActionBar + useBatchAction + BulkResultModal 추가.
 *   bulk API 없음 → 단건 approve/reject 를 Promise.allSettled 로 wrap (canonical doc §4.4).
 *   기존 단건 OperatorConfirmModal/RowActionMenu 흐름은 그대로 유지.
 *
 * 약국 개설자 신청(kpa_pharmacy_requests)을 조회하고 승인/반려합니다.
 * API: pharmacyRequestApi.getPending / approve / reject
 */

import { useState, useEffect, useCallback } from 'react';
import { Check, X } from 'lucide-react';
import { OperatorConfirmModal, RowActionMenu, useOperatorAction, BaseDetailDrawer, ActionBar, BulkResultModal } from '@o4o/ui';
import { OperatorActionType } from '@o4o/types';
import { DataTable, defineActionPolicy, buildRowActions, useBatchAction } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { pharmacyRequestApi } from '../../api/pharmacyRequestApi';
import type { PharmacyRequest } from '../../api/pharmacyRequestApi';

type TabType = 'pending' | 'processed';
type RequestItem = PharmacyRequest & { user?: { name: string; email: string } | null };

const pharmacyActionPolicy = defineActionPolicy<RequestItem>('kpa:pharmacy:requests', {
  rules: [
    { key: 'approve', label: '승인' },
    { key: 'reject', label: '반려', variant: 'danger', divider: true },
  ],
});

const PHARMACY_ACTION_ICONS: Record<string, React.ReactNode> = {
  approve: <Check className="w-4 h-4" />,
  reject: <X className="w-4 h-4" />,
};

export default function PharmacyRequestManagementPage() {
  const [tab, setTab] = useState<TabType>('pending');
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const { pendingAction, loading: actionHookLoading, requestAction, cancelAction, executeAction } = useOperatorAction();

  // WO-O4O-KPA-OPERATOR-PARTIAL-CANONICAL-ALIGN-V1: bulk batch hook
  const batch = useBatchAction();

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await pharmacyRequestApi.getPending({ page, limit: 20 });
      setRequests(response.data.items);
      setTotalPages(response.data.pagination.totalPages);
      setTotal(response.data.pagination.total);
    } catch (err: any) {
      setError(err.message || '요청 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const openApproveModal = (id: string) => {
    setActionTargetId(id);
    requestAction(OperatorActionType.APPROVE);
  };

  const openRejectModal = (id: string) => {
    setActionTargetId(id);
    requestAction(OperatorActionType.REJECT);
  };

  const handleConfirmAction = async (reason?: string) => {
    if (!actionTargetId) return;
    setActionLoading(actionTargetId);
    await executeAction(async () => {
      if (pendingAction === OperatorActionType.APPROVE) {
        await pharmacyRequestApi.approve(actionTargetId, reason);
      } else {
        await pharmacyRequestApi.reject(actionTargetId, reason);
      }
      await loadRequests();
    });
    setActionLoading(null);
    setActionTargetId(null);
    setSelectedRequest(null);
  };

  // WO-O4O-KPA-OPERATOR-PARTIAL-CANONICAL-ALIGN-V1:
  //   bulk approve/reject — 단건 API Promise.allSettled wrap (bulk API 없음).
  //   bulk 시 reason 입력은 생략 (단건 흐름은 OperatorConfirmModal 로 유지).
  const runRequestBulk = async (action: 'approve' | 'reject') => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const result = await batch.executeBatch(async (batchIds) => {
      const settled = await Promise.allSettled(
        batchIds.map((id) =>
          action === 'approve'
            ? pharmacyRequestApi.approve(id)
            : pharmacyRequestApi.reject(id),
        ),
      );
      return {
        data: {
          results: settled.map((r, i) => ({
            id: batchIds[i],
            status: r.status === 'fulfilled' ? ('success' as const) : ('failed' as const),
            error: r.status === 'rejected'
              ? String((r as PromiseRejectedResult).reason?.message ?? r.reason)
              : undefined,
          })),
        },
      };
    }, ids);
    if (result.successCount > 0) setSelectedIds(new Set());
  };

  const handleBulkApprove = () => runRequestBulk('approve');
  const handleBulkReject = () => runRequestBulk('reject');

  const formatBizNo = (num: string) => {
    const d = num.replace(/\D/g, '');
    if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
    return num;
  };

  const formatPhone = (num: string | null) => {
    if (!num) return '-';
    const d = num.replace(/\D/g, '');
    if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
    return num;
  };

  const formatDate = (d: string) => {
    try {
      return (
        new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }) +
        ' ' +
        new Date(d).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      );
    } catch { return '-'; }
  };

  const columns: ListColumnDef<RequestItem>[] = [
    {
      key: 'pharmacy_name',
      header: '약국명',
      render: (value) => <span className="font-medium text-slate-800 text-sm">{value}</span>,
    },
    {
      key: 'user',
      header: '신청자',
      render: (_v, row) => (
        <div>
          <p className="text-sm text-slate-800 font-medium">{(row as any).user?.name || '(이름 없음)'}</p>
          <p className="text-xs text-slate-400 mt-0.5">{(row as any).user?.email || '-'}</p>
        </div>
      ),
    },
    {
      key: 'business_number',
      header: '사업자번호',
      render: (value) => <span className="text-sm font-mono text-slate-600">{formatBizNo(value)}</span>,
    },
    {
      key: 'pharmacy_phone',
      header: '약국전화',
      render: (value) => <span className="text-sm text-slate-600">{formatPhone(value)}</span>,
    },
    {
      key: 'owner_phone',
      header: '개설자 핸드폰',
      render: (value) => <span className="text-sm text-slate-600">{formatPhone(value)}</span>,
    },
    {
      key: 'created_at',
      header: '신청일',
      render: (value) => <span className="text-xs text-slate-500">{formatDate(value)}</span>,
    },
    {
      key: '_actions',
      header: '액션',
      align: 'center' as const,
      width: '60px',
      system: true,
      onCellClick: () => {},
      render: (_v, row) => (
        <RowActionMenu
          actions={buildRowActions(pharmacyActionPolicy, row, {
            approve: () => openApproveModal(row.id),
            reject: () => openRejectModal(row.id),
          }, { icons: PHARMACY_ACTION_ICONS, loading: { approve: actionLoading === row.id, reject: actionLoading === row.id } })}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700 }}>
        약국 서비스 신청 관리
      </h2>
      <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '14px' }}>
        약국 개설자의 서비스 이용 신청을 확인하고 승인/반려합니다.
        승인 시 해당 사용자의 pharmacist_role이 pharmacy_owner로 변경됩니다.
      </p>

      {/* Tab */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
        <button
          onClick={() => { setTab('pending'); setPage(1); }}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: tab === 'pending' ? 700 : 400,
            color: tab === 'pending' ? '#2563eb' : '#64748b',
            borderBottom: tab === 'pending' ? '2px solid #2563eb' : '2px solid transparent',
            cursor: 'pointer',
          }}
        >
          대기 중 {!loading && tab === 'pending' && total > 0 ? `(${total})` : ''}
        </button>
        <button
          onClick={() => setTab('processed')}
          disabled
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            color: '#94a3b8',
            borderBottom: '2px solid transparent',
            cursor: 'not-allowed',
          }}
        >
          처리 완료 (준비 중)
        </button>
      </div>

      {error && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#dc2626', marginBottom: '16px' }}>
          {error}
          <button
            onClick={loadRequests}
            style={{ display: 'block', margin: '12px auto 0', padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}
          >
            다시 시도
          </button>
        </div>
      )}

      {/* WO-O4O-KPA-OPERATOR-PARTIAL-CANONICAL-ALIGN-V1: BulkResultModal */}
      <BulkResultModal
        open={batch.showResult}
        onClose={() => { batch.clearResult(); loadRequests(); }}
        result={batch.result}
        onRetry={() => batch.retryFailed()}
      />

      {/* WO-O4O-KPA-OPERATOR-PARTIAL-CANONICAL-ALIGN-V1: ActionBar (선택 ≥ 1) */}
      <div style={{ marginBottom: 12 }}>
        <ActionBar
          selectedCount={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
          actions={[
            {
              key: 'approve',
              label: `승인 (${selectedIds.size})`,
              onClick: handleBulkApprove,
              variant: 'primary' as const,
              icon: <Check size={14} />,
              loading: batch.loading,
              confirm: {
                title: '약국 신청 일괄 승인',
                message: `${selectedIds.size}건의 약국 서비스 신청을 승인합니다.\n승인 시 각 사용자에게 pharmacy_owner 권한이 부여됩니다.`,
                confirmText: '승인',
              },
            },
            {
              key: 'reject',
              label: `반려 (${selectedIds.size})`,
              onClick: handleBulkReject,
              variant: 'danger' as const,
              icon: <X size={14} />,
              loading: batch.loading,
              group: 'danger',
              confirm: {
                title: '약국 신청 일괄 반려',
                message: `${selectedIds.size}건의 약국 서비스 신청을 반려합니다.`,
                variant: 'danger' as const,
                confirmText: '반려',
              },
            },
          ]}
        />
      </div>

      <DataTable<RequestItem>
        columns={columns}
        data={requests}
        rowKey="id"
        loading={loading}
        emptyMessage="대기 중인 약국 서비스 신청이 없습니다"
        tableId="kpa-pharmacy-requests"
        selectable
        selectedKeys={selectedIds}
        onSelectionChange={setSelectedIds}
        onRowClick={(row) => setSelectedRequest(row)}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={paginationBtnStyle(page <= 1)}
          >
            이전
          </button>
          <span style={{ padding: '6px 12px', fontSize: '14px', color: '#475569' }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={paginationBtnStyle(page >= totalPages)}
          >
            다음
          </button>
        </div>
      )}

      {/* Action Confirm Modal (WO-O4O-OPERATOR-ACTION-STANDARDIZATION-V1) */}
      {pendingAction && (
        <OperatorConfirmModal
          open
          actionType={pendingAction}
          onClose={() => { cancelAction(); setActionTargetId(null); }}
          onConfirm={handleConfirmAction}
          loading={actionHookLoading}
          message={
            pendingAction === OperatorActionType.APPROVE
              ? '이 약국 서비스 신청을 승인하시겠습니까?\n승인 시 해당 사용자에게 pharmacy_owner 권한이 부여됩니다.'
              : undefined
          }
        />
      )}

      {/* 약국 신청 상세 Drawer */}
      <BaseDetailDrawer
        open={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title={selectedRequest?.pharmacy_name ?? ''}
        width={560}
        actions={[
          {
            label: '반려',
            onClick: () => { openRejectModal(selectedRequest!.id); },
            variant: 'danger' as const,
            loading: actionLoading === selectedRequest?.id,
            disabled: actionLoading === selectedRequest?.id,
          },
          {
            label: '승인',
            onClick: () => { openApproveModal(selectedRequest!.id); },
            variant: 'primary' as const,
            loading: actionLoading === selectedRequest?.id,
            disabled: actionLoading === selectedRequest?.id,
          },
        ]}
      >
        {selectedRequest && (
          <div style={{ fontSize: 14, color: '#374151' }}>
            {/* 신청자 정보 */}
            <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: 8, marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>신청자</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 2 }}>
                {(selectedRequest as any).user?.name || '(이름 없음)'}
              </p>
              <p style={{ fontSize: 13, color: '#64748b' }}>{(selectedRequest as any).user?.email || '-'}</p>
            </div>

            {/* 약국 정보 */}
            {[
              { label: '약국명', value: selectedRequest.pharmacy_name },
              { label: '사업자번호', value: formatBizNo(selectedRequest.business_number) },
              { label: '약국 전화', value: formatPhone(selectedRequest.pharmacy_phone) },
              { label: '개설자 핸드폰', value: formatPhone(selectedRequest.owner_phone) },
              { label: '신청일', value: formatDate(selectedRequest.created_at) },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                <span style={{ fontWeight: 600, color: '#64748b', minWidth: 90, flexShrink: 0 }}>{item.label}</span>
                <span style={{ color: '#1e293b' }}>{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </BaseDetailDrawer>
    </div>
  );
}

function paginationBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '6px 16px',
    background: disabled ? '#f1f5f9' : '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '13px',
    color: disabled ? '#94a3b8' : '#475569',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
