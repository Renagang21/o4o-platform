/**
 * Store Local Products Management Page
 *
 * WO-O4O-STORE-LOCAL-PRODUCT-UI-V1
 * WO-O4O-STORE-HUB-LEGACY-LIST-CLEANUP-V1: raw <table> → BaseTable canonical 정렬
 *
 * CRUD for store_local_products (Display Domain).
 * Local Products are NOT Commerce Objects — Checkout/Order 연결 금지.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, X, Loader2, ShoppingBag, AlertTriangle,
  Edit2, Trash2, ChevronLeft, ChevronRight, Tablet, BarChart3, FileText,
  ImagePlus, FileDown,
} from 'lucide-react';
import { BaseTable, type O4OColumn } from '@o4o/ui';
// WO-O4O-KPA-STORE-LOCAL-PRODUCT-REGISTRATION-ENHANCEMENT-V1:
//   대표 이미지 파일 업로드(공용 미디어 라이브러리) + 내 매장 콘텐츠 본문 가져오기(복사)
import MediaPickerModal from '../../components/common/MediaPickerModal';
import StoreContentImportModal from '../../components/store/StoreContentImportModal';
import {
  fetchLocalProducts,
  createLocalProduct,
  updateLocalProduct,
  deleteLocalProduct,
} from '../../api/localProducts';
import type { LocalProduct, LocalProductInput, BadgeType } from '../../api/localProducts';
// WO-KPA-STORE-LOCAL-PRODUCT-RICHTEXT-INTEGRATION-V1: AI 정리 기능 활성화
import { RichTextEditor } from '@o4o/content-editor';
// WO-O4O-MY-STORE-LOCAL-PRODUCTS-COMMON-COMPONENT-EXTRACTION-V1: 공통 배지/옵션
import { LOCAL_PRODUCT_BADGE_OPTIONS as BADGE_OPTIONS, LocalProductBadge } from '@o4o/store-ui-core';
// WO-O4O-KPA-STORE-PRODUCT-MULTILINGUAL-BADGES-PILOT-V1: 다국어 콘텐츠 연결 상태 배지
import { getMlcSummaryMap, type StoreMlcSummaryItem } from '../../api/multilingualProductContentStore';
import { MultilingualContentBadge, localeLabel } from '../../components/MultilingualContentBadge';
// WO-O4O-MULTILINGUAL-PRODUCT-QR-LANDING-V1: 고객용 보기 / QR / URL 복사
import { MultilingualPublicActions } from '../../components/MultilingualPublicActions';

// ==================== Constants ====================

const PAGE_SIZE = 20;

// ==================== Component ====================

export default function StoreLocalProductsPage() {
  const navigate = useNavigate();

  // Data state
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // WO-O4O-KPA-STORE-PRODUCT-MULTILINGUAL-BADGES-PILOT-V1: 상품별 다국어 콘텐츠 연결 요약
  const [mlcSummary, setMlcSummary] = useState<Map<string, StoreMlcSummaryItem>>(new Map());

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [page, setPage] = useState(1);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<LocalProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Toast auto-clear
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load products
  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchLocalProducts({
        page,
        limit: PAGE_SIZE,
        activeOnly: showActiveOnly ? 'true' : 'false',
      });
      setProducts(result.items);
      setTotal(result.total);
    } catch (err: any) {
      setError(err.message || '상품 목록을 불러오는데 실패했습니다.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [page, showActiveOnly]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // WO-O4O-KPA-STORE-PRODUCT-MULTILINGUAL-BADGES-PILOT-V1: 다국어 콘텐츠 연결 요약 (org 단위 1회 조회)
  useEffect(() => {
    let cancelled = false;
    getMlcSummaryMap('local')
      .then((map) => { if (!cancelled) setMlcSummary(map); })
      .catch(() => { /* 배지는 보조 정보 — 실패해도 목록 동작에 영향 없음 */ });
    return () => { cancelled = true; };
  }, []);

  // Filter products client-side by search query
  const filteredProducts = debouncedSearch
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          (p.category && p.category.toLowerCase().includes(debouncedSearch.toLowerCase())),
      )
    : products;

  // Handlers
  const handleCreate = () => {
    setEditingProduct(null);
    setModalError(null);
    setShowModal(true);
  };

  const handleEdit = (product: LocalProduct) => {
    setEditingProduct(product);
    setModalError(null);
    setShowModal(true);
  };

  const handleDelete = async (product: LocalProduct) => {
    if (!confirm(`"${product.name}" 상품을 비활성화하시겠습니까?`)) return;
    try {
      await deleteLocalProduct(product.id);
      setToast({ type: 'success', message: '상품이 비활성화되었습니다.' });
      loadProducts();
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || '비활성화에 실패했습니다.' });
    }
  };

  const handleSave = async (data: LocalProductInput) => {
    setSaving(true);
    setModalError(null);
    try {
      if (editingProduct) {
        await updateLocalProduct(editingProduct.id, data);
        setToast({ type: 'success', message: '상품이 수정되었습니다.' });
      } else {
        await createLocalProduct(data);
        setToast({ type: 'success', message: '상품이 등록되었습니다.' });
      }
      setShowModal(false);
      loadProducts();
    } catch (err: any) {
      setModalError(err.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // WO-O4O-STORE-HUB-LEGACY-LIST-CLEANUP-V1: BaseTable 컬럼 정의
  const columns = useMemo<O4OColumn<LocalProduct>[]>(() => [
    {
      key: 'thumbnail',
      header: '이미지',
      width: 64,
      render: (_, product) =>
        product.thumbnail_url ? (
          <img
            src={product.thumbnail_url}
            alt={product.name}
            className="w-10 h-10 rounded-lg object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-slate-300" />
          </div>
        ),
    },
    {
      key: 'name',
      header: '상품명',
      render: (_, product) => (
        <div>
          <div className="font-medium text-slate-900">{product.name}</div>
          {product.summary && (
            <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{product.summary}</div>
          )}
          {product.highlight_flag && (
            <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">
              강조
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: '카테고리',
      width: 112,
      render: (_, product) => (
        <span className="text-slate-600">{product.category || '-'}</span>
      ),
    },
    {
      key: 'price_display',
      header: '표시 가격',
      width: 112,
      align: 'right',
      render: (_, product) => (
        <span className="text-slate-900 font-medium">
          {product.price_display ? `₩${Number(product.price_display).toLocaleString()}` : '-'}
        </span>
      ),
    },
    {
      key: 'badge',
      header: 'Badge',
      width: 80,
      align: 'center',
      render: (_, product) => <LocalProductBadge badgeType={product.badge_type} />,
    },
    {
      // WO-O4O-KPA-STORE-PRODUCT-MULTILINGUAL-BADGES-PILOT-V1
      key: 'multilingual',
      header: '다국어',
      width: 160,
      render: (_, product) => <MultilingualContentBadge summary={mlcSummary.get(product.id)} />,
    },
    {
      key: 'is_active',
      header: '활성',
      width: 64,
      align: 'center',
      render: (_, product) => (
        <span
          className={`inline-block w-2.5 h-2.5 rounded-full ${
            product.is_active ? 'bg-green-500' : 'bg-slate-300'
          }`}
        />
      ),
    },
    {
      key: 'actions',
      header: '액션',
      width: 96,
      align: 'center',
      system: 'last',
      render: (_, product) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => handleEdit(product)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700"
            title="수정"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(`/store/commerce/products/${product.id}/marketing`)}
            className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-blue-600"
            title="마케팅 자산"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(`/store/commerce/products/${product.id}/pop`)}
            className="p-1.5 rounded-lg hover:bg-purple-50 text-slate-500 hover:text-purple-600"
            title="POP 만들기"
          >
            <FileText className="w-4 h-4" />
          </button>
          {product.is_active && (
            <button
              onClick={() => handleDelete(product)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600"
              title="비활성화"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ], [navigate, mlcSummary]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <ShoppingBag className="w-7 h-7 text-teal-600" />
            매장 경영활용 제품
            <span className="text-base font-normal text-slate-400">({total})</span>
          </h1>
          {/* WO-O4O-KPA-STORE-HANDLED-PRODUCTS-TERM-CLARIFICATION-V1: '매장 자체 제품' → '매장 경영활용 제품' */}
          <p className="text-sm text-slate-500 mt-1">
            O4O 제품이 아니더라도 매장이 직접 등록해 타블렛 전시·매장 안내·콘텐츠 제작 등 경영 활동에 활용하는 제품입니다. 결제/주문 시스템과 연결되지 않습니다.
          </p>
        </div>
        <button
          onClick={() => navigate('/store/commerce/tablet-displays')}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-teal-700 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors"
        >
          <Tablet className="w-4 h-4" />
          태블릿 진열 관리
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="상품명 또는 카테고리 검색..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showActiveOnly}
            onChange={(e) => { setShowActiveOnly(e.target.checked); setPage(1); }}
            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          활성 상품만
        </label>

        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors shadow-lg shadow-teal-600/25"
        >
          <Plus className="w-4 h-4" />
          상품 등록
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={loadProducts} className="ml-auto text-sm text-red-600 hover:text-red-800 font-medium">
            재시도
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          <span className="ml-3 text-slate-400">로딩 중...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredProducts.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
          <ShoppingBag className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">
            {debouncedSearch ? '검색 결과가 없습니다' : '등록된 매장 경영활용 제품이 없습니다'}
          </h3>
          <p className="text-slate-500 mb-6">
            {debouncedSearch
              ? '다른 검색어로 시도해 보세요.'
              : '매장 경영 활동에 활용할 제품을 등록해 보세요.'}
          </p>
          {!debouncedSearch && (
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700"
            >
              첫 상품 등록하기
            </button>
          )}
        </div>
      )}

      {/* Table — WO-O4O-STORE-HUB-LEGACY-LIST-CLEANUP-V1: BaseTable canonical */}
      {!loading && !error && filteredProducts.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <BaseTable<LocalProduct>
            columns={columns}
            data={filteredProducts}
            rowKey={(product) => product.id}
            rowClassName={(product) => (!product.is_active ? 'opacity-50' : '')}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-slate-500">
                {total}개 중 {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 text-sm text-slate-600">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium"
          style={{
            backgroundColor: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
            borderColor: toast.type === 'success' ? '#86efac' : '#fecaca',
            color: toast.type === 'success' ? '#166534' : '#991b1b',
          }}
        >
          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <ProductFormModal
          product={editingProduct}
          saving={saving}
          error={modalError}
          mlcSummary={editingProduct ? mlcSummary.get(editingProduct.id) : undefined}
          onNavigateHub={() => navigate('/store-hub/multilingual-product-contents')}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// ==================== Form Modal ====================

function ProductFormModal({
  product,
  saving,
  error,
  mlcSummary,
  onNavigateHub,
  onSave,
  onClose,
}: {
  product: LocalProduct | null;
  saving: boolean;
  error: string | null;
  mlcSummary?: StoreMlcSummaryItem;
  onNavigateHub: () => void;
  onSave: (data: LocalProductInput) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(product?.name || '');
  const [barcode, setBarcode] = useState(product?.barcode || '');
  const [category, setCategory] = useState(product?.category || '');
  const [description, setDescription] = useState(product?.description || '');
  const [summary, setSummary] = useState(product?.summary || '');
  const [priceDisplay, setPriceDisplay] = useState(product?.price_display || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(product?.thumbnail_url || '');
  const [galleryImages, setGalleryImages] = useState(
    product?.gallery_images?.join('\n') || '',
  );
  const [badgeType, setBadgeType] = useState<BadgeType>(product?.badge_type || 'none');
  const [highlightFlag, setHighlightFlag] = useState(product?.highlight_flag || false);
  const [sortOrder, setSortOrder] = useState(String(product?.sort_order ?? 0));

  // WO-O4O-KPA-STORE-LOCAL-PRODUCT-REGISTRATION-ENHANCEMENT-V1:
  //   이미지 선택 모달 / 콘텐츠 가져오기 모달 / 가져오기 충돌 시 처리 방식 선택
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showContentImport, setShowContentImport] = useState(false);
  const [pendingImportHtml, setPendingImportHtml] = useState<string | null>(null);
  // RichTextEditor 에 외부에서 본문을 주입할 때 재마운트로 확실히 반영
  const [editorKey, setEditorKey] = useState(0);

  const descIsEmpty = description.replace(/<[^>]*>/g, '').trim().length === 0;

  // 콘텐츠 본문 가져오기 — 비어 있으면 즉시 삽입, 내용이 있으면 처리 방식 선택
  const handleContentImport = (html: string) => {
    setShowContentImport(false);
    if (descIsEmpty) {
      setDescription(html);
      setEditorKey((k) => k + 1);
    } else {
      setPendingImportHtml(html);
    }
  };

  const applyImport = (mode: 'replace' | 'append') => {
    if (pendingImportHtml == null) return;
    setDescription((prev) => (mode === 'replace' ? pendingImportHtml : `${prev}\n${pendingImportHtml}`));
    setEditorKey((k) => k + 1);
    setPendingImportHtml(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const data: LocalProductInput = {
      name: name.trim(),
    };

    if (category.trim()) data.category = category.trim();
    // 바코드/대표 이미지는 항상 전송 — 수정 시 비우면(삭제) null 로 정규화되도록
    data.barcode = barcode.trim();
    data.thumbnailUrl = thumbnailUrl.trim();
    // RichTextEditor returns HTML — strip tags to detect genuinely empty content
    const descText = description.replace(/<[^>]*>/g, '').trim();
    if (descText) data.description = description;
    if (summary.trim()) data.summary = summary.trim();
    if (priceDisplay.trim()) data.priceDisplay = priceDisplay.trim();
    const gallery = galleryImages
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (gallery.length > 0) data.galleryImages = gallery;
    data.badgeType = badgeType;
    data.highlightFlag = highlightFlag;
    data.sortOrder = Number(sortOrder) || 0;

    onSave(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-slate-900">
            {product ? '매장 경영활용 제품 수정' : '매장 경영활용 제품 등록'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* WO-O4O-KPA-STORE-PRODUCT-MULTILINGUAL-BADGES-PILOT-V1: 연결된 다국어 콘텐츠 상세 */}
          {product && (
            mlcSummary ? (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <MultilingualContentBadge summary={mlcSummary} showLocales={false} />
                    <span className="text-sm font-medium text-slate-800 truncate">{mlcSummary.title}</span>
                    {mlcSummary.sourceType === 'operator_hub' && (
                      <span className="inline-flex items-center px-2 py-0.5 text-[11px] rounded-full border bg-blue-50 border-blue-200 text-blue-700 shrink-0">운영자 자료 복사</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">
                    {mlcSummary.status === 'published' ? '게시됨' : mlcSummary.status === 'draft' ? '작성 중' : mlcSummary.status}
                    {' · '}
                    {new Date(mlcSummary.updatedAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {mlcSummary.locales.map((l) => (
                    <span key={l} className="inline-flex items-center px-1.5 py-0.5 text-[11px] rounded border bg-white border-slate-200 text-slate-600">{localeLabel(l)}</span>
                  ))}
                </div>
                {/* WO-O4O-MULTILINGUAL-PRODUCT-QR-LANDING-V1: 고객용 보기 / QR / URL 복사 */}
                <MultilingualPublicActions groupId={mlcSummary.groupId} />
                <p className="text-[11px] text-slate-400 mt-2">타블렛 노출은 후속 단계에서 연결됩니다.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
                <p className="text-slate-500">연결된 다국어 상품 안내 콘텐츠가 없습니다.</p>
                <button
                  type="button"
                  onClick={onNavigateHub}
                  className="mt-1 text-xs text-blue-600 hover:underline"
                >
                  Store Hub에서 다국어 상품 안내 콘텐츠 가져오기 →
                </button>
              </div>
            )
          )}
          {/* 1. 제품 이미지 — 파일에서 불러오기 기본(공용 미디어 라이브러리, URL 저장 · base64 금지) */}
          <Field label="제품 이미지">
            {thumbnailUrl ? (
              <div className="flex items-start gap-3">
                <img
                  src={thumbnailUrl}
                  alt="대표 이미지"
                  className="w-24 h-24 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                />
                <div className="flex flex-col gap-1.5">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMediaPicker(true)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                    >
                      이미지 교체
                    </button>
                    <button
                      type="button"
                      onClick={() => setThumbnailUrl('')}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                    >
                      삭제
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    사진이 충분히 좋으면 그대로 등록하세요. AI 보정 없이 원본을 사용합니다.
                  </p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowMediaPicker(true)}
                className="w-full flex flex-col items-center gap-1 border-2 border-dashed border-slate-200 rounded-xl py-6 text-slate-500 hover:border-teal-300 hover:bg-teal-50/30 transition-colors"
              >
                <ImagePlus className="w-6 h-6 text-slate-300" />
                <span className="text-sm font-medium">이미지 불러오기</span>
                <span className="text-xs text-slate-400">파일에서 대표 이미지 1장 (JPEG, PNG, WebP, GIF)</span>
              </button>
            )}
          </Field>

          {/* 2~3. 상품명(필수) · 바코드(선택) — PC 2열, 모바일 1열 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="상품명" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="상품명을 입력하세요"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </Field>

            <Field label="바코드 (선택)">
              <input
                type="text"
                inputMode="numeric"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="비워둘 수 있습니다"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </Field>
          </div>

          {/* 4. 카테고리 등 기본 정보 */}
          <Field label="카테고리">
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="예: 건강기능식품, 한약, 조제"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </Field>

          {/* 5. 설명 표준 편집기 (+ 콘텐츠에서 가져오기 보조 기능) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-700">설명</label>
              <button
                type="button"
                onClick={() => setShowContentImport(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100"
              >
                <FileDown className="w-3.5 h-3.5" />
                콘텐츠에서 가져오기
              </button>
            </div>
            <RichTextEditor
              key={editorKey}
              value={description}
              onChange={({ html }) => setDescription(html)}
              preset="full"
              minHeight="200px"
              placeholder="상품 상세 설명을 직접 작성하거나 외부에서 작성한 내용을 붙여넣으세요..."
            />
          </div>

          {/* 6. 요약 · 가격 등 기존 항목 */}
          <Field label="요약">
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="한 줄 요약"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </Field>

          <Field label="표시 가격 (원)">
            <input
              type="number"
              value={priceDisplay}
              onChange={(e) => setPriceDisplay(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </Field>

          <Field label="갤러리 이미지 URL (줄당 1개)">
            <textarea
              value={galleryImages}
              onChange={(e) => setGalleryImages(e.target.value)}
              placeholder="https://image1.jpg&#10;https://image2.jpg"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Badge 타입">
              <select
                value={badgeType}
                onChange={(e) => setBadgeType(e.target.value as BadgeType)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {BADGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="정렬 순서">
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={highlightFlag}
              onChange={(e) => setHighlightFlag(e.target.checked)}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            강조 표시 (Highlight)
          </label>

          {/* Domain notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              이 상품은 Display Domain 전용입니다. 결제/주문 시스템과 연결되지 않으며, 태블릿 진열 등 안내 목적으로만 사용됩니다.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-3 border-t flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
          >
            취소
          </button>
          <button
            onClick={handleSubmit as any}
            disabled={saving || !name.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {product ? '수정' : '등록'}
          </button>
        </div>
      </div>

      {/* 대표 이미지 선택 — 공용 미디어 라이브러리 업로드/라이브러리 (URL 반환, base64 미사용) */}
      <MediaPickerModal
        open={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(asset) => setThumbnailUrl(asset.url)}
        title="제품 대표 이미지"
        defaultFolder="product-thumbnail"
      />

      {/* 콘텐츠에서 가져오기 — 내 매장 콘텐츠 본문 복사 */}
      <StoreContentImportModal
        open={showContentImport}
        onClose={() => setShowContentImport(false)}
        onImport={handleContentImport}
      />

      {/* 가져오기 충돌 — 기존 설명이 있을 때 처리 방식 선택 */}
      {pendingImportHtml != null && (
        <div className="fixed inset-0 bg-black/50 z-[1200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <h4 className="text-sm font-bold text-slate-900 mb-1">기존 설명이 있습니다</h4>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              가져온 콘텐츠를 어떻게 적용할까요?
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => applyImport('replace')}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700"
              >
                기존 내용 교체
              </button>
              <button
                type="button"
                onClick={() => applyImport('append')}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                아래에 추가
              </button>
              <button
                type="button"
                onClick={() => setPendingImportHtml(null)}
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== Field Component ====================

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
