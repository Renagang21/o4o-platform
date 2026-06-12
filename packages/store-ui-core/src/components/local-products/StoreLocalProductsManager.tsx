/**
 * StoreLocalProductsManager — 매장 취급 상품(StoreLocalProduct) CRUD 공통 화면.
 *
 * WO-O4O-MY-STORE-LOCAL-PRODUCTS-COMMON-COMPONENT-EXTRACTION-V2:
 *   GlycoPharm / K-Cosmetics 의 99% 동일한 StoreLocalProductsPage 를 통합.
 *   service 별 api client + 문맥 라벨만 props 로 주입, UI/CRUD/모달 동작은 보존.
 *   (KPA 는 BaseTable 기반 구조라 본 manager 대상 아님 — 별도 유지.)
 *
 * 도메인 주의: Local Products 는 Commerce Object 가 아니다 — Checkout/Order/Cart 연결 금지.
 */

import { useState, useEffect, useCallback } from 'react';
import type { ReactNode, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, X, Loader2, ShoppingBag, AlertTriangle,
  Edit2, Trash2, ChevronLeft, ChevronRight, Tablet, BarChart3, FileText,
} from 'lucide-react';
import { LocalProductBadge, LOCAL_PRODUCT_BADGE_OPTIONS, type LocalProductBadgeType } from './LocalProductBadge';

// ==================== Types (service 공통) ====================

export type LocalProductBadge_Type = LocalProductBadgeType;

