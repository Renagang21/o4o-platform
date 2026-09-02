/**
 * SupplyCatalogHub — Store HUB 공급 상품 카탈로그 공통 컴포넌트
 *
 * Naming (WO-O4O-STORE-HUB-SUPPLY-CATALOG-NAMING-ALIGNMENT-V1):
 *   구 `B2BCatalogHub` → `SupplyCatalogHub` 로 정렬. 매장 허브는 B2C 판매 영역이 아니며,
 *   이 화면은 공급자→매장 공급 상품 신청 카탈로그를 의미한다. 내부 distributionType('SERVICE' 등)
 *   값과 route(`/store-hub/b2b`)는 변경하지 않는다(legacy 식별자 유지).
 *
 * WO-O4O-STORE-HUB-B2B-CATALOG-GP-KCOS-COMMON-COMPONENT-EXTRACTION-V1 (extraction origin)
 *   GlycoPharm `HubB2BCatalogPage` / K-Cosmetics `HubB2BPage` (near-identical 370/371줄)을 통합.
 *   서비스 차이(api client · accent 색 · tableId · supplier 라벨 · 채널 관리 링크 유무)만 props 로 주입,
 *   나머지 구조(유통유형 탭 · DataTable · checkbox multi-select · ActionBar bulk 추가 · 단건 추가/제외
 *   · Pagination · empty/loading/error · 안내 박스)는 공통.
 *
 * 의미 보존:
 *   - "내 매장에 추가" = 공급 상품 신청 (`api.applyBySupplyProductId` → ProductApproval(PENDING)).
 *     신청 ≠ 주문. 신청 버튼은 어떤 경우에도 주문을 만들지 않는다.
 *
 * WO-O4O-GLYCOPHARM-CANONICAL-B2B-CART-PRODUCER-UI-ADOPTION-V1:
 *   `cart` prop 이 주어진 서비스에 한해 **opt-in** 으로 canonical B2B 장바구니 producer
 *   (행 단위 · 선택 일괄)를 추가한다. prop 미지정이면 렌더 트리·액션·문구가 종전과 완전히 동일하므로
 *   KPA-Society / K-Cosmetics 화면은 영향을 받지 않는다.
 *   담기는 `store_cart_items` 에 담을 뿐이며 주문이 아니다 — 주문 확정은 장바구니의
 *   `checkout-confirm-b2b` 축이고, 가격/노출/수량 권위는 전부 서버 재검증이다.
 *   이 화면은 자격(승인·유통·조직)을 스스로 판단하지 않는다.
 *   - 유통유형 탭 PRIVATE = "공급 승인 대상" (구 '판매자 모집' 은 Neture 파트너 모집과 혼동되어 정정됨,
 *     WO-O4O-SELLER-RECRUITMENT-TERMINOLOGY-BOUNDARY-FIX-V1). 되돌리지 않는다.
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1:
 *   범위 외로 남겨 두었던 KPA `HubB2BCatalogPage`(728줄) 까지 편입한다. KPA 차이는 config 로만 표현:
 *   accent(blue) · storeNoun('내 약국') · 공급자 로고 · 권장 소비자가 컬럼(additionalColumns) ·
 *   공급가 보조 라벨(서비스가/일반가) · 진열 링크 라벨. 신청 의미(ProductApproval PENDING)·API 무변경.
 *   정규화(3 서비스 공통 적용): 제외 확인 window.confirm → 인라인 확인 다이얼로그,
 *   수제 이전/다음 → 표준 `Pagination`, 결과 건수 표시, ActionBar '미추가 N개', 운영자 탭 빈 문구.
 */

import { useState, useCallback, useMemo } from 'react';
import { Plus, Check, Trash2, X, Loader2, ShoppingCart } from 'lucide-react';
import { ActionBar } from '@o4o/ui';
import { DataTable, Pagination } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { useSupplyProductList } from './useSupplyProductList';
import type { SupplyProductListQuery } from './useSupplyProductList';
import { useSupplyProductApplication } from './useSupplyProductApplication';

