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

import { useEffect, useState, type ReactNode } from 'react';
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
import { operatorSupplierApi, type AdminSupplier, PROFILE_FIELD_LABELS } from '../../lib/api';
import SupplierRegulatedCategoriesModal from '../../components/supplier/SupplierRegulatedCategoriesModal';

// WO-O4O-NETURE-SUPPLIER-APPROVAL-AND-PROFILE-COMPLETION-SEPARATION-V1:
// 프로필 완성 상태는 정보성 표시(정보 미완료 배지)로만 사용 — 승인 버튼을 비활성화하지 않는다.
function profileMissingLabels(s: AdminSupplier): string[] {
  const missing = s.missingProfileFields ?? s.missingActivationFields ?? [];
  return missing.map((f) => PROFILE_FIELD_LABELS[f] || f);
}

// backend 단일 권위. 구버전 payload 대비 representativeName fallback.
function isProfileComplete(s: AdminSupplier): boolean {
  return s.profileComplete ?? s.activationReady ?? !!s.representativeName;
}

// WO-O4O-NETURE-OPERATOR-SUPPLIER-BASIC-INFO-COMPLETION-V1:
// 운영자가 승인 전 직접 보완 가능한 기본 정보 필드 (backend PATCH 화이트리스트와 일치)
interface SupplierEditForm {
  representativeName: string;
  managerName: string;
  managerPhone: string;
  businessNumber: string;
  taxInvoiceEmail: string;
}
const EMPTY_EDIT_FORM: SupplierEditForm = {
  representativeName: '',
  managerName: '',
  managerPhone: '',
  businessNumber: '',
  taxInvoiceEmail: '',
};
function toEditForm(s: AdminSupplier): SupplierEditForm {
  return {
    representativeName: s.representativeName || '',
    managerName: s.managerName || '',
    managerPhone: s.managerPhone || '',
    businessNumber: s.businessNumber || '',
    taxInvoiceEmail: s.taxInvoiceEmail || '',
  };
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

  // WO-O4O-NETURE-OPERATOR-SUPPLIER-BASIC-INFO-COMPLETION-V1: 운영자 기본 정보 보완 (Drawer 내 편집)
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<SupplierEditForm>(EMPTY_EDIT_FORM);

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
  // WO-O4O-NETURE-SUPPLIER-APPROVAL-AND-PROFILE-COMPLETION-SEPARATION-V1:
  // 프로필 미완료는 승인을 차단하지 않는다 — 선택 유무로만 판단.
  const approveDisabled = selectedItems.length === 0;

  // 드로어를 다시 열 때(다른 공급자 선택) 편집 모드 초기화
  useEffect(() => {
    setEditing(false);
  }, [drawer?.id]);

  // 저장 후 refetch 로 목록이 갱신되면, 열려 있는 드로어를 최신 행으로 동기화하여
  // backend 가 재계산한 activationReady/missingActivationFields 를 그대로 반영한다(프론트 재계산 금지).
  useEffect(() => {
    if (!drawer) return;
    const fresh = suppliers.find((s) => s.id === drawer.id);
    if (fresh && fresh !== drawer) setDrawer(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suppliers]);

  const handleStartEdit = () => {
    if (!drawer) return;
    setEditForm(toEditForm(drawer));
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditForm(EMPTY_EDIT_FORM);
  };

  const handleSaveEdit = async () => {
    if (!drawer) return;
    setSavingEdit(true);
    const res = await operatorSupplierApi.updateBasicInfo(drawer.id, editForm);
    setSavingEdit(false);
    if (res.success) {
      setActionMessage({ type: 'success', text: `${drawer.name || '공급자'} 기본 정보를 저장했습니다.` });
      setEditing(false);
      refetch();
    } else {
      setActionMessage({ type: 'error', text: '정보 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.' });
    }
  };

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
    // WO-O4O-NETURE-SUPPLIER-APPROVAL-AND-PROFILE-COMPLETION-SEPARATION-V1:
    // ONBOARDING_INCOMPLETE 게이트 제거 — 프로필 미완료는 승인을 차단하지 않는다.
    if (result.code === 'INVALID_STATUS') {
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
      key: 'profileComplete',
      header: '프로필 정보',
      width: '200px',
      render: (_v, s) => {
        const complete = isProfileComplete(s);
        const missing = profileMissingLabels(s);
        return complete ? (
          <div className="text-sm text-emerald-700">완료</div>
        ) : (
          <div className="text-sm">
            <span className="inline-block rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
              정보 미완료
            </span>
            <div className="mt-0.5 text-xs text-slate-500">미입력: {missing.join(', ') || '기본 정보'}</div>
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
  // WO-O4O-NETURE-SUPPLIER-APPROVAL-AND-PROFILE-COMPLETION-SEPARATION-V1:
  // 프로필 미완료여도 승인 버튼은 항상 활성 — 프로필은 승인 후 보완 항목.
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
            label: '승인',
            onClick: () => handleApproveSingle(drawer),
            variant: 'primary' as const,
            disabled: actionLoading === drawer.id,
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
              tooltip: '선택된 공급자를 일괄 승인합니다 (프로필 미완료는 승인 후 보완)',
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
            editable={drawer.status === 'PENDING'}
            editing={editing}
            editForm={editForm}
            savingEdit={savingEdit}
            onChangeEditForm={(patch) => setEditForm((prev) => ({ ...prev, ...patch }))}
            onStartEdit={handleStartEdit}
            onCancelEdit={handleCancelEdit}
            onSaveEdit={handleSaveEdit}
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
  editable,
  editing,
  editForm,
  savingEdit,
  onChangeEditForm,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
}: {
  supplier: AdminSupplier;
  onOpenCategories: () => void;
  onDownload: (id: string, type: 'business_registration' | 'bank_statement' | 'mail_order_report') => void;
  editable: boolean;
  editing: boolean;
  editForm: SupplierEditForm;
  savingEdit: boolean;
  onChangeEditForm: (patch: Partial<SupplierEditForm>) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
}) {
  const complete = isProfileComplete(s);
  const missing = profileMissingLabels(s);
  const deferred = getDeferredItems(s);

  const Row = ({ label, value }: { label: string; value: ReactNode }) => (
    <div className="flex gap-3 mb-2.5">
      <span className="font-semibold text-slate-500 min-w-[88px] shrink-0">{label}</span>
      <span className="text-slate-800">{value}</span>
    </div>
  );

  // 인라인 .map() 으로 렌더 — 별도 컴포넌트로 분리하면 매 렌더 remount 되어 입력 포커스가 빠진다.
  const editFields: { label: string; field: keyof SupplierEditForm; placeholder: string }[] = [
    { label: '대표자', field: 'representativeName', placeholder: '대표자명' },
    { label: '담당자명', field: 'managerName', placeholder: '담당자명' },
    { label: '담당자 연락처', field: 'managerPhone', placeholder: '숫자만 입력' },
    { label: '사업자번호', field: 'businessNumber', placeholder: '000-00-00000' },
    { label: '세금계산서', field: 'taxInvoiceEmail', placeholder: '세금계산서 이메일' },
  ];

  return (
    <div className="text-sm text-slate-700">
      {/* 기본 정보 */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500">기본 정보</span>
          {editable && !editing && (
            <button
              type="button"
              onClick={onStartEdit}
              className="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium"
            >
              정보 보완
            </button>
          )}
        </div>
        <Row label="공급자명" value={s.name || '-'} />
        <Row label="이메일" value={s.email || '-'} />
        {editing ? (
          <>
            {editFields.map(({ label, field, placeholder }) => (
              <div key={field} className="flex gap-3 mb-2.5 items-center">
                <span className="font-semibold text-slate-500 min-w-[88px] shrink-0">{label}</span>
                <input
                  type="text"
                  value={editForm[field]}
                  placeholder={placeholder}
                  onChange={(e) => onChangeEditForm({ [field]: e.target.value } as Partial<SupplierEditForm>)}
                  className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            ))}
            <div className="flex gap-2 justify-end mt-3">
              <button
                type="button"
                onClick={onCancelEdit}
                disabled={savingEdit}
                className="px-3 py-1.5 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 text-sm disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={onSaveEdit}
                disabled={savingEdit}
                className="px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 text-sm disabled:opacity-50"
              >
                {savingEdit ? '저장 중…' : '저장'}
              </button>
            </div>
          </>
        ) : (
          <>
            <Row label="대표자" value={s.representativeName || '-'} />
            <Row label="담당자" value={[s.managerName, s.managerPhone].filter(Boolean).join(' / ') || '-'} />
            <Row label="사업자번호" value={s.businessNumber || '-'} />
            <Row label="세금계산서" value={s.taxInvoiceEmail || '-'} />
          </>
        )}
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

      {/* 프로필 정보 상태 — 승인 차단 아님 (승인 후 보완 항목) */}
      <div className={`mb-5 rounded-lg border p-3 ${complete ? 'border-emerald-200 bg-emerald-50' : 'border-sky-200 bg-sky-50'}`}>
        <div className={`font-medium ${complete ? 'text-emerald-700' : 'text-sky-700'}`}>
          {complete ? '프로필 정보 완료' : '정보 미완료 — 승인은 가능하며, 승인 후 공급자가 보완합니다'}
        </div>
        {!complete && missing.length > 0 && (
          <div className="text-xs text-sky-700 mt-1">미입력: {missing.join(', ')}</div>
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