export interface StoreLocalProduct {
  id: string;
  name: string;
  description: string | null;
  summary: string | null;
  category: string | null;
  price_display: string | null;
  thumbnail_url: string | null;
  images: string[];
  gallery_images: string[];
  badge_type: LocalProductBadgeType;
  highlight_flag: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface StoreLocalProductInput {
  name: string;
  description?: string;
  summary?: string;
  category?: string;
  priceDisplay?: string;
  thumbnailUrl?: string;
  images?: string[];
  galleryImages?: string[];
  badgeType?: LocalProductBadgeType;
  highlightFlag?: boolean;
  sortOrder?: number;
}

/** service 별 local-products API client (GP/KCos 동일 시그니처) */
export interface StoreLocalProductsApi {
  fetchLocalProducts: (params?: {
    page?: number;
    limit?: number;
    activeOnly?: string;
  }) => Promise<{ items: StoreLocalProduct[]; total: number }>;
  createLocalProduct: (input: StoreLocalProductInput) => Promise<StoreLocalProduct>;
  updateLocalProduct: (id: string, input: StoreLocalProductInput) => Promise<StoreLocalProduct>;
  deleteLocalProduct: (id: string) => Promise<void>;
}

export interface StoreLocalProductsManagerLabels {
  /** 카테고리 입력 placeholder (서비스별 예시) */
  categoryPlaceholder?: string;
}

export interface StoreLocalProductsManagerProps {
  api: StoreLocalProductsApi;
  labels?: StoreLocalProductsManagerLabels;
}

const PAGE_SIZE = 20;

// ==================== Component ====================

export function StoreLocalProductsManager({ api, labels }: StoreLocalProductsManagerProps) {
  const navigate = useNavigate();
  const categoryPlaceholder = labels?.categoryPlaceholder ?? '예: 건강기능식품, 의약외품';

  // Data state
  const [products, setProducts] = useState<StoreLocalProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [page, setPage] = useState(1);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreLocalProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.fetchLocalProducts({
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
  }, [api, page, showActiveOnly]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = debouncedSearch
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          (p.category && p.category.toLowerCase().includes(debouncedSearch.toLowerCase())),
      )
    : products;

  const handleCreate = () => {
    setEditingProduct(null);
    setModalError(null);
    setShowModal(true);
  };

  const handleEdit = (product: StoreLocalProduct) => {
    setEditingProduct(product);
    setModalError(null);
    setShowModal(true);
  };

  const handleDelete = async (product: StoreLocalProduct) => {
    if (!confirm(`"${product.name}" 상품을 비활성화하시겠습니까?`)) return;
    try {
      await api.deleteLocalProduct(product.id);
      setToast({ type: 'success', message: '상품이 비활성화되었습니다.' });
      loadProducts();
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || '비활성화에 실패했습니다.' });
    }
  };

  const handleSave = async (data: StoreLocalProductInput) => {
    setSaving(true);
    setModalError(null);
    try {
      if (editingProduct) {
        await api.updateLocalProduct(editingProduct.id, data);
        setToast({ type: 'success', message: '상품이 수정되었습니다.' });
      } else {
        await api.createLocalProduct(data);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <ShoppingBag className="w-7 h-7 text-teal-600" />
            매장 취급 상품
            <span className="text-base font-normal text-slate-400">({total})</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            O4O 주문과 무관하게 매장에서 자체적으로 취급·진열하는 상품입니다. 결제/주문 시스템과 연결되지 않습니다.
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
            {debouncedSearch ? '검색 결과가 없습니다' : '등록된 매장 취급 상품이 없습니다'}
          </h3>
          <p className="text-slate-500 mb-6">
            {debouncedSearch
              ? '다른 검색어로 시도해 보세요.'
              : '매장에서 자체적으로 취급하는 상품을 등록해 보세요.'}
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

      {/* Table */}
      {!loading && !error && filteredProducts.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-500 w-16">이미지</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">상품명</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 w-28">카테고리</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500 w-28">표시 가격</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500 w-20">Badge</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500 w-16">활성</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500 w-24">액션</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr
                  key={product.id}
                  className={`border-b last:border-0 hover:bg-slate-50 transition-colors ${
                    !product.is_active ? 'opacity-50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    {product.thumbnail_url ? (
                      <img
                        src={product.thumbnail_url}
                        alt={product.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-slate-300" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{product.name}</div>
                    {product.summary && (
                      <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{product.summary}</div>
                    )}
                    {product.highlight_flag && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">
                        강조
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{product.category || '-'}</td>
                  <td className="px-4 py-3 text-right text-slate-900 font-medium">
                    {product.price_display ? `₩${Number(product.price_display).toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <LocalProductBadge badgeType={product.badge_type} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        product.is_active ? 'bg-green-500' : 'bg-slate-300'
                      }`}
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

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
          {toast.message}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <ProductFormModal
          product={editingProduct}
          saving={saving}
          error={modalError}
          categoryPlaceholder={categoryPlaceholder}
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
  categoryPlaceholder,
  onSave,
  onClose,
}: {
  product: StoreLocalProduct | null;
  saving: boolean;
  error: string | null;
  categoryPlaceholder: string;
  onSave: (data: StoreLocalProductInput) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(product?.name || '');
  const [category, setCategory] = useState(product?.category || '');
  const [description, setDescription] = useState(product?.description || '');
  const [summary, setSummary] = useState(product?.summary || '');
  const [priceDisplay, setPriceDisplay] = useState(product?.price_display || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(product?.thumbnail_url || '');
  const [galleryImages, setGalleryImages] = useState(
    product?.gallery_images?.join('\n') || '',
  );
  const [badgeType, setBadgeType] = useState<LocalProductBadgeType>(product?.badge_type || 'none');
  const [highlightFlag, setHighlightFlag] = useState(product?.highlight_flag || false);
  const [sortOrder, setSortOrder] = useState(String(product?.sort_order ?? 0));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const data: StoreLocalProductInput = {
      name: name.trim(),
    };

    if (category.trim()) data.category = category.trim();
    if (description.trim()) data.description = description.trim();
    if (summary.trim()) data.summary = summary.trim();
    if (priceDisplay.trim()) data.priceDisplay = priceDisplay.trim();
    if (thumbnailUrl.trim()) data.thumbnailUrl = thumbnailUrl.trim();
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
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-slate-900">
            {product ? '상품 수정' : '상품 등록'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
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

          <Field label="카테고리">
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={categoryPlaceholder}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </Field>

          <Field label="설명">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="상품 설명"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </Field>

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

          <Field label="썸네일 URL">
            <input
              type="url"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </Field>

          <Field label="갤러리 이미지 URL (줄당 1개)">
            <textarea
              value={galleryImages}
              onChange={(e) => setGalleryImages(e.target.value)}
              placeholder={"https://image1.jpg\nhttps://image2.jpg"}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Badge 타입">
              <select
                value={badgeType}
                onChange={(e) => setBadgeType(e.target.value as LocalProductBadgeType)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {LOCAL_PRODUCT_BADGE_OPTIONS.map((opt) => (
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
  children: ReactNode;
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