// ─── 공통 타입 ────────────────────────────────────────────────────────────────
export interface SupplyCatalogProduct {
  id: string;
  name: string;
  description?: string | null;
  supplierName?: string | null;
  priceGeneral?: number | null;
  priceGold?: number | null;
  isAdded?: boolean;
  /** 공급자 로고 (labels.showSupplierLogo 일 때만 사용) */
  supplierLogoUrl?: string | null;
}

export interface SupplyCatalogListResponse<T extends SupplyCatalogProduct> {
  data: T[];
  pagination: { total: number; limit: number; offset: number };
}

export interface SupplyCatalogGetParams {
  distributionType?: string;
  operatorView?: boolean;
  limit: number;
  offset: number;
}

/** 서비스별 api client 가 구조적으로 만족해야 하는 계약. */
export interface SupplyCatalogApi<T extends SupplyCatalogProduct> {
  getCatalog(params: SupplyCatalogGetParams): Promise<SupplyCatalogListResponse<T>>;
  applyBySupplyProductId(productId: string): Promise<unknown>;
  cancelProductByOfferId(productId: string): Promise<unknown>;
}

export type SupplyCatalogAccent = 'teal' | 'pink' | 'blue';

export interface SupplyCatalogHubLabels {
  /** 공급자 컬럼 헤더. GP '공급자' · KCos '공급사'. 기본 '공급자'. */
  supplierLabel?: string;
  /** 채널 관리 링크 href. 있으면 안내문에 링크 렌더, 없으면 plain text. GP '/store/channels' · KCos 미지정. */
  channelManageHref?: string;
  /** 채널 관리 링크 라벨. 기본 '채널 관리' · KPA '판매 설정'. */
  channelManageLabel?: string;
  /** 매장 지칭 명사. 기본 '내 매장' · KPA '내 약국'. */
  storeNoun?: string;
  /** 공급자 컬럼에 로고를 함께 표시 (KPA). */
  showSupplierLogo?: boolean;
}

/**
 * canonical B2B 장바구니 producer (opt-in).
 *
 * 이 계약은 카탈로그 행 → `store_cart_items` 한 방향만 담당한다. 주문 생성·가격 확정·
 * 승인 판정은 전부 서버(`checkout-confirm-b2b`)의 몫이며 여기서 흉내 내지 않는다.
 */
export interface SupplyCatalogCartProducer<T extends SupplyCatalogProduct> {
  /** 한 행을 장바구니에 담는다(수량 1). 실패 시 throw — 화면은 사유를 그대로 보여준다. */
  addToCart(product: T): Promise<void>;
  /** 담은 뒤 안내에 노출할 장바구니 경로. */
  cartHref: string;
  /** 버튼/안내 문구. 기본 '장바구니'. */
  label?: string;
}

export interface SupplyCatalogHubProps<T extends SupplyCatalogProduct> {
  api: SupplyCatalogApi<T>;
  accent: SupplyCatalogAccent;
  tableId: string;
  labels?: SupplyCatalogHubLabels;
  /**
   * 페이지 헤더 override (선택). 미지정 시 Store HUB 기본 문구("상품 카탈로그" …)를 유지한다.
   * 동일 카탈로그를 다른 IA 위치(예: 내 매장 상품·거래)에서 재사용할 때 제목/설명만 맥락에 맞게 주입.
   */
  heading?: { title?: string; description?: string };
  /** 공급가와 액션 사이에 끼워 넣을 추가 컬럼 (KPA 권장 소비자가 등). */
  additionalColumns?: ListColumnDef<T>[];
  /** 공급가 아래 보조 라벨 (KPA '서비스가' / '일반가'). null 이면 미표시. */
  renderPriceSublabel?: (item: T) => string | null;
  /**
   * canonical B2B 장바구니 producer. **지정한 서비스에서만** 담기 UI 가 나타난다.
   * 미지정(기본)이면 이 컴포넌트의 동작은 종전과 동일하다.
   */
  cart?: SupplyCatalogCartProducer<T>;
}

