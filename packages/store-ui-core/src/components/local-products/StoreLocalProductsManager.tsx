/**
 * StoreLocalProductsManager — 매장 취급 상품(StoreLocalProduct) CRUD 공통 화면.
 *
 * WO-O4O-MY-STORE-LOCAL-PRODUCTS-COMMON-COMPONENT-EXTRACTION-V2:
 *   GlycoPharm / K-Cosmetics 의 99% 동일한 StoreLocalProductsPage 를 통합.
 *   service 별 api client + 문맥 라벨만 props 로 주입, UI/CRUD/모달 동작은 보존.
 *
 * WO-O4O-MY-STORE-LOCAL-PRODUCTS-CROSSSERVICE-COMMONIZATION-V1:
 *   KPA 도 본 manager 로 수렴. KPA 고유(BaseTable 렌더 · 다국어 컬럼 · 리치 등록 폼)는
 *   `tableVariant='base'` / `extraColumns` / `renderFormModal` 슬롯으로 유지한다.
 *   기존 소비처(GlycoPharm · K-Cosmetics · Pharmacy-Hub)는 prop 미지정 시 동작 불변.
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
import { BaseTable, type O4OColumn } from '@o4o/ui';
import { LocalProductBadge, LOCAL_PRODUCT_BADGE_OPTIONS, type LocalProductBadgeType } from './LocalProductBadge';
// WO-O4O-STORE-LOCAL-PRODUCT-POP-CANONICAL-FLOW-ALIGNMENT-V1: POP 진입 canonical 정렬
import { CANONICAL_STORE_POP_ROUTE, buildLocalProductPopState } from '../../utils/productionUtils';

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

/**
 * service 별 local-products API client (GP/KCos/PH 동일 시그니처).
 * 서비스가 필드를 더 갖는 경우(KPA: barcode·detail_html)는 T/I 로 확장한다 — API 계약 변경 아님.
 */
export interface StoreLocalProductsApi<
  T extends StoreLocalProduct = StoreLocalProduct,
  I = StoreLocalProductInput,
> {
  fetchLocalProducts: (params?: {
    page?: number;
    limit?: number;
    activeOnly?: string;
  }) => Promise<{ items: T[]; total: number }>;
  createLocalProduct: (input: I) => Promise<T>;
  updateLocalProduct: (id: string, input: I) => Promise<T>;
  deleteLocalProduct: (id: string) => Promise<void>;
}

export interface StoreLocalProductsManagerLabels {
  /** 카테고리 입력 placeholder (서비스별 예시) */
  categoryPlaceholder?: string;
  /** 화면 제목 (기본: '매장 취급 상품') */
  title?: string;
  /** 제목 아래 설명 문구 */
  description?: string;
  /** empty state 제목 (기본: '등록된 매장 취급 상품이 없습니다') */
  emptyTitle?: string;
  /** empty state 설명 (기본: '매장에서 자체적으로 취급하는 상품을 등록해 보세요.') */
  emptyDescription?: string;
}

/**
 * 후속 화면 진입 액션 (WO-PHARMACY-HUB-STORE-HANDLED-PRODUCTS-V1).
 *
 * 기존 소비처(GlycoPharm·K-Cosmetics)는 이 prop 을 주지 않으므로 종전 `/store/*`
 * 경로로 그대로 이동한다 — 동작 불변. 그 경로가 없는 서비스(Pharmacy-Hub)는
 * 각 키를 `null` 로 주어 **dead link 대신 버튼을 숨긴다** ("준비 중 메뉴 0").
 *
 *   undefined = 기본 동작 유지 · null = 버튼 숨김 · 함수 = 해당 동작으로 교체
 */
export interface StoreLocalProductsManagerActions<T extends StoreLocalProduct = StoreLocalProduct> {
  onTabletDisplays?: (() => void) | null;
  onMarketingAssets?: ((product: T) => void) | null;
  onCreatePop?: ((product: T) => void) | null;
}

/**
 * 서비스 고유 추가 컬럼 (WO-...-CROSSSERVICE-COMMONIZATION-V1).
 * Badge 컬럼 뒤 · 활성 컬럼 앞에 삽입된다. (KPA 다국어 컬럼)
 */
export interface StoreLocalProductsExtraColumn<T extends StoreLocalProduct = StoreLocalProduct> {
  key: string;
  header: ReactNode;
  width?: number;
  align?: 'left' | 'center' | 'right';
  render: (product: T) => ReactNode;
}

/** 등록/수정 모달 슬롯 컨텍스트 — 저장 상태·에러는 manager 가 소유한다. */
export interface StoreLocalProductsFormModalContext<
  T extends StoreLocalProduct = StoreLocalProduct,
  I = StoreLocalProductInput,
