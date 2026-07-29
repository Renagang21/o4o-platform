/**
 * AdminSupplierGovernancePage — 공급자 상태 관리 (Admin Governance)
 *
 * WO-O4O-NETURE-SUPPLIER-APPROVAL-CONSOLE-AND-ADMIN-GOVERNANCE-SEPARATION-V1 §5
 *
 * admin 전용 예외 governance. 대상은 ACTIVE / INACTIVE 만.
 *   - ACTIVE  → 비활성화 (사유 필수 · 진행 주문/미정산 시 backend 409 차단)
 *   - INACTIVE → 재활성화 (사유 필수 · 접근 상태만 복구)
 * 승인/거절(PENDING)은 운영자 승인 콘솔(/operator/suppliers)이 canonical — 이 화면에서 다루지 않는다.
 */

import { useState, useEffect, useCallback } from 'react';
import { DataTable, type ListColumnDef } from '@o4o/operator-ux-core';
import { RowActionMenu, ConfirmActionDialog } from '@o4o/ui';
import { adminSupplierApi, type GovernanceSupplier } from '../../lib/api';

const statusLabels: Record<string, string> = {
  ACTIVE: '활성',
  INACTIVE: '비활성',
};

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-slate-100 text-slate-500',
};

function formatDate(value: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('ko-KR');
}

type DialogState =
  | { kind: 'deactivate'; supplier: GovernanceSupplier }
  | { kind: 'reactivate'; supplier: GovernanceSupplier }
  | null;