// ─── 탭 (유통유형 — KPA canonical 정합) ───────────────────────────────────────
const DISTRIBUTION_TABS: { key: string; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'SERVICE', label: 'B2B' },
  { key: 'operator', label: '운영자' },
  // WO-O4O-SELLER-RECRUITMENT-TERMINOLOGY-BOUNDARY-FIX-V1: PRIVATE = 공급자 지정 비공개 공급(매장 취급 신청/공급 승인 대상).
  // 구 '판매자 모집' 은 Neture 제휴(neture_partner_recruitments, 파트너 모집)와 혼동되어 '공급 승인 대상' 으로 정정.
  { key: 'PRIVATE', label: '공급 승인 대상' },
];

const PAGE_LIMIT = 20;

// accent 별 정적 Tailwind class 맵 (동적 class 구성 금지).
const ACCENT_CLASSES: Record<SupplyCatalogAccent, {
  tabActive: string;
  badge: string;
  checkBox: string;
  applyBtn: string;
  retryBtn: string;
  noticeBox: string;
  link: string;
  linkBold: string;
}> = {
  teal: {
    tabActive: 'bg-teal-600 text-white',
    badge: 'bg-teal-50 text-teal-700',
    checkBox: 'bg-teal-50 text-teal-600',
    applyBtn: 'text-teal-600 hover:bg-teal-50',
    retryBtn: 'text-teal-600 border-teal-300 hover:bg-teal-50',
    noticeBox: 'bg-teal-50/60 border-teal-100',
    link: 'text-teal-700 underline underline-offset-2 hover:text-teal-800',
    linkBold: 'text-teal-700 font-semibold underline underline-offset-2 hover:text-teal-800',
  },
  pink: {
    tabActive: 'bg-pink-600 text-white',
    badge: 'bg-pink-50 text-pink-700',
    checkBox: 'bg-pink-50 text-pink-600',
    applyBtn: 'text-pink-600 hover:bg-pink-50',
    retryBtn: 'text-pink-600 border-pink-300 hover:bg-pink-50',
    noticeBox: 'bg-pink-50/60 border-pink-100',
    link: 'text-pink-700 underline underline-offset-2 hover:text-pink-800',
    linkBold: 'text-pink-700 font-semibold underline underline-offset-2 hover:text-pink-800',
  },
  blue: {
    tabActive: 'bg-blue-600 text-white',
    badge: 'bg-blue-50 text-blue-700',
    checkBox: 'bg-blue-50 text-blue-600',
    applyBtn: 'text-blue-600 hover:bg-blue-50',
    retryBtn: 'text-blue-600 border-blue-300 hover:bg-blue-50',
    noticeBox: 'bg-blue-50/60 border-blue-100',
    link: 'text-blue-700 underline underline-offset-2 hover:text-blue-800',
    linkBold: 'text-blue-700 font-semibold underline underline-offset-2 hover:text-blue-800',
  },
};

function formatPrice(item: SupplyCatalogProduct): string {
  const price = item.priceGold ?? item.priceGeneral;
  if (price == null) return '-';
  return price.toLocaleString('ko-KR') + '원';
}

