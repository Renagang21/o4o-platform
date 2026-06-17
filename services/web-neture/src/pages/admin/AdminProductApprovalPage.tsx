/**
 * AdminProductApprovalPage - 상품/오퍼 승인 관리
 *
 * WO-O4O-ADMIN-UI-COMPLETION-V1
 * WO-O4O-ADMIN-PRODUCT-APPROVAL-STANDARD-LIST-ADOPTION-V1:
 *   자체 <table> + client 전량 필터링 → 표준 리스트(useStandardListQuery + DataTable +
 *   Pagination + StandardListToolbar)로 전환. server-driven page/limit/search/sort/filter +
 *   URL sync(productApprovals_*). KPI 4카드는 getSummary()(전체 기준) 사용.
 *   승인/반려/상세 모달 흐름은 무회귀 유지(성공 후 list refetch + summary refetch).
 *   - backend search 는 master.name(상품명) 기준 → 검색 placeholder "상품명으로 검색".
 *   - sortable 은 backend whitelist(approvalStatus/distributionType/createdAt)에 한정.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  DataTable,
  Pagination,
  StandardListToolbar,
  useStandardListQuery,
  type ListColumnDef,
  type StandardListQueryState,
} from '@o4o/operator-ux-core';
import {
  adminProductApi,
  type AdminProduct,
  type AdminProductSummary,
} from '../../lib/api';
import { ContentPreview } from '@o4o/content-editor';

const statusLabels: Record<string, string> = {
  PENDING: '승인대기',
  APPROVED: '승인됨',
  REJECTED: '반려됨',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const distLabels: Record<string, string> = {
  PUBLIC: '공개',
  SERVICE: '서비스',
  PRIVATE: '비공개',
};

const SUMMARY_DEFAULT: AdminProductSummary = { total: 0, pending: 0, approved: 0, rejected: 0 };

const statusFilters: Array<{ value: string; label: string }> = [
  { value: '', label: '전체' },
  { value: 'PENDING', label: '승인대기' },
  { value: 'APPROVED', label: '승인됨' },
  { value: 'REJECTED', label: '반려됨' },
];

export default function AdminProductApprovalPage() {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [approveConfirmId, setApproveConfirmId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detailProduct, setDetailProduct] = useState<AdminProduct | null>(null);

  // ─── KPI summary (전체 기준 — pagination 도입으로 client 전량 집계 불가) ───
  const [summary, setSummary] = useState<AdminProductSummary>(SUMMARY_DEFAULT);
  const loadSummary = useCallback(async () => {
    const data = await adminProductApi.getSummary();
    setSummary(data || SUMMARY_DEFAULT);
  }, []);
  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // ─── 표준 리스트 상태 (server-driven, URL sync) ───
  const {
    items: products,
    pagination,
    query,
    loading,
    error,
    setPage,
    setSort,
    setSearch,
    setFilter,
    refetch,
  } = useStandardListQuery<AdminProduct>({
    defaultLimit: 20,
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
    syncUrl: true,
    urlKeyPrefix: 'productApprovals',
    fetcher: (q: StandardListQueryState) =>
      adminProductApi.getProductsList({
        page: q.page,
        limit: q.limit,
        search: q.search || undefined,
        sortBy: q.sortBy as
          | 'createdAt'
          | 'approvalStatus'
          | 'distributionType'
          | 'priceGeneral'
          | 'isActive'
          | undefined,
        sortOrder: q.sortOrder,
        approvalStatus:
          (q.filters.approvalStatus as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined) || undefined,
      }),
  });

  const statusFilter = (query.filters.approvalStatus as string) ?? '';

  const handleApprove = async () => {
    if (!approveConfirmId) return;
    const id = approveConfirmId;
    setApproveConfirmId(null);
    setActionLoading(id);
    const ok = await adminProductApi.approveProduct(id);
    setActionLoading(null);
    if (ok) {
      refetch();
      loadSummary();
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal.id);
    const ok = await adminProductApi.rejectProduct(rejectModal.id, rejectReason);
    setActionLoading(null);
    setRejectModal(null);
    setRejectReason('');
    if (ok) {
      refetch();
      loadSummary();
    }
  };

  const isError = error && (error as { message?: string }).message;

  const columns: ListColumnDef<AdminProduct>[] = [
    {
      key: 'marketingName',
      header: '상품명',
      render: (_v, p) => (
        <div>
          <p className="font-medium text-slate-800">{p.marketingName || p.masterName || '-'}</p>
          <p className="text-xs text-slate-400 mt-0.5">{p.id.slice(0, 8)}...</p>
        </div>
      ),
    },
    {
      key: 'supplierName',
      header: '공급자',
      render: (_v, p) => <span className="text-sm text-slate-600">{p.supplierName || '-'}</span>,
    },
    {
      key: 'category',
      header: '카테고리',
      render: (_v, p) => <span className="text-sm text-slate-600">{p.category || '-'}</span>,
    },
    {
      key: 'distributionType',
      header: '유통정책',
      sortable: true,
      width: '110px',
      render: (_v, p) => (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          {distLabels[p.distributionType] || p.distributionType}
        </span>
      ),
    },
    {
      key: 'approvalStatus',
      header: '상태',
      sortable: true,
      width: '110px',
      render: (_v, p) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[p.approvalStatus] || 'bg-gray-100 text-gray-700'}`}>
          {statusLabels[p.approvalStatus] || p.approvalStatus}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: '등록일',
      sortable: true,
      width: '110px',
      render: (_v, p) => (
        <span className="text-sm text-slate-500">{new Date(p.createdAt).toLocaleDateString('ko-KR')}</span>
      ),
    },
    {
      key: '_actions',
      header: '관리',
      system: true,
      width: '120px',
      align: 'center',
      render: (_v, p) =>
        p.approvalStatus === 'PENDING' ? (
          <span className="space-x-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setApproveConfirmId(p.id)}
              disabled={actionLoading === p.id}
              className="text-emerald-600 hover:text-emerald-800 font-medium text-sm disabled:opacity-50"
            >
              {actionLoading === p.id ? '처리중...' : '승인'}
            </button>
            <button
              onClick={() => setRejectModal({ id: p.id, name: p.marketingName || p.masterName || '' })}
              disabled={actionLoading === p.id}
              className="text-red-500 hover:text-red-700 font-medium text-sm disabled:opacity-50"
            >
              반려
            </button>
          </span>
        ) : null,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">상품 승인 관리</h1>
        <p className="text-slate-500 mt-1">상품 오퍼를 검토하고 승인/반려합니다</p>
      </div>

      {/* KPI — 전체 기준 (getSummary) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">전체</p>
          <p className="text-2xl font-bold text-slate-800">{summary.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">승인대기</p>
          <p className="text-2xl font-bold text-amber-600">{summary.pending}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">승인됨</p>
          <p className="text-2xl font-bold text-green-600">{summary.approved}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">반려됨</p>
          <p className="text-2xl font-bold text-red-500">{summary.rejected}</p>
        </div>
      </div>

      {/* Toolbar: 검색(상품명) + status 필터 */}
      <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
        <StandardListToolbar
          searchValue={query.search ?? ''}
          searchPlaceholder="상품명으로 검색..."
          onSearchChange={setSearch}
          filters={
            <div className="flex gap-2 flex-wrap">
              {statusFilters.map((s) => (
                <button
                  key={s.value || 'all'}
                  onClick={() => setFilter('approvalStatus', s.value || undefined)}
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

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {isError ? (
          <div className="text-center py-16">
            <p className="text-red-600 mb-4">
              {(error as { message?: string }).message || '상품 목록을 불러오는데 실패했습니다.'}
            </p>
            <button onClick={() => refetch()} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
              다시 시도
            </button>
          </div>
        ) : (
          <DataTable<AdminProduct>
            columns={columns}
            data={products}
            rowKey="id"
            loading={loading}
            emptyMessage={
              query.search || statusFilter ? '조건에 맞는 상품이 없습니다.' : '등록된 상품이 없습니다.'
            }
            onRowClick={(p) => setDetailProduct(p)}
            manualSort
            sortBy={query.sortBy}
            sortOrder={query.sortOrder}
            onSort={setSort}
            tableId="neture-admin-product-approvals"
          />
        )}
      </div>

      {!isError && pagination.totalPages > 1 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          onPageChange={setPage}
        />
      )}

      {approveConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-3">상품 승인</h3>
            <p className="text-sm text-slate-600 mb-5">이 상품을 승인하시겠습니까?</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setApproveConfirmId(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
              >
                취소
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                승인
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">상품 반려</h3>
            <p className="text-sm text-slate-500 mb-4">{rejectModal.name}</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="반려 사유를 입력하세요 (선택)"
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
                onClick={handleReject}
                disabled={actionLoading === rejectModal.id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === rejectModal.id ? '처리중...' : '반려'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{detailProduct.marketingName || detailProduct.masterName || '-'}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{detailProduct.supplierName} · {distLabels[detailProduct.distributionType] || detailProduct.distributionType}</p>
              </div>
              <button onClick={() => setDetailProduct(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
            <div className="overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500">상태:</span> <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[detailProduct.approvalStatus] || 'bg-gray-100 text-gray-700'}`}>{statusLabels[detailProduct.approvalStatus] || detailProduct.approvalStatus}</span></div>
                <div><span className="text-slate-500">등록일:</span> <span className="ml-1 text-slate-800">{new Date(detailProduct.createdAt).toLocaleDateString('ko-KR')}</span></div>
              </div>

              {(detailProduct.consumerShortDescription || detailProduct.consumerDetailDescription) && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">B2C 상품 설명</h4>
                  {detailProduct.consumerShortDescription && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">소비자용 간이 설명</p>
                      <div className="border border-slate-200 rounded-lg p-3">
                        <ContentPreview html={detailProduct.consumerShortDescription} />
                      </div>
                    </div>
                  )}
                  {detailProduct.consumerDetailDescription && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">소비자용 상세 설명</p>
                      <div className="border border-slate-200 rounded-lg p-3">
                        <ContentPreview html={detailProduct.consumerDetailDescription} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(detailProduct.businessShortDescription || detailProduct.businessDetailDescription) && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">B2B 상품 설명</h4>
                  {detailProduct.businessShortDescription && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">B2B 간이 설명</p>
                      <div className="border border-slate-200 rounded-lg p-3">
                        <ContentPreview html={detailProduct.businessShortDescription} />
                      </div>
                    </div>
                  )}
                  {detailProduct.businessDetailDescription && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">B2B 상세 설명</p>
                      <div className="border border-slate-200 rounded-lg p-3">
                        <ContentPreview html={detailProduct.businessDetailDescription} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!detailProduct.consumerShortDescription && !detailProduct.consumerDetailDescription &&
               !detailProduct.businessShortDescription && !detailProduct.businessDetailDescription && (
                <p className="text-sm text-slate-400 text-center py-4">등록된 설명이 없습니다</p>
              )}
            </div>
            <div className="flex gap-2 justify-end p-6 border-t border-slate-100">
              {detailProduct.approvalStatus === 'PENDING' && (
                <>
                  <button
                    onClick={() => { setApproveConfirmId(detailProduct.id); setDetailProduct(null); }}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => { setRejectModal({ id: detailProduct.id, name: detailProduct.marketingName || detailProduct.masterName || '' }); setDetailProduct(null); }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    반려
                  </button>
                </>
              )}
              <button onClick={() => setDetailProduct(null)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