export default function AdminSupplierGovernancePage() {
  const [suppliers, setSuppliers] = useState<GovernanceSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dialog, setDialog] = useState<DialogState>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    const data = await adminSupplierApi.getGovernanceSuppliers();
    setSuppliers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  // §8/§10: 다이얼로그 오픈 시 대상 supplier 를 스냅샷한다. 취소=변경 0, 반복 확인=변경 1.
  const handleConfirm = useCallback(
    async (reason?: string) => {
      if (!dialog) return;
      const trimmed = (reason ?? '').trim();
      if (!trimmed) return; // requireReason 로 이미 방지되지만 방어적 확인
      const { kind, supplier } = dialog;
      setActionLoading(true);
      const result =
        kind === 'deactivate'
          ? await adminSupplierApi.deactivateSupplier(supplier.id, trimmed)
          : await adminSupplierApi.reactivateSupplier(supplier.id, trimmed);
      setActionLoading(false);

      if (result.success) {
        setDialog(null);
        setActionMessage({
          type: 'success',
          text:
            kind === 'deactivate'
              ? `${supplier.name} 비활성화 완료 (INACTIVE)`
              : `${supplier.name} 재활성화 완료 (ACTIVE)`,
        });
        await loadSuppliers();
        return;
      }

      // §6: 진행 주문·미정산 차단 (409)
      if (result.code === 'SUPPLIER_DEACTIVATION_BLOCKED' && result.blocked) {
        setActionMessage({
          type: 'error',
          text: `비활성화할 수 없습니다 — 진행 주문 ${result.blocked.activeOrderCount}건 · 미정산 ${result.blocked.unsettledCount}건 · 정산 진행 ${result.blocked.settlementInProgressCount}건. 처리 완료 후 다시 시도해 주세요.`,
        });
        setDialog(null);
        await loadSuppliers();
        return;
      }
      if (result.code === 'INVALID_STATUS') {
        setActionMessage({ type: 'error', text: '이미 상태가 변경된 공급자입니다. 목록을 새로고침합니다.' });
        setDialog(null);
        await loadSuppliers();
        return;
      }
      if (result.code === 'SUPPLIER_NOT_FOUND') {
        setActionMessage({ type: 'error', text: '공급자를 찾을 수 없습니다.' });
        setDialog(null);
        await loadSuppliers();
        return;
      }
      setActionMessage({ type: 'error', text: '상태 변경에 실패했습니다. 잠시 후 다시 시도해 주세요.' });
    },
    [dialog, loadSuppliers],
  );

  const statuses: Array<'all' | 'ACTIVE' | 'INACTIVE'> = ['all', 'ACTIVE', 'INACTIVE'];

  const filtered = suppliers.filter((s) => {
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const term = searchTerm.trim().toLowerCase();
    const matchSearch = !term || s.name.toLowerCase().includes(term);
    return matchStatus && matchSearch;
  });

  const columns: ListColumnDef<GovernanceSupplier>[] = [
    {
      key: 'name',
      header: '공급자명',
      minWidth: 160,
      render: (_v, s) => (
        <div>
          <p className="font-medium text-slate-800">{s.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">{s.id.slice(0, 8)}...</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: '현재 상태',
      width: '90px',
      render: (_v, s) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[s.status] || 'bg-gray-100 text-gray-700'}`}>
          {statusLabels[s.status] || s.status}
        </span>
      ),
    },
    { key: 'lastStatusChangedAt', header: '최근 상태 변경일', width: '150px', render: (_v, s) => formatDate(s.lastStatusChangedAt) },
    { key: 'lastChangedBy', header: '최근 변경자', width: '130px', render: (_v, s) => s.lastChangedBy || '-' },
    {
      key: 'lastChangeReason',
      header: '최근 변경 사유',
      minWidth: 160,
      render: (_v, s) => <span className="text-sm text-slate-600">{s.lastChangeReason || '-'}</span>,
    },
    {
      key: 'hasActiveOrders',
      header: '진행 주문',
      width: '90px',
      align: 'center',
      render: (_v, s) =>
        s.hasActiveOrders ? (
          <span className="text-amber-600 font-medium">있음 ({s.activeOrderCount})</span>
        ) : (
          <span className="text-slate-400">없음</span>
        ),
    },
    {
      key: 'hasUnsettled',
      header: '미정산',
      width: '90px',
      align: 'center',
      render: (_v, s) =>
        s.hasUnsettled ? (
          <span className="text-amber-600 font-medium">있음 ({s.unsettledCount})</span>
        ) : (
          <span className="text-slate-400">없음</span>
        ),
    },
    {
      key: '_actions',
      header: '상태 변경',
      width: '84px',
      align: 'center',
      system: true,
      render: (_v, s) => {
        const actions =
          s.status === 'ACTIVE'
            ? [{ key: 'deactivate', label: '비활성화', variant: 'danger' as const, onClick: () => setDialog({ kind: 'deactivate', supplier: s }) }]
            : s.status === 'INACTIVE'
              ? [{ key: 'reactivate', label: '재활성화', onClick: () => setDialog({ kind: 'reactivate', supplier: s }) }]
              : [];
        return <RowActionMenu actions={actions} disabled={actionLoading} />;
      },
    },
  ];

  const activeCount = suppliers.filter((s) => s.status === 'ACTIVE').length;
  const inactiveCount = suppliers.filter((s) => s.status === 'INACTIVE').length;

  const deactivateMessage = dialog?.kind === 'deactivate'
    ? [
        `공급자: ${dialog.supplier.name}`,
        `현재 상태: 활성`,
        `진행 주문: ${dialog.supplier.hasActiveOrders ? `있음 (${dialog.supplier.activeOrderCount}건)` : '없음'}`,
        `미정산: ${dialog.supplier.hasUnsettled ? `있음 (${dialog.supplier.unsettledCount}건)` : '없음'}`,
        '',
        '비활성화하면 상품 승인이 회수되고 매장 진열·HUB 게시가 중단됩니다.',
        '진행 주문 또는 미정산이 있으면 비활성화할 수 없습니다.',
        '변경 사유를 입력해 주세요.',
      ].join('\n')
    : '';

  const reactivateMessage = dialog?.kind === 'reactivate'
    ? [
        `공급자: ${dialog.supplier.name}`,
        `현재 상태: 비활성`,
        '',
        '재활성화하면 다음 접근 상태가 복구됩니다:',
        '· 공급자 계정/조직 활성화 · 서비스 이용 · 공급자 권한',
        '',
        '다음은 자동 복구되지 않습니다 (운영자·공급자가 재수행):',
        '· 상품 승인 · 매장 진열 · HUB 게시 · 기타 상거래 상태',
        '',
        '변경 사유를 입력해 주세요.',
      ].join('\n')
    : '';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">공급자 상태 관리</h1>
        <p className="text-slate-500 mt-1">
          활성 공급자의 비활성화 및 비활성 공급자의 재활성화를 관리합니다 (admin 전용 governance).
          승인·거절은 운영자 승인 콘솔에서 처리합니다.
        </p>
      </div>

      {actionMessage && (
        <div
          className={`flex items-start justify-between gap-3 rounded-lg border p-3 text-sm ${
            actionMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="shrink-0 text-slate-400 hover:text-slate-600"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">전체 (활성+비활성)</p>
          <p className="text-2xl font-bold text-slate-800">{suppliers.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">활성</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">비활성</p>
          <p className="text-2xl font-bold text-slate-400">{inactiveCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="공급자명 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="flex gap-2 flex-wrap">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === s ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s === 'all' ? '전체' : statusLabels[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <DataTable<GovernanceSupplier>
        columns={columns}
        data={filtered}
        rowKey={(s) => s.id}
        loading={loading}
        emptyMessage={suppliers.length === 0 ? '활성/비활성 공급자가 없습니다' : '검색 결과가 없습니다'}
      />

      {/* §10: window.confirm 미사용 — 표준 ConfirmActionDialog(사유 필수) 재사용 */}
      <ConfirmActionDialog
        open={dialog?.kind === 'deactivate'}
        onClose={() => setDialog(null)}
        onConfirm={handleConfirm}
        title="공급자 비활성화"
        message={deactivateMessage}
        confirmText="비활성화"
        cancelText="취소"
        variant="danger"
        requireReason
        reasonPlaceholder="비활성화 사유를 입력하세요 (필수)"
        loading={actionLoading}
      />

      <ConfirmActionDialog
        open={dialog?.kind === 'reactivate'}
        onClose={() => setDialog(null)}
        onConfirm={handleConfirm}
        title="공급자 재활성화"
        message={reactivateMessage}
        confirmText="재활성화"
        cancelText="취소"
        variant="warning"
        requireReason
        reasonPlaceholder="재활성화 사유를 입력하세요 (필수)"
        loading={actionLoading}
      />
    </div>
  );
}