export function SupplyCatalogHub<T extends SupplyCatalogProduct>({
  api,
  accent,
  tableId,
  labels,
  heading,
  additionalColumns,
  renderPriceSublabel,
  cart,
}: SupplyCatalogHubProps<T>) {
  const ac = ACCENT_CLASSES[accent];
  const supplierLabel = labels?.supplierLabel ?? '공급자';
  const channelHref = labels?.channelManageHref;
  const channelLabel = labels?.channelManageLabel ?? '채널 관리';
  const storeNoun = labels?.storeNoun ?? '내 매장';
  const showSupplierLogo = labels?.showSupplierLogo ?? false;
  const headingTitle = heading?.title ?? '상품 카탈로그';
  const headingDescription =
    heading?.description ??
    `현재 활성 공급자가 제공 중인 상품을 탐색하고 ${storeNoun}에 추가할 수 있습니다.`;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  /** 제외 확인 대상 — window.confirm 대신 인라인 다이얼로그(3 서비스 공통). */
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);

  // ─── 장바구니 producer 상태 (cart prop 이 있을 때만 의미가 있다) ──────────────
  const cartLabel = cart?.label ?? '장바구니';
  const [cartAddingId, setCartAddingId] = useState<string | null>(null);
  const [cartBulkAdding, setCartBulkAdding] = useState(false);
  const [cartAddedCount, setCartAddedCount] = useState(0);
  const [cartError, setCartError] = useState<string | null>(null);

  // WO-O4O-STORE-HUB-SUPPLY-PRODUCT-EXPLORER-COMMONIZATION-V1:
  //   목록 조회 · 페이지네이션 · 탭 · loading/empty/error 상태를 공통 Core(useSupplyProductList)로 위임.
  //   화면 구조(accent 탭 · 안내 박스 · 액션 컬럼 · ActionBar)와 API 계약은 그대로 둔다.
  //   Core 는 1-indexed page 축이므로 offset 기반 getCatalog 는 여기 adapter 에서 환산한다.
  const fetchPage = useCallback(
    async ({ page, limit, tab }: SupplyProductListQuery) => {
      const isOperator = tab === 'operator';
      const res = await api.getCatalog({
        distributionType: tab === 'all' || isOperator ? undefined : tab,
        operatorView: isOperator ? true : undefined,
        limit,
        offset: (page - 1) * limit,
      });
      return { items: res.data, total: res.pagination.total };
    },
    [api],
  );

  const list = useSupplyProductList<T>({
    fetchPage,
    limit: PAGE_LIMIT,
    initialTab: 'all',
    resolveErrorMessage: (e) =>
      (e as { message?: string })?.message || '상품 카탈로그를 불러오지 못했습니다.',
    onBeforeLoad: () => setSelectedIds(new Set()),
  });

  const products = list.items;
  const setProducts = list.setItems;
  const { loading, error, total } = list;
  const distributionFilter = list.tab;

  const handleDistributionChange = (key: string) => {
    const safeKey = DISTRIBUTION_TABS.some(t => t.key === key) ? key : 'all';
    list.setTab(safeKey);
  };

  // ─── 신청/제외 액션 (WO-O4O-STORE-HUB-PRODUCT-APPLICATION-AND-CART-COMMONIZATION-V1) ────
  //   단건 추가(= 공급 상품 신청, ProductApproval PENDING) · 단건 제외 · 일괄 신청 상태 기계를
  //   공통 Core 로 위임한다. 의미(신청 ≠ 주문)와 API 계약은 그대로다.
  const application = useSupplyProductApplication<T>({
    api,
    setItems: setProducts,
    labels: { storeNoun },
  });
  const { applyingId, removingId, bulkAdding } = application;

  const handleApply = (product: T) => application.apply(product);

  const handleRemove = (product: T) => {
    if (removingId) return;
    setRemoveConfirmId(null);
    return application.remove(product);
  };

  const handleBulkAdd = useCallback(async () => {
    const targets = products.filter(p => selectedIds.has(p.id) && !p.isAdded);
    const allAlreadyAdded =
      selectedIds.size > 0 && [...selectedIds].every(k => products.find(p => p.id === k)?.isAdded);
    const { successCount } = await application.bulkApply(targets, { allAlreadyAdded });
    if (successCount > 0 || targets.length > 0) setSelectedIds(new Set());
  }, [application, products, selectedIds]);

  // ─── 장바구니 담기 (opt-in) ───────────────────────────────────────────────
  //   담기 = 주문 준비. 승인/유통/조직 자격은 확정 시 서버가 판정하므로 여기서 선차단하지 않는다.
  const handleAddToCart = useCallback(
    async (product: T) => {
      if (!cart || cartAddingId || cartBulkAdding) return;
      setCartAddingId(product.id);
      setCartError(null);
      try {
        await cart.addToCart(product);
        setCartAddedCount(c => c + 1);
      } catch (e) {
        setCartError((e as { message?: string })?.message || '장바구니에 담지 못했습니다.');
      } finally {
        setCartAddingId(null);
      }
    },
    [cart, cartAddingId, cartBulkAdding],
  );

  const handleBulkAddToCart = useCallback(async () => {
    if (!cart || cartBulkAdding) return;
    const targets = products.filter(p => selectedIds.has(p.id));
    if (targets.length === 0) return;
    setCartBulkAdding(true);
    setCartError(null);
    let ok = 0;
    const failed: string[] = [];
    // 한 건 실패가 나머지를 막지 않는다. 실패 사유는 서버 문구를 그대로 보여준다.
    for (const t of targets) {
      try {
        await cart.addToCart(t);
        ok += 1;
      } catch (e) {
        failed.push(`${t.name}: ${(e as { message?: string })?.message || '담기 실패'}`);
      }
    }
    setCartAddedCount(c => c + ok);
    setCartError(failed.length > 0 ? failed.join(' / ') : null);
    setCartBulkAdding(false);
    if (ok > 0) setSelectedIds(new Set());
  }, [cart, cartBulkAdding, products, selectedIds]);

  const notAddedSelectedCount = useMemo(
    () => [...selectedIds].filter(k => !products.find(p => p.id === k)?.isAdded).length,
    [selectedIds, products],
  );

  // ─── 컬럼 ─────────────────────────────────────────────────────────────────
  const columns: ListColumnDef<T>[] = useMemo(() => [
    {
      key: 'name',
      header: '상품명',
      render: (_v, row) => (
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-slate-900">{row.name}</span>
            {row.isAdded && (
              <span className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded ${ac.badge}`}>
                {storeNoun}
              </span>
            )}
          </div>
          {row.description && (
            <span className="text-xs text-slate-400 line-clamp-1">{row.description}</span>
          )}
        </div>
      ),
    },
    {
      key: 'supplierName',
      header: supplierLabel,
      width: '150px',
      render: (_v, row) => (
        <div className="flex items-center gap-2 min-w-0">
          {showSupplierLogo &&
            (row.supplierLogoUrl ? (
              <img
                src={row.supplierLogoUrl}
                alt={row.supplierName ?? ''}
                className="w-6 h-6 rounded object-cover bg-slate-100 shrink-0"
              />
            ) : (
              <span className="w-6 h-6 rounded bg-slate-100 text-slate-500 text-[11px] font-semibold flex items-center justify-center shrink-0">
                {row.supplierName?.charAt(0) ?? '-'}
              </span>
            ))}
          <span className="text-[0.8125rem] text-slate-600 font-medium truncate">
            {row.supplierName || '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'price',
      header: '공급가',
      width: '120px',
      align: 'right',
      render: (_v, row) => {
        const sub = renderPriceSublabel?.(row) ?? null;
        return (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[0.8125rem] font-semibold text-slate-900">{formatPrice(row)}</span>
            {sub && <span className="text-[10px] text-slate-400">{sub}</span>}
          </div>
        );
      },
    },
    ...(additionalColumns ?? []),
    // 장바구니 컬럼 — cart prop 이 있을 때만 존재한다(다른 서비스는 컬럼 자체가 없다).
    ...(cart
      ? [{
          key: '_cart',
          header: cartLabel,
          system: true,
          align: 'center' as const,
          width: '90px',
          onCellClick: () => {},
          render: (_v: unknown, row: T) => (
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleAddToCart(row); }}
                disabled={cartAddingId === row.id || cartBulkAdding}
                title={`${cartLabel}에 담기`}
                className={`inline-flex items-center justify-center w-7 h-7 rounded-full disabled:opacity-60 ${ac.applyBtn}`}
              >
                {cartAddingId === row.id
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <ShoppingCart className="w-4 h-4" />}
              </button>
            </div>
          ),
        } as ListColumnDef<T>]
      : []),
    {
      key: '_actions',
      header: '액션',
      system: true,
      align: 'center',
      width: '90px',
      onCellClick: () => {},
      render: (_v, row) => {
        const isApplying = applyingId === row.id;
        const isRemoving = removingId === row.id;
        if (row.isAdded) {
          return (
            <div className="flex items-center justify-center gap-1">
              <span
                className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${ac.checkBox}`}
                title={`이미 ${storeNoun}에 추가됨`}
              >
                <Check className="w-4 h-4" />
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setRemoveConfirmId(row.id); }}
                disabled={isRemoving}
                title={`${storeNoun}에서 제외`}
                className="inline-flex items-center justify-center w-7 h-7 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        }
        return (
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleApply(row); }}
              disabled={isApplying}
              title={isApplying ? '추가 중...' : `${storeNoun}에 추가`}
              className={`inline-flex items-center justify-center w-7 h-7 rounded-full disabled:opacity-60 ${ac.applyBtn}`}
            >
              {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>
        );
      },
    },
  ], [applyingId, removingId, ac, supplierLabel, storeNoun, showSupplierLogo, additionalColumns, renderPriceSublabel, cart, cartLabel, cartAddingId, cartBulkAdding, handleAddToCart]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = list.totalPages;
  const currentPage = list.page;

  const removeTarget = removeConfirmId ? products.find(p => p.id === removeConfirmId) ?? null : null;

  return (
    <div className="px-1 py-2">
      {/* 제외 확인 — window.confirm 대체 (3 서비스 공통) */}
      {removeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm bg-white rounded-xl p-5 shadow-lg">
            <p className="text-sm text-slate-700">이 상품을 {storeNoun}에서 제외하시겠습니까?</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{removeTarget.name}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRemoveConfirmId(null)}
                className="px-3.5 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={!!removingId}
                onClick={() => handleRemove(removeTarget)}
                className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
              >
                {removingId === removeTarget.id ? '처리 중...' : '제외'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 페이지 헤더 */}
      <div className="mb-5 pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900">{headingTitle}</h1>
        <p className="text-sm text-slate-500 mt-1">{headingDescription}</p>
      </div>

      {/* 유통유형 탭 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {DISTRIBUTION_TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleDistributionChange(tab.key)}
            className={`px-3.5 py-1.5 text-[0.8125rem] font-medium rounded-full transition-colors ${
              distributionFilter === tab.key
                ? ac.tabActive
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 범위 안내 */}
      <div className="flex items-center gap-1.5 px-3.5 py-2 mb-4 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg">
        <span className="shrink-0">ℹ️</span>
        <span>이 화면은 현재 공급 가능한 상품만 표시됩니다. 공급자 등록 전체 상품과는 범위가 다를 수 있습니다.</span>
      </div>

      {error ? (
        <div className="text-center py-16">
          <p className="text-sm text-red-500 mb-3">{error}</p>
          <button
            onClick={list.reload}
            className={`px-4 py-2 text-sm border rounded-lg transition-colors ${ac.retryBtn}`}
          >
            다시 시도
          </button>
        </div>
      ) : (
        <>
          {/* 장바구니 담기 결과 — 담기 ≠ 주문. 확정은 장바구니에서 한다. */}
          {cart && cartAddedCount > 0 && (
            <div className="mb-3 flex items-start gap-2 px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-600">
              <span className="shrink-0">🛒</span>
              <span>
                {cartLabel}에 <strong>{cartAddedCount}건</strong> 담았습니다. 담기는 주문이 아니며,
                수량 변경과 주문 확정은 장바구니에서 합니다.{' '}
                <a href={cart.cartHref} className={ac.linkBold}>{cartLabel}로 이동 →</a>
              </span>
            </div>
          )}
          {cart && cartError && (
            <div className="mb-3 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-600">
              {cartError}
            </div>
          )}

          {/* ActionBar — 선택 항목 있을 때만 */}
          <div className="mb-3">
            <ActionBar
              selectedCount={selectedIds.size}
              onClearSelection={() => setSelectedIds(new Set())}
              statusInfo={
                notAddedSelectedCount > 0 && notAddedSelectedCount < selectedIds.size
                  ? `미추가 ${notAddedSelectedCount}개`
                  : undefined
              }
              actions={[
                {
                  key: 'bulk-add',
                  label: `${storeNoun}에 추가 (${notAddedSelectedCount || selectedIds.size})`,
                  onClick: handleBulkAdd,
                  variant: 'primary' as const,
                  icon: <Plus className="w-3.5 h-3.5" />,
                  loading: bulkAdding,
                  group: 'actions',
                  tooltip: `선택한 상품을 ${storeNoun}에 일괄 추가합니다`,
                  visible: selectedIds.size > 0,
                },
                ...(cart
                  ? [{
                      key: 'bulk-cart',
                      label: `${cartLabel}에 담기 (${selectedIds.size})`,
                      onClick: handleBulkAddToCart,
                      variant: 'default' as const,
                      icon: <ShoppingCart className="w-3.5 h-3.5" />,
                      loading: cartBulkAdding,
                      group: 'actions',
                      tooltip: `선택한 상품을 ${cartLabel}에 담습니다 (주문 확정은 장바구니에서)`,
                      visible: selectedIds.size > 0,
                    }]
                  : []),
                {
                  key: 'clear',
                  label: '선택 해제',
                  onClick: () => setSelectedIds(new Set()),
                  variant: 'default' as const,
                  icon: <X className="w-3.5 h-3.5" />,
                  group: 'meta',
                  visible: selectedIds.size > 0,
                },
              ]}
            />
          </div>

          {!loading && products.length > 0 && (
            <p className="mb-2 text-xs text-slate-400">공급 가능 상품 {total}건</p>
          )}

          <DataTable<T>
            columns={columns}
            data={products}
            rowKey="id"
            loading={loading}
            emptyMessage={
              distributionFilter === 'operator'
                ? '운영자 승인 흐름에 참여 중인 상품이 없습니다.'
                : distributionFilter === 'all'
                  ? '현재 공급 가능한 상품이 없습니다.'
                  : `"${DISTRIBUTION_TABS.find(t => t.key === distributionFilter)?.label}" 유형의 상품이 없습니다.`
            }
            tableId={tableId}
            selectable
            selectedKeys={selectedIds}
            onSelectionChange={setSelectedIds}
          />

          {/* WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1: 수제 이전/다음 → 표준 Pagination */}
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                total={total}
                onPageChange={(p: number) => list.setPage(p)}
              />
            </div>
          )}
        </>
      )}

      {/* 안내 */}
      <div className={`flex items-start gap-3 px-5 py-4 border rounded-xl mt-6 text-sm text-slate-600 leading-relaxed ${ac.noticeBox}`}>
        <span className="text-lg shrink-0">💡</span>
        <span>
          상품을 선택한 뒤 <strong>{storeNoun}에 추가</strong>로 한 번에 추가하거나, 각 행의 + 버튼으로 단건 추가할 수 있습니다.
          {channelHref ? (
            <>
              {' '}추가된 상품은 <a href={channelHref} className={ac.link}>{channelLabel}</a>에서 진열하면 고객에게 보여집니다.
            </>
          ) : (
            <>{' '}추가된 상품은 채널에 진열하면 고객에게 보여집니다.</>
          )}
        </span>
      </div>

      {products.some(p => p.isAdded) && (
        <div className="flex items-start gap-3 px-5 py-4 bg-green-50 border border-green-200 rounded-xl mt-3 text-sm text-slate-600 leading-relaxed">
          <span className="text-lg shrink-0">✅</span>
          <span>
            추가된 상품은 <strong>채널에서 진열</strong>하면 고객에게 보여집니다.
            {channelHref && (
              <>
                {' '}<a href={channelHref} className={ac.linkBold}>{channelLabel}로 이동 →</a>
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

export default SupplyCatalogHub;