> {
  product: T | null;
  saving: boolean;
  error: string | null;
  onSave: (data: I) => void;
  onClose: () => void;
}

export interface StoreLocalProductsManagerProps<
  T extends StoreLocalProduct = StoreLocalProduct,
  I = StoreLocalProductInput,
> {
  api: StoreLocalProductsApi<T, I>;
  labels?: StoreLocalProductsManagerLabels;
  actions?: StoreLocalProductsManagerActions<T>;
  /** Badge 뒤에 삽입할 서비스 고유 컬럼 */
  extraColumns?: Array<StoreLocalProductsExtraColumn<T>>;
  /**
   * 목록 렌더 엔진.
   *   'plain'(기본) = 종전 raw table — 기존 소비처 동작 불변
   *   'base'        = @o4o/ui BaseTable (KPA canonical 정렬 유지)
   */
  tableVariant?: 'plain' | 'base';
  /** 등록/수정 폼 교체 (KPA: 이미지 라이브러리 · RichTextEditor · 콘텐츠 가져오기 · 바코드) */
  renderFormModal?: (ctx: StoreLocalProductsFormModalContext<T, I>) => ReactNode;
  /** toast 앞 아이콘 표기 (KPA 기존 표기 유지) */
  toastIcon?: boolean;
}

const PAGE_SIZE = 20;

/** 내부 컬럼 모델 — plain table 과 BaseTable 양쪽 렌더러가 공유한다. */
interface ManagerColumn<T extends StoreLocalProduct> {
  key: string;
  header: ReactNode;
  width?: number;
  align?: 'left' | 'center' | 'right';
  system?: 'last';
  thClassName?: string;
  tdClassName?: string;
  render: (product: T) => ReactNode;
}

// ==================== Component ====================

export function StoreLocalProductsManager<
  T extends StoreLocalProduct = StoreLocalProduct,
  I = StoreLocalProductInput,
