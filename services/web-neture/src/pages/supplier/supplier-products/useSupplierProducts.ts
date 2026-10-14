import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { supplierApi, type SupplierProduct } from '../../../lib/api';
import type { SupplierApprovalCounts } from '../../../lib/api/supplier';
import { REGULATORY_TYPE_LABELS, getVisibilityStatus } from '../../../lib/productConstants';
import {
  APPROVAL_GATE_REASON_DISPLAY,
  APPROVAL_GATE_FALLBACK,
  saveFailureSummary,
  bulkDeleteFailureSummary,
  type ApprovalResultView,
  type ApprovalSkippedItem,
  type ApprovalTab,
} from './productListFeedback';

export function useSupplierProducts() {
  // Search/filter requests may finish out of order. Rows and counts stay independent.
  const productsRequest = useRef(0);
  const countsRequest = useRef(0);
  useEffect(() => () => {
    productsRequest.current += 1;
    countsRequest.current += 1;
  }, []);
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  // 조회 실패(loadError) 와 정상 0건을 구분한다 — 실패 시 빈 상태 문구를 표시하지 않는다.
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

  // Bulk edit state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // showApprovalModal 제거됨 — WO-NETURE-SUPPLIER-APPROVAL-REQUEST-USE-SAVED-DISTRIBUTION-POLICY-V1
  const [toast, setToast] = useState<string | null>(null);
  // WO-O4O-SUPPLIER-PRODUCT-APPROVAL-GATE-UX-MESSAGE-IMPROVEMENT-V1: 승인 요청 결과 banner
  const [approvalResult, setApprovalResult] = useState<ApprovalResultView | null>(null);

  // Filter state
  const [filterHasImage, setFilterHasImage] = useState('');
  const [filterHasDescription, setFilterHasDescription] = useState('');
  const [filterBarcodeSource, setFilterBarcodeSource] = useState('');
  const [filterCompleteness, setFilterCompleteness] = useState('');
  const [filterVisibility, setFilterVisibility] = useState('');

  // WO-NETURE-SUPPLIER-PRODUCTS-TOP-COUNT-UNREQUESTED-TAB-V1: 승인요청 전 탭 추가
  const [activeTab, setActiveTab] = useState<ApprovalTab>('all');
  // WO-O4O-NETURE-SUPPLIER-APPROVAL-COUNTS-LOAD-ERROR-CONTRACT-V1:
  //   null = 아직 못 불러옴(로딩/실패). 0 카운트와 구분한다.
  const [tabCounts, setTabCounts] = useState<SupplierApprovalCounts | null>(null);
  const [countsError, setCountsError] = useState(false);

  // Drawer state (WO-O4O-NETURE-SUPPLIER-DRAWER-V1)
  const [drawerProduct, setDrawerProduct] = useState<SupplierProduct | null>(null);

  // Continuous workflow state
  const [autoNext, setAutoNext] = useState(true);
  const [highlightRowId, setHighlightRowId] = useState<string | null>(null);
  const lastEditedRef = useRef<{ id: string; type: 'image' | 'description' | 'save' } | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Toggle selection
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  }, [selectedIds, products]);

  // Bulk delete (WO-O4O-NETURE-SUPPLIER-PRODUCTS-UX-REFORM-V1)
  // WO-O4O-NETURE-SUPPLIER-DELETE-POLICY-AND-REVIEW-ROUNDTRIP-BATCH-V1:
  // 서버가 hard delete → soft delete 로 바뀌었고, 매장 진열/서비스 상품이 남아 있으면 건별로 거부한다.
  // "N건 실패" 로 뭉뚱그리지 않고 사유를 그대로 보여준다.
  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    const result = await supplierApi.bulkDelete(Array.from(selectedIds));
    setBulkDeleting(false);
    setShowDeleteConfirm(false);
    showToast(
      `${result.deleted}건 삭제 완료${result.failed.length > 0 ? ` · ${bulkDeleteFailureSummary(result.failed)}` : ''}`,
    );
    setSelectedIds(new Set());
    await fetchProducts(pagination.page);
    fetchTabCounts();
  };

  // WO-NETURE-SUPPLIER-PRODUCT-VISIBILITY-STATUS-UX-ALIGNMENT-V1: client-side visibility filter
  const filteredProducts = useMemo(() => {
    if (!filterVisibility) return products;
    return products.filter((p) => {
      const status = getVisibilityStatus(p);
      return filterVisibility === 'visible' ? status === 'VISIBLE' : status !== 'VISIBLE';
    });
  }, [products, filterVisibility]);

  // WO-NETURE-SUPPLIER-PRODUCT-LIST-APPROVAL-TAB-LABEL-AND-COUNT-ALIGN-V1
  const hasAnyFilter = !!(
    keyword ||
    filterHasImage ||
    filterHasDescription ||
    filterBarcodeSource ||
    filterCompleteness ||
    filterVisibility ||
    activeTab !== 'all'
  );

  const resetAllFilters = useCallback(() => {
    setKeyword('');
    setFilterHasImage('');
    setFilterHasDescription('');
    setFilterBarcodeSource('');
    setFilterCompleteness('');
    setFilterVisibility('');
    setActiveTab('all');
  }, []);

  // WO-O4O-NETURE-SUPPLIER-PRODUCTS-LOAD-ERROR-CONTRACT-V1:
  // getProductsPaginated 는 조회 실패 시 throw 한다. 실패를 빈 목록으로 렌더하지 않고 loadError 로 분리한다.
  const fetchProducts = useCallback(
    async (page = 1, searchKeyword?: string) => {
      const request = ++productsRequest.current;
      setLoading(true);
      const kw = searchKeyword !== undefined ? searchKeyword : keyword;
      try {
        const result = await supplierApi.getProductsPaginated({
          page,
          limit: 50,
          keyword: kw || undefined,
          hasImage: filterHasImage || undefined,
          hasDescription: filterHasDescription || undefined,
          barcodeSource: filterBarcodeSource || undefined,
          completenessStatus: filterCompleteness || undefined,
          serviceApprovalStatus: activeTab === 'all' ? undefined : activeTab,
        });
        if (request !== productsRequest.current) return;
        setProducts(result.data);
        setPagination(result.pagination);
        setSelectedIds(new Set());
        setDrawerProduct(null);
        setLoadError(false);
      } catch {
        if (request !== productsRequest.current) return;
        setProducts([]);
        setSelectedIds(new Set());
        setDrawerProduct(null);
        setLoadError(true);
      } finally {
        if (request === productsRequest.current) setLoading(false);
      }
    },
    [
      keyword,
      filterHasImage,
      filterHasDescription,
      filterBarcodeSource,
      filterCompleteness,
      activeTab,
    ],
  );

  // WO-O4O-NETURE-PRODUCT-LIFECYCLE-FINALIZATION-V1: fetch tab counts
  // WO-NETURE-SUPPLIER-PRODUCT-LIST-APPROVAL-TAB-LABEL-AND-COUNT-ALIGN-V1:
  // count도 rows와 동일한 보조 필터/검색어를 적용하여 기준 일치
  // WO-O4O-NETURE-SUPPLIER-APPROVAL-COUNTS-LOAD-ERROR-CONTRACT-V1:
  //   카운트 조회 실패는 throw 된다. 목록(loadError)과 **독립된** 상태로 관리해
  //   한쪽 실패가 다른 쪽을 덮어쓰지 않게 한다. 실패 시 0 으로 표시하지 않는다.
  const fetchTabCounts = useCallback(async () => {
    const request = ++countsRequest.current;
    setCountsError(false);
    try {
      const counts = await supplierApi.getApprovalCounts({
        keyword: keyword || undefined,
        hasImage: filterHasImage || undefined,
        hasDescription: filterHasDescription || undefined,
        barcodeSource: filterBarcodeSource || undefined,
        completenessStatus: filterCompleteness || undefined,
      });
      if (request !== countsRequest.current) return;
      setTabCounts(counts);
    } catch {
      if (request !== countsRequest.current) return;
      setTabCounts(null);
      setCountsError(true);
    }
  }, [keyword, filterHasImage, filterHasDescription, filterBarcodeSource, filterCompleteness]);

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  useEffect(() => {
    fetchTabCounts();
  }, [fetchTabCounts]);

  // Auto-next: after action completes, move to next incomplete product
  useEffect(() => {
    const pending = lastEditedRef.current;
    if (!pending || !autoNext || loading) return;
    lastEditedRef.current = null;

    const currentIdx = products.findIndex((p) => p.id === pending.id);
    if (currentIdx < 0) return;

    let next: SupplierProduct | null = null;
    for (let i = currentIdx + 1; i < products.length; i++) {
      const p = products[i];
      if ((p.completenessScore || 0) < 100 && p.completenessStatus !== 'APPROVED') {
        next = p;
        break;
      }
    }

    if (!next) {
      setToast('이 페이지의 미완성 상품을 모두 처리했습니다!');
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setToast(`다음: ${next.name || next.masterName}`);
    setTimeout(() => setToast(null), 3000);
    setHighlightRowId(next.id);
    setTimeout(() => setHighlightRowId(null), 2000);

    // Scroll to target row
    const targetIdx = products.findIndex((p) => p.id === next!.id);
    setTimeout(() => {
      const rows = document.querySelectorAll('tbody tr');
      if (targetIdx >= 0 && rows[targetIdx]) {
        rows[targetIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    // Auto-open editor for same action type
    if (pending.type === 'image' && !next.primaryImageUrl) {
      setTimeout(() => setDrawerProduct(next!), 400);
    } else if (
      pending.type === 'description' &&
      (!next.consumerShortDescription || !next.consumerDetailDescription)
    ) {
      setTimeout(() => setDrawerProduct(next!), 400);
    }
  }, [products, autoNext, loading]);

  const handleSearch = useCallback(
    (value: string) => {
      fetchProducts(1, value);
    },
    [fetchProducts],
  );

  const handleSave = async (changedRows: SupplierProduct[]) => {
    setSaving(true);
    const updates = changedRows.map((r) => ({
      offerId: r.id,
      isActive: r.isActive,
      // WO-NETURE-DISTRIBUTION-MODEL-SPLIT-PUBLIC-AND-SERVICE-SUPPLY-V1: isPublic 직접 전달
      isPublic: (r as any).isPublic,
      priceGeneral: r.priceGeneral != null ? Number(r.priceGeneral) : undefined,
      consumerReferencePrice:
        r.consumerReferencePrice != null ? Number(r.consumerReferencePrice) : null,
      stockQuantity:
        (r as any).stockQuantity != null ? Number((r as any).stockQuantity) : undefined,
    }));
    // WO-O4O-NETURE-SUPPLIER-PRODUCT-AUTHORING-EXPANSION-CLOSEOUT-BATCH-V1:
    //   batchUpdateProducts 는 실패를 예외로 던지지 않고 failed[] 로 돌려준다.
    //   이전 구현은 결과를 버려서 저장 실패가 화면에서 성공처럼 보였다.
    const saveResult = await supplierApi.batchUpdateProducts(updates);
    if (saveResult.failed.length > 0) {
      showToast(`${saveResult.updated.length}건 저장 · ${saveFailureSummary(saveResult.failed)}`);
    }
    if (autoNext && changedRows.length === 1) {
      lastEditedRef.current = { id: changedRows[0].id, type: 'save' };
    }
    await fetchProducts(pagination.page);
    fetchTabCounts();
    setSaving(false);
  };

  // Filter toggle helpers
  const toggleFilter = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    value: string,
    current: string,
  ) => {
    setter(current === value ? '' : value);
  };

  const handleSubmitApproval = async () => {
    if (
      !confirm(
        `선택한 ${selectedIds.size}개 상품의 저장된 공급 정책을 기준으로 승인 요청을 보냅니다.\n진행하시겠습니까?`,
      )
    )
      return;
    const result = await supplierApi.submitForApproval(Array.from(selectedIds));
    if (result.success && result.data) {
      // WO-NETURE-APPROVAL-REQUEST-TRUTH-ALIGNMENT-V1:
      // submitted=0 이거나 skipped가 있으면 그 이유를 사용자에게 명확히 알려야 한다.
      // (이전 구현은 `${d.submitted}건 요청`으로 항상 성공 토스트를 띄워 사용자가 실제 DB 변경 여부를 알 수 없었음.)
      const d = result.data;
      const total = selectedIds.size;
      const skippedCount = d.skipped?.length ?? 0;
      const errorCount = d.errors?.length ?? 0;

      if (skippedCount === 0 && errorCount === 0) {
        // 전원 성공: 간단 toast
        showToast(`${d.submitted}건 승인 요청 완료`);
      } else {
        // WO-O4O-SUPPLIER-PRODUCT-APPROVAL-GATE-UX-MESSAGE-IMPROVEMENT-V1:
        // skipped[].id(offerId) → 현재 목록 상품과 매핑(상품명/품목군) + reasonCode → 상태/다음행동.
        const skippedView: ApprovalSkippedItem[] = (d.skipped || []).map((s) => {
          const p = products.find((pr) => pr.id === s.id);
          const name = p?.name || p?.masterName || `상품 ID: ${s.id}`;
          const category = p?.regulatoryType
            ? REGULATORY_TYPE_LABELS[p.regulatoryType] || p.regulatoryType
            : p?.categoryName || '-';
          const display = APPROVAL_GATE_REASON_DISPLAY[s.reason] || APPROVAL_GATE_FALLBACK;
          return { id: s.id, reason: s.reason, name, category, display };
        });
        setApprovalResult({ submitted: d.submitted, total, errorCount, skipped: skippedView });
      }

      // WO-NETURE-PRODUCT-TABLE-SELECTION-AND-APPROVAL-REFRESH-FIX-V1:
      // 승인 요청 직후 목록/탭 카운트가 stale 상태로 남지 않도록 반드시 await.
      // fetchProducts는 기본값 page=1이 아닌 현재 페이지를 유지한다.
      setSelectedIds(new Set());
      await Promise.all([fetchProducts(pagination.page), fetchTabCounts()]);
    } else {
      showToast(result.error || '승인 요청에 실패했습니다.');
    }
  };

  return {
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
    handleSubmitApproval,
  };
}
