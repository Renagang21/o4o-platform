/**
 * SupplierProductsPage — 엑셀형 공급자 제품 관리
 *
 * WO-NETURE-SUPPLIER-EXCEL-LIST-V1
 * WO-O4O-NETURE-SUPPLIER-PRODUCTS-UX-REFORM-V1 — 벌크 가격 제거, 인라인 편집, 일괄 삭제
 * WO-NETURE-SUPPLIER-CONTENT-EDIT-UX-V1 — 이미지/설명 필터, 업로드 모달, 설명 편집 모달
 * WO-NETURE-SUPPLIER-PRODUCT-COMPLETENESS-MANAGEMENT-V1 — 완성도 점수, 진행바, 필터
 * WO-NETURE-SUPPLIER-WORKFLOW-SHORTCUTS-V1 — 부족 항목 클릭 → 편집 UI 바로 열기
 * WO-NETURE-SUPPLIER-EDIT-UI-CONSISTENCY-FIX-V1 — 재고/규제/이미지타입/상품명 편집
 *
 * EditableDataTable 기반. 다건 인라인 편집 + batch 저장.
 * 검색/정렬/페이지네이션/필터 지원.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { GuideBackLink } from '../../components/GuideBackLink';
import type { SupplierSpaceOutletContext } from '../../components/layouts/SupplierSpaceLayout';
import { Plus, X, Send, Info, FileText } from 'lucide-react';
import { ContentRenderer } from '@o4o/content-editor';
import { EditableDataTable, SearchBar, Pagination } from '@o4o/operator-ux-core';
import type { SupplierProduct } from '../../lib/api';
import ProductDetailDrawer from './ProductDetailDrawer';
import RecruitmentCreateModal from '../../components/supplier/RecruitmentCreateModal';
import { REGULATORY_TYPE_LABELS } from '../../lib/productConstants';
import { useSupplierProducts } from './supplier-products/useSupplierProducts';
import { useSupplierProductColumns } from './supplier-products/useSupplierProductColumns';
import { APPROVAL_GATE_PROFILE_URL, type ApprovalTab, type RecruitModalProduct } from './supplier-products/productListFeedback';

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        active
          ? 'bg-slate-800 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

// WO-O4O-SUPPLIER-POST-REGISTRATION-PRODUCT-MANAGEMENT-OFFER-FIRST-REALIGNMENT-V1 §B (2026-09-23):
//   목록의 ImageUploadModal 은 제거됐다 — 이미지 관리는 ProductDetailDrawer 한 곳에서만 한다.
//   Drawer 가 동일 3타입(thumbnail·detail·content) 업로드·라이브러리 선택·삭제·대표 지정을 모두 제공한다.

// ─── Regulatory Info Modal (WO-NETURE-SUPPLIER-EDIT-UI-CONSISTENCY-FIX-V1) ───

function RegulatoryInfoModal({
  product,
  onClose,
}: {
  product: SupplierProduct;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-[420px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">규제 정보</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X size={18} /></button>
        </div>

        <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-4">
          규제 정보는 상품 등록 시 설정되며 수정할 수 없습니다.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-0.5">규제 유형</label>
            <p className="text-sm text-slate-900">
              {product.regulatoryType ? (REGULATORY_TYPE_LABELS[product.regulatoryType] || product.regulatoryType) : '-'}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-0.5">포장명 (규제명)</label>
            <p className="text-sm text-slate-900">{product.regulatoryName || '-'}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-0.5">MFDS 허가번호</label>
            <p className="text-sm text-slate-900 font-mono">{product.mfdsPermitNumber || '-'}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-0.5">제조사</label>
            <p className="text-sm text-slate-900">{product.manufacturerName || '-'}</p>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">닫기</button>
        </div>
      </div>
    </div>
  );
}

// WO-NETURE-SUPPLIER-APPROVAL-REQUEST-USE-SAVED-DISTRIBUTION-POLICY-V1:
// ServiceKeySelectModal 제거 — 승인 요청 시 상품에 저장된 공급 정책 사용

export default function SupplierProductsPage() {
  const navigate = useNavigate();
  // WO-O4O-SELLER-RECRUITMENT-CREATION-FLOW-V1
  const [recruitModalProduct, setRecruitModalProduct] = useState<RecruitModalProduct | null>(null);

  // WO-NETURE-SUPPLIER-PRODUCT-LIST-WIDE-TABLE-VIEW-APPLY-V1
  // 21개 컬럼 wide table — 부모 레이아웃(SupplierSpaceLayout)의 max-w 제약 해제
  const outletCtx = useOutletContext<SupplierSpaceOutletContext | null>();
  useEffect(() => {
    outletCtx?.setWideMode?.(true);
    return () => outletCtx?.setWideMode?.(false);
  }, [outletCtx]);

  const [regulatoryProduct, setRegulatoryProduct] = useState<SupplierProduct | null>(null);
  const [previewProduct, setPreviewProduct] = useState<SupplierProduct | null>(null);
  const {
    products,
    pagination,
    keyword,
    setKeyword,
    loading,
    loadError,
    saving,
    selectedIds,
    setSelectedIds,
    bulkDeleting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    toast,
    approvalResult,
    setApprovalResult,
    filterHasImage,
    setFilterHasImage,
    filterHasDescription,
    setFilterHasDescription,
    filterBarcodeSource,
    setFilterBarcodeSource,
    filterCompleteness,
    setFilterCompleteness,
    filterVisibility,
    setFilterVisibility,
    activeTab,
    setActiveTab,
    tabCounts,
    countsError,
    drawerProduct,
    setDrawerProduct,
    closeDrawer,
    setPage,
    autoNext,
    setAutoNext,
    highlightRowId,
    showToast,
    toggleSelect,
    toggleSelectAll,
    handleBulkDelete,
    filteredProducts,
    hasAnyFilter,
    resetAllFilters,
    fetchProducts,
    fetchTabCounts,
    handleSearch,
    handleSave,
    toggleFilter,
    handleSubmitApproval
  } = useSupplierProducts();
  const enhancedColumns = useSupplierProductColumns({ products, selectedIds, highlightRowId, toggleSelect, toggleSelectAll, setDrawerProduct, showToast, navigate, setRegulatoryProduct, setPreviewProduct, setRecruitModalProduct });
  const emptyStateNode = useMemo(() => {
    if (hasAnyFilter) {
      return (
        <div className="flex flex-col items-center gap-2 py-8">
          <p className="text-sm text-slate-500">현재 필터/검색 조건에 맞는 상품이 없습니다.</p>
          <p className="text-xs text-slate-400">검색어나 필터를 초기화한 뒤 다시 확인해 주세요.</p>
          <button
            type="button"
            onClick={resetAllFilters}
            className="mt-1 px-3 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded"
          >
            필터 초기화
          </button>
        </div>
      );
    }
    return '등록된 제품이 없습니다';
  }, [hasAnyFilter, resetAllFilters]);


  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in">
          {toast}
        </div>
      )}

      {/* WO-O4O-SUPPLIER-PRODUCT-APPROVAL-GATE-UX-MESSAGE-IMPROVEMENT-V1: 승인 요청 결과 banner */}
      {approvalResult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setApprovalResult(null)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">승인 요청 결과</h2>
              <button
                type="button"
                onClick={() => setApprovalResult(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                aria-label="닫기"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 overflow-y-auto">
              {/* 요약 */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-4">
                <span className="text-emerald-700 font-semibold">승인 요청 완료: {approvalResult.submitted}건</span>
                <span className="text-amber-700 font-semibold">승인 요청 제외: {approvalResult.skipped.length}건</span>
                {approvalResult.errorCount > 0 && (
                  <span className="text-red-600 font-semibold">오류: {approvalResult.errorCount}건</span>
                )}
              </div>
              {approvalResult.submitted === 0 && approvalResult.skipped.length > 0 && (
                <p className="text-sm text-slate-500 mb-3">선택한 상품 중 승인 요청 가능한 상품이 없습니다.</p>
              )}

              {/* 제외 상품 목록 */}
              {approvalResult.skipped.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-slate-500">제외된 상품</p>
                  {approvalResult.skipped.map((item) => (
                    <div key={`${item.id}-${item.reason}`} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-900">{item.name}</span>
                        <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded">{item.category}</span>
                      </div>
                      <p className="text-sm text-amber-800 mt-1">{item.display.status}</p>
                      <p className="text-xs text-slate-500 mt-0.5">다음 작업: {item.display.nextAction}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 푸터: CTA + 확인 */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100">
              {approvalResult.skipped.some((s) => s.display.cta) && (
                <button
                  type="button"
                  onClick={() => { setApprovalResult(null); navigate(APPROVAL_GATE_PROFILE_URL); }}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                >
                  공급 예정 품목군 관리로 이동
                </button>
              )}
              <button
                type="button"
                onClick={() => setApprovalResult(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">내 제품 관리</h1>
          <p className="text-sm text-slate-500 mt-1">
            공급하는 제품을 관리하고, 가격 및 유통 정책을 설정합니다.
          </p>
          <div className="mt-2"><GuideBackLink to="/guide/features/product-registration" label="상품 등록 이용 안내" /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => navigate('/supplier/products/register')} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus size={16} /> 상품 추가
          </button>
        </div>
      </div>

      {/* WO-NETURE-OPERATOR-PRODUCT-MENU-LABEL-ALIGNMENT-V1: 운영자 노출 조건 안내 */}
      <div className="flex items-start gap-2 mb-4 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
        <Info size={14} className="shrink-0 mt-0.5" />
        <p>운영자 화면에는 <strong>공개(PUBLIC/SERVICE)</strong> 및 <strong>활성</strong> 상태의 상품만 노출됩니다. 등록 후 운영자에게 보이려면 상품을 활성화하고 유통 타입을 공개로 설정해 주세요.</p>
      </div>

      {/* WO-O4O-SUPPLIER-PRODUCT-LIST-NEXT-ACTIONS-CLARITY-V1: 제품 등록 후 다음 단계 안내 */}
      <details className="mb-4 rounded-lg border border-slate-200 bg-slate-50">
        <summary className="cursor-pointer select-none px-3 py-2.5 text-sm font-medium text-slate-700">
          제품 등록 후 다음 단계 안내
        </summary>
        <div className="px-4 pb-3 pt-1 text-xs text-slate-600 space-y-2">
          <p className="text-slate-500">
            제품을 등록한 뒤, 제품별로 필요한 후속 작업을 연결할 수 있습니다. 실제 노출·판매는 <strong>운영자 확인 후</strong> 진행됩니다.
          </p>
          <ul className="space-y-1.5">
            <li>
              <strong>승인요청</strong> — 상품을 선택하고 위 <span className="font-medium">[승인 요청]</span> 버튼으로 운영자 검토를 요청합니다.
            </li>
            <li>
              <strong>서비스 등록 신청</strong> — 상품 편집에서 공급할 서비스를 선택한 뒤 승인 요청합니다.
              <span className="text-amber-600"> 의약품은 약국 대상 서비스에만 연결할 수 있습니다.</span>
            </li>
            <li>
              <strong>B2B 설명 보강</strong> — 상품 행을 열어 Drawer 에서 사업자용 설명을 편집합니다.
              B2B 설명이 없으면 B2C 설명을 기본으로 사용합니다.
            </li>
            <li>
              <strong>이벤트 오퍼 연결</strong> — 각 제품 행의 <span className="font-medium">[후속 작업]</span> 에서 연결합니다. 펀딩은 펀딩 서비스에서 별도로 개설합니다.
            </li>
            <li>
              <strong>판매자 모집 연결</strong> — 각 제품 행의 <span className="font-medium">[후속 작업]</span> 에서 모집을 생성합니다 (제품을 취급할 약국/매장 판매자를 모집하는 기능).
              <button type="button" onClick={() => navigate('/supplier/recruitments')} className="ml-1 text-blue-600 hover:text-blue-800 underline">모집 현황으로 이동</button>
            </li>
          </ul>
        </div>
      </details>

      {/* Search */}
      <div className="mb-3">
        <SearchBar
          value={keyword}
          onChange={setKeyword}
          onSearch={handleSearch}
          placeholder="바코드, 상품명으로 검색"
        />
      </div>

      {/* Approval Status Tabs (WO-NETURE-SUPPLIER-PRODUCTS-TOP-COUNT-UNREQUESTED-TAB-V1) */}
      <div className="flex border-b border-slate-200 mb-3">
        {([
          { key: 'all' as ApprovalTab, label: '전체', count: tabCounts?.total },
          { key: 'unrequested' as ApprovalTab, label: '승인요청 전', count: tabCounts?.unrequested },
          { key: 'pending' as ApprovalTab, label: '승인 요청 중', count: tabCounts?.pending },
          { key: 'approved' as ApprovalTab, label: '승인완료', count: tabCounts?.approved },
          { key: 'rejected' as ApprovalTab, label: '거절', count: tabCounts?.rejected },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab.key ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {/* 조회 실패·미수신 시 0 이 아니라 '—' 로 표시한다 */}
              {tab.count ?? '—'}
            </span>
          </button>
        ))}
      </div>

      {/* 카운트 실패 안내 — 탭 자체와 상품 목록 접근은 막지 않는다 */}
      {countsError && (
        <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-amber-800">
          <span>승인 현황을 불러오지 못했습니다.</span>
          <button
            onClick={fetchTabCounts}
            className="underline font-medium hover:text-amber-900"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2 mb-3">
        <FilterChip label="이미지 없음" active={filterHasImage === 'false'} onClick={() => toggleFilter(setFilterHasImage, 'false', filterHasImage)} />
        <FilterChip label="설명 없음" active={filterHasDescription === 'false'} onClick={() => toggleFilter(setFilterHasDescription, 'false', filterHasDescription)} />
        <FilterChip label="INTERNAL 상품" active={filterBarcodeSource === 'INTERNAL'} onClick={() => toggleFilter(setFilterBarcodeSource, 'INTERNAL', filterBarcodeSource)} />
        <span className="w-px h-4 bg-slate-300" />
        <FilterChip label="미완성" active={filterCompleteness === 'INCOMPLETE'} onClick={() => toggleFilter(setFilterCompleteness, 'INCOMPLETE', filterCompleteness)} />
        <FilterChip label="완성" active={filterCompleteness === 'READY'} onClick={() => toggleFilter(setFilterCompleteness, 'READY', filterCompleteness)} />
        <span className="w-px h-4 bg-slate-300" />
        <FilterChip label="노출 가능" active={filterVisibility === 'visible'} onClick={() => toggleFilter(setFilterVisibility, 'visible', filterVisibility)} />
        <FilterChip label="노출 불가" active={filterVisibility === 'hidden'} onClick={() => toggleFilter(setFilterVisibility, 'hidden', filterVisibility)} />
        <span className="w-px h-4 bg-slate-300" />
        <button
          onClick={() => setAutoNext(prev => !prev)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            autoNext ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          연속 작업 {autoNext ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm text-blue-700 font-medium">{selectedIds.size}개 선택</span>
          <button
            onClick={handleSubmitApproval}
            className="flex items-center gap-1 px-3 py-1 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded"
          >
            <Send size={13} />
            승인 요청
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-1 text-sm text-white bg-red-600 hover:bg-red-700 rounded"
          >
            일괄 삭제
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded"
          >
            선택 해제
          </button>
        </div>
      )}

      {/* WO-NETURE-SUPPLIER-PRODUCT-LIST-APPROVAL-TAB-LABEL-AND-COUNT-ALIGN-V1:
          빈 화면 안내 — 필터 조합으로 0건일 때 안내 + 필터 초기화 액션 */}
      {/* Table */}
      <EditableDataTable
        columns={[
          ...enhancedColumns,
          // WO-NETURE-PRODUCT-LIST-COLUMN-LABEL-AND-DESCRIPTION-REFINE-V1:
          // _preview 컬럼 제거 → 상세설명 컬럼(detailDescCol)에 통합
          // WO-O4O-SUPPLIER-POST-REGISTRATION-PRODUCT-MANAGEMENT-OFFER-FIRST-REALIGNMENT-V1 §E-1 (2026-09-23):
          //   AI 태그 재생성 컬럼 제거 — 공급자 표면에서 내부 LLM 을 호출하지 않는다.
        ]}
        data={filteredProducts}
        rowKey="id"
        loading={loading}
        emptyMessage={loadError ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <p className="text-sm text-slate-600">상품 목록을 불러오지 못했습니다.</p>
            <p className="text-xs text-slate-400">잠시 후 다시 시도해 주세요.</p>
            <button
              type="button"
              onClick={() => fetchProducts(pagination.page)}
              className="mt-1 px-3 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded"
            >
              다시 시도
            </button>
          </div>
        ) : emptyStateNode}
        onSave={handleSave}
        saving={saving}
        tableId="supplier-products"
        reorderable
        persistState
        columnVisibility
      />

      {/* Pagination */}
      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onPageChange={setPage}
      />

      {/* Select All hint */}
      {products.length > 0 && (
        <div className="mt-2 text-center">
          <button onClick={toggleSelectAll} className="text-xs text-slate-400 hover:text-slate-600">
            {selectedIds.size === products.length ? '전체 선택 해제' : '전체 선택'}
          </button>
        </div>
      )}

      {/* Modals */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-[400px]">
            <h3 className="text-lg font-bold text-slate-900 mb-2">상품 삭제 확인</h3>
            <p className="text-sm text-slate-600 mb-1">
              선택한 <strong>{selectedIds.size}개</strong> 상품을 삭제합니다.
            </p>
            {/* WO-O4O-NETURE-SUPPLIER-DELETE-POLICY-AND-REVIEW-ROUNDTRIP-BATCH-V1: soft delete 로 정합화 */}
            <p className="text-xs text-slate-500 mb-1">
              삭제하면 목록에서 사라지고 판매가 중지됩니다. 기록은 남으므로 복구가 필요하면 운영자에게 요청하세요.
            </p>
            <p className="text-xs text-amber-600 mb-4">
              매장에 진열 중이거나 서비스에 연결된 상품은 삭제되지 않습니다.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={bulkDeleting}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                취소
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
              >
                {bulkDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
      {regulatoryProduct && (
        <RegulatoryInfoModal
          product={regulatoryProduct}
          onClose={() => setRegulatoryProduct(null)}
        />
      )}
      {/* ServiceKeySelectModal 제거됨 — WO-NETURE-SUPPLIER-APPROVAL-REQUEST-USE-SAVED-DISTRIBUTION-POLICY-V1 */}

      {/* WO-NETURE-SUPPLIER-PRODUCT-DETAIL-DESCRIPTION-PREVIEW-FROM-LIST-V1: 상세설명 미리보기 */}
      {previewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPreviewProduct(null)}>
          <div
            className="bg-white rounded-xl shadow-2xl w-[640px] max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900 truncate">{previewProduct.name || previewProduct.masterName}</h3>
                {previewProduct.barcode && (
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">{previewProduct.barcode}</p>
                )}
              </div>
              <button onClick={() => setPreviewProduct(null)} className="p-1 rounded hover:bg-slate-100 text-slate-400 ml-3 shrink-0">
                <X size={18} />
              </button>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {previewProduct.primaryImageUrl && (
                <div className="mb-4 flex justify-center">
                  <img
                    src={previewProduct.primaryImageUrl}
                    alt={previewProduct.name || '상품 이미지'}
                    className="max-h-48 rounded-lg object-contain"
                  />
                </div>
              )}
              {previewProduct.consumerDetailDescription ? (
                <ContentRenderer
                  html={previewProduct.consumerDetailDescription}
                  className="prose prose-sm max-w-none text-slate-700"
                  variant="product-detail"
                />
              ) : (
                <div className="text-center py-12">
                  <FileText size={32} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm text-slate-400">소비자 상세 설명이 아직 작성되지 않았습니다.</p>
                  <p className="text-xs text-slate-300 mt-1">상품 편집에서 상세 설명을 입력해 주세요.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Drawer (WO-O4O-NETURE-SUPPLIER-DRAWER-V1 / EDITABLE-V1) */}
      <ProductDetailDrawer
        product={drawerProduct}
        returnTo={`/supplier/products?${new URLSearchParams({ q: keyword, page: String(pagination.page), approval: activeTab, hasImage: filterHasImage, hasDescription: filterHasDescription, barcodeSource: filterBarcodeSource, completeness: filterCompleteness, visibility: filterVisibility, ...(drawerProduct ? { offer: drawerProduct.id } : {}) })}`}
        open={!!drawerProduct}
        onClose={closeDrawer}
        onSaved={() => fetchProducts(pagination.page)}
      />

      {/* WO-O4O-SELLER-RECRUITMENT-CREATION-FLOW-V1 */}
      {recruitModalProduct && (
        <RecruitmentCreateModal
          product={recruitModalProduct}
          onClose={() => setRecruitModalProduct(null)}
          onCreated={() => showToast('판매자 모집이 생성되었습니다.')}
        />
      )}
    </div>
  );
}