>({
  api,
  labels,
  actions,
  extraColumns,
  tableVariant = 'plain',
  renderFormModal,
  toastIcon = false,
}: StoreLocalProductsManagerProps<T, I>) {
  const navigate = useNavigate();
  const categoryPlaceholder = labels?.categoryPlaceholder ?? '예: 건강기능식품, 의약외품';
  const title = labels?.title ?? '매장 취급 상품';
  const description =
    labels?.description ??
    'O4O 주문과 무관하게 매장에서 자체적으로 취급·진열하는 상품입니다. 결제/주문 시스템과 연결되지 않습니다.';
  const emptyTitle = labels?.emptyTitle ?? '등록된 매장 취급 상품이 없습니다';
  const emptyDescription = labels?.emptyDescription ?? '매장에서 자체적으로 취급하는 상품을 등록해 보세요.';

  // undefined = 기존 `/store/*` 기본 동작 · null = 숨김 · 함수 = 교체
  const onTabletDisplays =
    actions?.onTabletDisplays === undefined
      ? () => navigate('/store/commerce/tablet-displays')
      : actions.onTabletDisplays;
  const onMarketingAssets =
    actions?.onMarketingAssets === undefined
      ? (product: T) => navigate(`/store/commerce/products/${product.id}/marketing`)
      : actions.onMarketingAssets;
  // WO-O4O-STORE-LOCAL-PRODUCT-POP-CANONICAL-FLOW-ALIGNMENT-V1:
  //   legacy `/store/commerce/products/:id/pop` (local UUID 를 ProductMaster 처럼 사용)
  //   경유를 제거하고 canonical POP 화면으로 직접 진입한다.
  const onCreatePop =
    actions?.onCreatePop === undefined
      ? (product: T) =>
          navigate(CANONICAL_STORE_POP_ROUTE, { state: buildLocalProductPopState(product) })
      : actions.onCreatePop;

  // Data state
  const [products, setProducts] = useState<T[]>([]);
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
  const [editingProduct, setEditingProduct] = useState<T | null>(null);
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

  const handleEdit = (product: T) => {
    setEditingProduct(product);
    setModalError(null);
    setShowModal(true);
  };

  const handleDelete = async (product: T) => {
    if (!confirm(`"${product.name}" 상품을 비활성화하시겠습니까?`)) return;
    try {
      await api.deleteLocalProduct(product.id);
      setToast({ type: 'success', message: '상품이 비활성화되었습니다.' });
      loadProducts();
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || '비활성화에 실패했습니다.' });
    }
  };

  const handleSave = async (data: I) => {
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

  // ── 컬럼 모델 (WO-O4O-MY-STORE-LOCAL-PRODUCTS-CROSSSERVICE-COMMONIZATION-V1) ──
  //    plain 렌더러의 class 문자열은 종전 마크업을 그대로 보존한다.
  const THC = 'px-4 py-3 font-medium text-slate-500';
  const tableColumns: Array<ManagerColumn<T>> = [
    {
      key: 'thumbnail',
      header: '이미지',
      width: 64,
      thClassName: `text-left ${THC} w-16`,
      tdClassName: 'px-4 py-3',
      render: (product) =>
        product.thumbnail_url ? (
          <img src={product.thumbnail_url} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-slate-300" />
          </div>
        ),
    },
    {
      key: 'name',
      header: '상품명',
      thClassName: `text-left ${THC}`,
      tdClassName: 'px-4 py-3',
      render: (product) => (
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
      thClassName: `text-left ${THC} w-28`,
      tdClassName: 'px-4 py-3 text-slate-600',
      render: (product) => <span className="text-slate-600">{product.category || '-'}</span>,
    },
    {
      key: 'price_display',
      header: '표시 가격',
      width: 112,
      align: 'right',
      thClassName: `text-right ${THC} w-28`,
      tdClassName: 'px-4 py-3 text-right text-slate-900 font-medium',
      render: (product) => (
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
      thClassName: `text-center ${THC} w-20`,
      tdClassName: 'px-4 py-3 text-center',
      render: (product) => <LocalProductBadge badgeType={product.badge_type} />,
    },
    // 서비스 고유 컬럼(KPA 다국어)
    ...(extraColumns ?? []).map<ManagerColumn<T>>((col) => ({
      key: col.key,
      header: col.header,
      width: col.width,
      align: col.align,
      thClassName: `${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'} ${THC}`,
      tdClassName: `px-4 py-3${col.align === 'center' ? ' text-center' : col.align === 'right' ? ' text-right' : ''}`,
      render: col.render,
    })),
    {
      key: 'is_active',
      header: '활성',
      width: 64,
      align: 'center',
      thClassName: `text-center ${THC} w-16`,
      tdClassName: 'px-4 py-3 text-center',
      render: (product) => (
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
      thClassName: `text-center ${THC} w-24`,
      tdClassName: 'px-4 py-3 text-center',
      render: (product) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => handleEdit(product)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700"
            title="수정"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {onMarketingAssets && (
            <button
              onClick={() => onMarketingAssets(product)}
              className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-500 hover:text-blue-600"
              title="마케팅 자산"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          )}
          {onCreatePop && (
            <button
              onClick={() => onCreatePop(product)}
              className="p-1.5 rounded-lg hover:bg-purple-50 text-slate-500 hover:text-purple-600"
              title="POP 만들기"
            >
              <FileText className="w-4 h-4" />
            </button>
          )}
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
  ];

  const baseTableColumns: Array<O4OColumn<T>> = tableColumns.map((col) => ({
    key: col.key,
    header: col.header,
    width: col.width,
    align: col.align,
    system: col.system,
    render: (_value: unknown, product: T) => col.render(product),
  }));


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <ShoppingBag className="w-7 h-7 text-teal-600" />
            {title}
            <span className="text-base font-normal text-slate-400">({total})</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        </div>
        {onTabletDisplays && (
          <button
            onClick={onTabletDisplays}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-teal-700 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors"
          >
            <Tablet className="w-4 h-4" />
            태블릿 진열 관리
          </button>
        )}
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
            {debouncedSearch ? '검색 결과가 없습니다' : emptyTitle}
          </h3>
          <p className="text-slate-500 mb-6">
            {debouncedSearch
              ? '다른 검색어로 시도해 보세요.'
              : emptyDescription}
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
          {/* WO-...-CROSSSERVICE-COMMONIZATION-V1: 컬럼 모델 1개 → plain / BaseTable 두 렌더러 */}
          {tableVariant === 'base' ? (
            <BaseTable<T>
              columns={baseTableColumns}
              data={filteredProducts}
              rowKey={(product) => product.id}
              rowClassName={(product) => (!product.is_active ? 'opacity-50' : '')}
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  {tableColumns.map((col) => (
                    <th key={col.key} className={col.thClassName}>
                      {col.header}
                    </th>
                  ))}
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
                    {tableColumns.map((col) => (
                      <td key={col.key} className={col.tdClassName}>
                        {col.render(product)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

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
          {toastIcon ? `${toast.type === 'success' ? '✅' : '❌'} ${toast.message}` : toast.message}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal &&
        (renderFormModal ? (
          renderFormModal({
            product: editingProduct,
            saving,
            error: modalError,
            onSave: handleSave,
            onClose: () => setShowModal(false),
          })
        ) : (
          <ProductFormModal
            product={editingProduct}
            saving={saving}
            error={modalError}
            categoryPlaceholder={categoryPlaceholder}
            onSave={handleSave as unknown as (data: StoreLocalProductInput) => void}
            onClose={() => setShowModal(false)}
          />
        ))}
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
