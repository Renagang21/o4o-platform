/**
 * OperatorSupplierApprovalPage — 공급자 승인 (Operator scope)
 *
 * WO-O4O-NETURE-SUPPLIER-ACTIVATION-VISIBILITY-AND-ACTION-QUEUE-FIX-V1
 * WO-O4O-NETURE-OPERATOR-SUPPLIER-APPROVAL-STANDARD-LIST-AND-MEMBER-IA-V1:
 *   자체 <table> + client 전량 필터링 → O4O 표준 리스트(useStandardListQuery + DataTable +
 *   Pagination + StandardListToolbar)로 전환. server-driven page/limit/search/status/sort +
 *   URL sync(suppliers_*). 선택 → ActionBar 일괄 승인/거절(useBatchAction + BulkResultModal),
 *   행 클릭 → BaseDetailDrawer 상세. 개별 승인/거절은 Drawer footer 에서 수행.
 *
 * 선행 IR : IR-O4O-NETURE-OPERATOR-DASHBOARD-DATA-ACCURACY-AUDIT-V1
 * 선행 CHECK: CHECK-O4O-NETURE-SUPPLIERS-PENDING-STALE-DATA-V1 — Case F (실제 2단계 대기) 확정
 *
 * Admin 화면 (/admin/admin-suppliers) 과의 차이:
 *  - operator scope endpoint (/api/v1/neture/operator/suppliers/*) 호출
 *  - '비활성화' (deactivate) 액션 미노출 — 활성 공급자 비활성화는 admin 정책으로 유지
 *
 * 활성화 가능 여부는 backend(activationReady/missingActivationFields)가 단일 권위.
 * 프론트는 필드를 재계산하지 않고 그대로 사용한다(구버전 payload 대비 fallback 만 유지).
 */

import { useState, type ReactNode } from 'react';
import {
  DataTable,
  Pagination,
  StandardListToolbar,
  useStandardListQuery,
  useBatchAction,
  type ListColumnDef,
  type StandardListQueryState,
} from '@o4o/operator-ux-core';
import { ActionBar, BulkResultModal, BaseDetailDrawer } from '@o4o/ui';
import { CheckCircle, XCircle } from 'lucide-react';
import { operatorSupplierApi, type AdminSupplier, ACTIVATION_FIELD_LABELS } from '../../lib/api';
import SupplierRegulatedCategoriesModal from '../../components/supplier/SupplierRegulatedCategoriesModal';

function activationLabels(s: AdminSupplier): string[] {
  return (s.missingActivationFields ?? []).map((f) => ACTIVATION_FIELD_LABELS[f] || f);
}

// backend 단일 권위. 구버전 payload(activationReady undefined) 대비 representativeName fallback.
function isActivationReady(s: AdminSupplier): boolean {
  return s.activationReady ?? !!s.representativeName;
}

const statusLabels: Record<string, string> = {
  PENDING: '승인대기',
  ACTIVE: '활성',
  REJECTED: '거절됨',
  INACTIVE: '비활성',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  INACTIVE: 'bg-slate-100 text-slate-500',
};

// 통신판매업 신고 상태 — 운영자 확인 항목 (ACTIVE 전환 차단 조건 아님)
const mailOrderStatusLabels: Record<string, string> = {
  not_applicable: '해당 없음',
  reported: '신고 완료',
  pending: '확인 필요',
};

// 상태 필터 (기본 = 승인대기). value '' = 전체.
const statusFilters: Array<{ value: string; label: string }> = [
  { value: 'PENDING', label: '승인대기' },
  { value: '', label: '전체' },
  { value: 'ACTIVE', label: '활성' },
  { value: 'REJECTED', label: '거절됨' },
  { value: 'INACTIVE', label: '비활성' },
];

