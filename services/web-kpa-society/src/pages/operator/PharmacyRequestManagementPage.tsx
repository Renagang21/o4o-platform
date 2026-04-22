/**
 * PharmacyRequestManagementPage - 약국 서비스 신청 관리 (운영자)
 *
 * WO-KPA-A-PHARMACY-REQUEST-OPERATOR-UI-V1
 * WO-O4O-OPERATOR-LIST-TABLE-STANDARD-V3: card 목록 → DataTable 표준 전환
 *
 * 약국 개설자 신청(kpa_pharmacy_requests)을 조회하고 승인/반려합니다.
 * API: pharmacyRequestApi.getPending / approve / reject
 */

import { useState, useEffect, useCallback } from 'react';
import { Check, X } from 'lucide-react';
import { OperatorConfirmModal, RowActionMenu, useOperatorAction } from '@o4o/ui';
import { OperatorActionType } from '@o4o/types';
import { DataTable, defineActionPolicy, buildRowActions } from '@o4o/operator-ux-core';
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
  const { pendingAction, loading: actionHookLoading, requestAction, cancelAction, executeAction } = useOperatorAction();

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
  };

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
