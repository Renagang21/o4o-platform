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

import { OperatorDialog } from './OperatorDialog';
import { useState, useRef } from 'react';
import { SupplierDetailBody } from './OperatorSupplierApprovalDetail';
import { useSupplierApprovalWorkflow } from './useSupplierApprovalWorkflow';
import { statusFilters, statusColors, statusLabels, isProfileComplete, profileMissingLabels } from './operatorSupplierApprovalModel';
import {
  DataTable,
  Pagination,
  StandardListToolbar,
  useStandardListQuery,
  type ListColumnDef,
  type StandardListQueryState,
} from '@o4o/operator-ux-core';
import { ActionBar, BulkResultModal, BaseDetailDrawer } from '@o4o/ui';
import { CheckCircle, XCircle } from 'lucide-react';
import { operatorSupplierApi, type AdminSupplier } from '../../lib/api';
import SupplierRegulatedCategoriesModal from '../../components/supplier/SupplierRegulatedCategoriesModal';

export default function OperatorSupplierApprovalPage() {
  const dialogFallback = useRef<HTMLHeadingElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

  const {
    drawer, categoryModal, rejectModal, rejectReason, setRejectReason,
    actionLoading, actionMessage, setActionMessage, editing, savingEdit,
    editForm, setEditForm, batch, busy, openDrawer,
    closeDrawer, openCategories, closeCategories, closeReject, openSingleReject,
    handleStartEdit, handleCancelEdit, handleSaveEdit, handleBulkApprove, handleBulkReject,
    handleApproveSingle, handleRejectConfirm, handleDownloadDocument, closeBatchResult, retryBatch,
  } = useSupplierApprovalWorkflow(suppliers, selectedIds, clearSelection, refetch);

  const selectedItems = suppliers.filter((s) => selectedIds.has(s.id));
  // WO-O4O-NETURE-SUPPLIER-APPROVAL-AND-PROFILE-COMPLETION-SEPARATION-V1:
  // 프로필 미완료는 승인을 차단하지 않는다 — 선택 유무로만 판단.
  const approveDisabled = selectedItems.length === 0;

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
            onClick: () => openSingleReject(drawer),
            variant: 'danger' as const,
            disabled: busy,
          },
          {
            label: '승인',
            onClick: () => handleApproveSingle(drawer),
            variant: 'primary' as const,
            disabled: busy,
            loading: actionLoading === drawer.id,
          },
        ]
      : undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 ref={dialogFallback} tabIndex={-1} className="text-2xl font-bold text-slate-800">공급자 승인</h1>
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
              disabled: approveDisabled || busy,
              tooltip: '선택된 공급자를 일괄 승인합니다 (프로필 미완료는 승인 후 보완)',
            },
            {
              key: 'reject',
              label: `승인 거절 (${selectedItems.length})`,
              onClick: handleBulkReject,
              variant: 'danger' as const,
              icon: <XCircle size={14} />,
              loading: batch.loading,
              disabled: selectedItems.length === 0 || busy,
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
            onRowClick={openDrawer}
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
        onClose={closeDrawer}
        title={drawer?.name ?? '공급자 상세'}
        width={560}
        actions={drawerActions}
      >
        {actionMessage?.type === 'error' && <p role="alert" className="mb-3 text-red-700">{actionMessage.text}</p>}
        {drawer && (
          <SupplierDetailBody
            supplier={drawer}
            onOpenCategories={() => openCategories(drawer)}
            onDownload={handleDownloadDocument}
            editable={drawer.status === 'PENDING' && !busy}
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
          onClose={closeCategories}
        />
      )}

      {/* 거절 사유 모달 (단일 + 일괄 공용) */}
      {rejectModal && (
        <OperatorDialog label="공급자 거절" fallbackFocus={dialogFallback} busy={busy} onCancel={closeReject} className="bg-white rounded-xl p-6 max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              {rejectModal.bulk ? `공급자 일괄 거절 (${rejectModal.ids.length}건)` : '공급자 거절'}
            </h3>
            {!rejectModal.bulk && rejectModal.name && (
              <p className="text-sm text-slate-500 mb-2">{rejectModal.name}</p>
            )}
            <textarea data-dialog-initial-focus
              aria-label="거절 사유"
              disabled={busy}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="거절 사유를 입력하세요 (선택)"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
              rows={3}
            />
            {actionMessage?.type === 'error' && <p role="alert" className="mb-3 text-red-700">{actionMessage.text}</p>}
            <div className="flex gap-2 justify-end">
              <button
                disabled={busy}
                onClick={closeReject}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
              >
                취소
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={busy}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                거절
              </button>
            </div>
        </OperatorDialog>
      )}

      {/* 일괄 처리 결과 */}
      <BulkResultModal
        open={batch.showResult}
        onClose={closeBatchResult}
        result={batch.result}
        onRetry={retryBatch}
      />
    </div>
  );
}