// WO-O4O-NETURE-SUPPLIER-ACTIVATION-DOCUMENT-GATE-RELAXATION-V1:
// ACTIVE 승인은 기본 사업자 정보만 필수. 사업자등록증/정산정보/통장사본/세금계산서 이메일은
// 판매 전·정산 전 필요 항목으로 분리(활성화 차단 아님).
function getDeferredItems(supplier: AdminSupplier): { label: string; stage: string }[] {
  const items: { label: string; stage: string }[] = [];
  if (!supplier.businessRegistrationDocumentId) items.push({ label: '사업자등록증', stage: '판매 전' });
  if (!supplier.taxInvoiceEmail) items.push({ label: '세금계산서 이메일', stage: '정산 전' });
  if (!supplier.settlementBankName) items.push({ label: '은행명', stage: '정산 전' });
  if (!supplier.settlementAccountNumberMasked) items.push({ label: '계좌번호', stage: '정산 전' });
  if (!supplier.settlementAccountHolder) items.push({ label: '예금주', stage: '정산 전' });
  if (!supplier.settlementBankbookDocumentId) items.push({ label: '통장 사본', stage: '정산 전' });
  return items;
}
function describeDeferred(items: { label: string; stage: string }[]): string {
  return ['판매 전', '정산 전']
    .map((stage) => {
      const labels = items.filter((i) => i.stage === stage).map((i) => i.label);
      return labels.length ? `${stage} 필요: ${labels.join(', ')}` : null;
    })
    .filter(Boolean)
    .join(' · ');
}

export default function OperatorSupplierApprovalPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<AdminSupplier | null>(null);
  const [categoryModal, setCategoryModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectModal, setRejectModal] = useState<{ ids: string[]; bulk: boolean; name?: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const batch = useBatchAction();

  // ─── 표준 리스트 상태 (server-driven, URL sync) ───
  const {
    items: suppliers,
    pagination,
    query,
    loading,
    error,
    setPage,
    setSort,
    setSearch,
    setFilter,
    refetch,
  } = useStandardListQuery<AdminSupplier>({
    defaultLimit: 20,
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
    defaultFilters: { status: 'PENDING' },
    syncUrl: true,
    urlKeyPrefix: 'suppliers',
    fetcher: (q: StandardListQueryState) =>
      operatorSupplierApi.getSuppliersPaged({
        page: q.page,
        limit: q.limit,
        search: q.search || undefined,
        status: (q.filters.status as string) || undefined,
        sortBy: (q.sortBy as 'createdAt' | 'name' | 'status' | undefined) || undefined,
        sortOrder: q.sortOrder,
      }),
  });

  const isError = !!error;
  const statusFilter = (query.filters.status as string) || '';
  // 선택은 승인 대기(PENDING) 필터에서만 가능 — DataTable 행별 선택 제어 계약이 없어 필터 단위 토글로 우회.
  const selectable = statusFilter === 'PENDING';

  const clearSelection = () => setSelectedIds(new Set());

  // 검색/필터/페이지 변경 시 선택 초기화
  const handleSearch = (v: string) => { clearSelection(); setSearch(v); };
  const handleStatusFilter = (v: string) => { clearSelection(); setFilter('status', v || undefined); };
  const handlePage = (p: number) => { clearSelection(); setPage(p); };

  const selectedItems = suppliers.filter((s) => selectedIds.has(s.id));
  const selectedNotReady = selectedItems.filter((s) => !isActivationReady(s));
  const approveDisabled = selectedItems.length === 0 || selectedNotReady.length > 0;

  // ─── 일괄 처리 ───
  const handleBulkApprove = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await batch.executeBatch((bids) => operatorSupplierApi.batchProcess(bids, 'approve'), ids);
    clearSelection();
  };

  const handleBulkReject = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setRejectModal({ ids, bulk: true });
    setRejectReason('');
  };

  // ─── 단일 처리 (Drawer) ───
  const handleApproveSingle = async (s: AdminSupplier) => {
    setActionLoading(s.id);
    const result = await operatorSupplierApi.approveSupplier(s.id);
    setActionLoading(null);
    if (result.success) {
      setActionMessage({ type: 'success', text: `${s.name || '공급자'} 승인 완료 (ACTIVE)` });
      setDrawer(null);
      refetch();
      return;
    }
    let text = '승인에 실패했습니다. 잠시 후 다시 시도해 주세요.';
    if (result.code === 'ONBOARDING_INCOMPLETE') {
      const labels = (result.missingFields ?? []).map((f) => ACTIVATION_FIELD_LABELS[f] || f);
      text = labels.length
        ? `${labels.join(', ')}이(가) 비어 있어 승인할 수 없습니다. 공급자가 해당 정보를 입력해야 합니다.`
        : '필수 정보가 비어 있어 승인할 수 없습니다.';
    } else if (result.code === 'INVALID_STATUS') {
      text = '이미 처리된 공급자입니다. 목록을 새로고침합니다.';
      setDrawer(null);
      refetch();
    } else if (result.code === 'SUPPLIER_NOT_FOUND') {
      text = '공급자를 찾을 수 없습니다.';
    }
    setActionMessage({ type: 'error', text });
  };

  const handleRejectConfirm = async () => {
    if (!rejectModal) return;
    const { ids, bulk, name } = rejectModal;
    if (bulk) {
      await batch.executeBatch(
        (bids, opts) => operatorSupplierApi.batchProcess(bids, 'reject', opts?.reason as string | undefined),
        ids,
        { reason: rejectReason },
      );
      clearSelection();
    } else {
      setActionLoading(ids[0]);
      const ok = await operatorSupplierApi.rejectSupplier(ids[0], rejectReason);
      setActionLoading(null);
      if (ok) {
        setActionMessage({ type: 'success', text: `${name || '공급자'} 거절 처리 완료` });
        setDrawer(null);
        refetch();
      } else {
        setActionMessage({ type: 'error', text: '거절 처리에 실패했습니다. 다시 시도해 주세요.' });
      }
    }
    setRejectModal(null);
    setRejectReason('');
  };

  const handleDownloadDocument = async (
    supplierId: string,
    documentType: 'business_registration' | 'bank_statement' | 'mail_order_report',
  ) => {
    const blob = await operatorSupplierApi.downloadDocument(supplierId, documentType);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  // ─── 컬럼 정의 ───
  const columns: ListColumnDef<AdminSupplier>[] = [
    {
      key: 'name',
      header: '공급자',
      sortable: true,
      render: (_v, s) => (
        <div>
          <p className="font-medium text-slate-800">{s.name || '-'}</p>
          <p className="text-xs text-slate-400 mt-0.5">{s.email || `${s.id.slice(0, 8)}...`}</p>
        </div>
      ),
    },
    {
      key: 'representativeName',
      header: '대표·담당',
      render: (_v, s) => (
        <div className="text-sm text-slate-600">
          <div>{s.representativeName || '-'}</div>
          {(s.managerName || s.managerPhone) && (
            <div className="text-xs text-slate-400 mt-0.5">
              {[s.managerName, s.managerPhone].filter(Boolean).join(' / ')}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'businessNumber',
      header: '사업자번호',
      width: '130px',
      render: (_v, s) => <span className="text-sm text-slate-600">{s.businessNumber || '-'}</span>,
    },
    {
      key: 'activationReady',
      header: '승인 준비',
      width: '200px',
      render: (_v, s) => {
        const ready = isActivationReady(s);
        const missing = activationLabels(s);
        return (
          <div className={`text-sm ${ready ? 'text-emerald-700' : 'text-amber-700'}`}>
            {ready ? '승인 가능' : `누락: ${missing.join(', ') || '필수 정보'}`}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: '상태',
      align: 'center',
      width: '90px',
      sortable: true,
      render: (_v, s) => (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[s.status] || 'bg-gray-100 text-gray-700'}`}>
          {statusLabels[s.status] || s.status}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: '등록일',
      width: '110px',
      sortable: true,
      sortAccessor: (s) => new Date(s.createdAt).getTime(),
      render: (_v, s) => (
        <span className="text-xs text-slate-500">{new Date(s.createdAt).toLocaleDateString('ko-KR')}</span>
      ),
    },
  ];

  // ─── Drawer footer 액션 (PENDING 만) ───
  const drawerReady = drawer ? isActivationReady(drawer) : false;
  const drawerActions =
    drawer && drawer.status === 'PENDING'
      ? [
          {
            label: '승인 거절',
            onClick: () => { setRejectModal({ ids: [drawer.id], bulk: false, name: drawer.name }); setRejectReason(''); },
            variant: 'danger' as const,
            disabled: actionLoading === drawer.id,
          },
          {
            label: drawerReady ? '승인' : '승인 불가',
            onClick: () => handleApproveSingle(drawer),
            variant: 'primary' as const,
            disabled: !drawerReady || actionLoading === drawer.id,
            loading: actionLoading === drawer.id,
          },
        ]
      : undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">공급자 승인</h1>
        <p className="text-slate-500 mt-1">
          가입 승인 완료된 공급자의 기본 정보를 확인하고 운영자가 승인합니다 (PENDING → ACTIVE/REJECTED).
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

      {/* Toolbar: 검색 + 상태 필터 + 결과 요약 */}
      <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
        <StandardListToolbar
          searchValue={query.search ?? ''}
          searchPlaceholder="공급자명, 이메일, 사업자번호, 대표자명 검색..."
          onSearchChange={handleSearch}
          filters={
            <div className="flex gap-2 flex-wrap">
              {statusFilters.map((s) => (
                <button
                  key={s.value || 'all'}
                  onClick={() => handleStatusFilter(s.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    statusFilter === s.value
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          }
          summary={<>총 <span className="font-medium text-slate-700">{pagination.total}</span>건</>}
        />
      </div>

      {/* ActionBar — 선택 시 노출 (PENDING 필터에서만 선택 가능) */}
      {selectable && (
        <ActionBar
          selectedCount={selectedIds.size}
          onClearSelection={clearSelection}
          actions={[
            {
              key: 'approve',
              label: `승인 (${selectedItems.length})`,
              onClick: handleBulkApprove,
              variant: 'primary' as const,
              icon: <CheckCircle size={14} />,
              loading: batch.loading,
              disabled: approveDisabled,
              tooltip: approveDisabled && selectedNotReady.length > 0
                ? '필수 정보가 누락된 공급자가 포함되어 있어 승인할 수 없습니다'
                : '선택된 공급자를 일괄 승인합니다',
            },
            {
              key: 'reject',
              label: `승인 거절 (${selectedItems.length})`,
              onClick: handleBulkReject,
              variant: 'danger' as const,
              icon: <XCircle size={14} />,
              loading: batch.loading,
              disabled: selectedItems.length === 0,
              tooltip: '선택된 공급자를 일괄 거절합니다',
            },
          ]}
          statusInfo={
            selectedNotReady.length > 0
              ? `${selectedNotReady.length}건은 필수 정보 누락으로 승인할 수 없습니다.`
              : undefined
          }
        />
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {isError ? (
          <div className="text-center py-16">
            <p className="text-red-600 mb-4">
              {(error as { message?: string })?.message || '공급자 목록을 불러오는데 실패했습니다.'}
            </p>
            <button onClick={() => refetch()} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
              다시 시도
            </button>
          </div>
        ) : (
          <DataTable<AdminSupplier>
            columns={columns}
            data={suppliers}
            rowKey="id"
            loading={loading}
            emptyMessage={query.search || statusFilter ? '조건에 맞는 공급자가 없습니다.' : '등록된 공급자가 없습니다.'}
            onRowClick={(s) => setDrawer(s)}
            manualSort
            sortBy={query.sortBy}
            sortOrder={query.sortOrder}
            onSort={setSort}
            tableId="neture-operator-supplier-approvals"
            selectable={selectable}
            selectedKeys={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        )}
      </div>

      {!isError && pagination.totalPages > 1 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPageChange={handlePage}
        />
      )}

      {/* 상세 Drawer */}
      <BaseDetailDrawer
        open={!!drawer}
        onClose={() => setDrawer(null)}
        title={drawer?.name ?? '공급자 상세'}
        width={560}
        actions={drawerActions}
      >
        {drawer && (
          <SupplierDetailBody
            supplier={drawer}
            onOpenCategories={() => setCategoryModal({ id: drawer.id, name: drawer.name })}
            onDownload={handleDownloadDocument}
          />
        )}
      </BaseDetailDrawer>

      {/* 규제 품목군 검토 (Drawer 에서 진입) */}
      {categoryModal && (
        <SupplierRegulatedCategoriesModal
          supplierId={categoryModal.id}
          supplierName={categoryModal.name}
          api={operatorSupplierApi}
          onClose={() => setCategoryModal(null)}
        />
      )}

      {/* 거절 사유 모달 (단일 + 일괄 공용) */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              {rejectModal.bulk ? `공급자 일괄 거절 (${rejectModal.ids.length}건)` : '공급자 거절'}
            </h3>
            {!rejectModal.bulk && rejectModal.name && (
              <p className="text-sm text-slate-500 mb-2">{rejectModal.name}</p>
            )}
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="거절 사유를 입력하세요 (선택)"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
              >
                취소
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={batch.loading || (rejectModal.ids.length === 1 && actionLoading === rejectModal.ids[0])}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                거절
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 일괄 처리 결과 */}
      <BulkResultModal
        open={batch.showResult}
        onClose={() => { batch.clearResult(); refetch(); }}
        result={batch.result}
        onRetry={() => { batch.retryFailed(); }}
      />
    </div>
  );
}

// ─── Drawer 본문 ───
function SupplierDetailBody({
  supplier: s,
  onOpenCategories,
  onDownload,
}: {
  supplier: AdminSupplier;
  onOpenCategories: () => void;
  onDownload: (id: string, type: 'business_registration' | 'bank_statement' | 'mail_order_report') => void;
}) {
  const ready = isActivationReady(s);
  const missing = activationLabels(s);
  const deferred = getDeferredItems(s);

  const Row = ({ label, value }: { label: string; value: ReactNode }) => (
    <div className="flex gap-3 mb-2.5">
      <span className="font-semibold text-slate-500 min-w-[88px] shrink-0">{label}</span>
      <span className="text-slate-800">{value}</span>
    </div>
  );

  return (
    <div className="text-sm text-slate-700">
      {/* 기본 정보 */}
      <div className="mb-5">
        <Row label="공급자명" value={s.name || '-'} />
        <Row label="이메일" value={s.email || '-'} />
        <Row label="대표자" value={s.representativeName || '-'} />
        <Row label="담당자" value={[s.managerName, s.managerPhone].filter(Boolean).join(' / ') || '-'} />
        <Row label="사업자번호" value={s.businessNumber || '-'} />
        <Row
          label="상태"
          value={
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[s.status] || 'bg-gray-100 text-gray-700'}`}>
              {statusLabels[s.status] || s.status}
            </span>
          }
        />
        <Row label="등록일" value={new Date(s.createdAt).toLocaleDateString('ko-KR')} />
      </div>

      {/* 승인 준비 상태 */}
      <div className={`mb-5 rounded-lg border p-3 ${ready ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
        <div className={`font-medium ${ready ? 'text-emerald-700' : 'text-amber-700'}`}>
          {ready ? '승인 가능 (기본 정보 완료)' : '승인 불가 — 필수 정보 누락'}
        </div>
        {!ready && missing.length > 0 && (
          <div className="text-xs text-amber-700 mt-1">누락: {missing.join(', ')}</div>
        )}
        {deferred.length > 0 && (
          <div className="text-xs text-slate-500 mt-1">{describeDeferred(deferred)}</div>
        )}
      </div>

      {/* 정산 정보 */}
      <div className="mb-5">
        <div className="text-xs font-semibold text-slate-500 mb-2">정산 정보</div>
        <Row
          label="계좌"
          value={
            s.settlementBankName && s.settlementAccountHolder
              ? `${s.settlementBankName} / ${s.settlementAccountHolder} / ${s.settlementAccountNumberMasked || '-'}`
              : '정산 정보 없음'
          }
        />
        <Row label="세금계산서" value={s.taxInvoiceEmail || '-'} />
      </div>

      {/* 통신판매업 */}
      <div className="mb-5">
        <div className="text-xs font-semibold text-slate-500 mb-2">통신판매업</div>
        <Row
          label="신고 상태"
          value={
            s.mailOrderSalesStatus
              ? `${mailOrderStatusLabels[s.mailOrderSalesStatus] || s.mailOrderSalesStatus}${s.mailOrderSalesRegistrationNumber ? ` (${s.mailOrderSalesRegistrationNumber})` : ''}`
              : '미입력'
          }
        />
      </div>

      {/* 서류 다운로드 */}
      <div className="mb-5 flex flex-wrap gap-3 text-xs">
        {s.businessRegistrationDocumentId && (
          <button type="button" onClick={() => onDownload(s.id, 'business_registration')} className="text-emerald-700 hover:text-emerald-900 underline">
            사업자등록증
          </button>
        )}
        {s.settlementBankbookDocumentId && (
          <button type="button" onClick={() => onDownload(s.id, 'bank_statement')} className="text-emerald-700 hover:text-emerald-900 underline">
            통장 사본
          </button>
        )}
        {s.mailOrderSalesDocumentId && (
          <button type="button" onClick={() => onDownload(s.id, 'mail_order_report')} className="text-emerald-700 hover:text-emerald-900 underline">
            통신판매업 신고증
          </button>
        )}
      </div>

      {/* 규제 품목군 */}
      <div className="border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onOpenCategories}
          className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
        >
          규제 품목군 검토
        </button>
      </div>
    </div>
  );
}
