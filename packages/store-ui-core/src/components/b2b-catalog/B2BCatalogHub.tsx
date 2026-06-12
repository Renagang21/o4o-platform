/**
 * B2BCatalogHub — Store HUB 상품 카탈로그 공통 컴포넌트
 *
 * WO-O4O-STORE-HUB-B2B-CATALOG-GP-KCOS-COMMON-COMPONENT-EXTRACTION-V1
 *   GlycoPharm `HubB2BCatalogPage` / K-Cosmetics `HubB2BPage` (near-identical 370/371줄)을 통합.
 *   서비스 차이(api client · accent 색 · tableId · supplier 라벨 · 채널 관리 링크 유무)만 props 로 주입,
 *   나머지 구조(유통유형 탭 · DataTable · checkbox multi-select · ActionBar bulk 추가 · 단건 추가/제외
 *   · Pagination · empty/loading/error · 안내 박스)는 공통.
 *
 * 의미 보존:
 *   - "내 매장에 추가" = 공급 상품 신청 (`api.applyBySupplyProductId` → ProductApproval(PENDING)).
 *     신청 ≠ 주문. 주문/장바구니/발주 버튼 미혼입.
 *   - 유통유형 탭 PRIVATE = "공급 승인 대상" (구 '판매자 모집' 은 Neture 파트너 모집과 혼동되어 정정됨,
 *     WO-O4O-SELLER-RECRUITMENT-TERMINOLOGY-BOUNDARY-FIX-V1). 되돌리지 않는다.
 *   - KPA fuller `HubB2BCatalogPage`(796줄)는 본 컴포넌트 범위 외(무변경).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Check, Trash2, X, Loader2 } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { ActionBar } from '@o4o/ui';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';

// ─── 공통 타입 ────────────────────────────────────────────────────────────────
export interface B2BCatalogProduct {
  id: string;
  name: string;
  description?: string | null;
  supplierName?: string | null;
  priceGeneral?: number | null;
  priceGold?: number | null;
  isAdded?: boolean;
}

export interface B2BCatalogListResponse<T extends B2BCatalogProduct> {
  data: T[];
  pagination: { total: number; limit: number; offset: number };
}

export interface B2BCatalogGetParams {
  distributionType?: string;
  operatorView?: boolean;
  limit: number;
  offset: number;
}

/** 서비스별 api client 가 구조적으로 만족해야 하는 계약. */
export interface B2BCatalogApi<T extends B2BCatalogProduct> {
  getCatalog(params: B2BCatalogGetParams): Promise<B2BCatalogListResponse<T>>;
  applyBySupplyProductId(productId: string): Promise<unknown>;
  cancelProductByOfferId(productId: string): Promise<unknown>;
}

export type B2BCatalogAccent = 'teal' | 'pink';

export interface B2BCatalogHubLabels {
  /** 공급자 컬럼 헤더. GP '공급자' · KCos '공급사'. 기본 '공급자'. */
  supplierLabel?: string;
  /** 채널 관리 링크 href. 있으면 안내문에 링크 렌더, 없으면 plain text. GP '/store/channels' · KCos 미지정. */
  channelManageHref?: string;
}

export interface B2BCatalogHubProps<T extends B2BCatalogProduct> {
  api: B2BCatalogApi<T>;
  accent: B2BCatalogAccent;
  tableId: string;
  labels?: B2BCatalogHubLabels;
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
const ACCENT_CLASSES: Record<B2BCatalogAccent, {
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
};

function formatPrice(item: B2BCatalogProduct): string {
  const price = item.priceGold ?? item.priceGeneral;
  if (price == null) return '-';
  return price.toLocaleString('ko-KR') + '원';
}

export function B2BCatalogHub<T extends B2BCatalogProduct>({
  api,
  accent,
  tableId,
  labels,
}: B2BCatalogHubProps<T>) {
  const ac = ACCENT_CLASSES[accent];
  const supplierLabel = labels?.supplierLabel ?? '공급자';
  const channelHref = labels?.channelManageHref;

  const [products, setProducts] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [distributionFilter, setDistributionFilter] = useState('all');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAdding, setBulkAdding] = useState(false);

  const fetchCatalog = useCallback(async (distType: string, pageOffset: number) => {
    setLoading(true);
    setError(null);
    setSelectedIds(new Set());
    try {
      const isOperator = distType === 'operator';
      const res = await api.getCatalog({
        distributionType: distType === 'all' || isOperator ? undefined : distType,
        operatorView: isOperator ? true : undefined,
        limit: PAGE_LIMIT,
        offset: pageOffset,
      });
      setProducts(res.data);
      setTotal(res.pagination.total);
    } catch (e: any) {
      setError(e?.message || '상품 카탈로그를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchCatalog(distributionFilter, offset);
  }, [fetchCatalog, distributionFilter, offset]);

  const handleDistributionChange = (key: string) => {
    const safeKey = DISTRIBUTION_TABS.some(t => t.key === key) ? key : 'all';
    setDistributionFilter(safeKey);
    setOffset(0);
  };

  // ─── 단건 추가 (= 공급 상품 신청, ProductApproval PENDING) ─────────────────
  const handleApply = async (product: T) => {
    if (applyingId) return;
    setApplyingId(product.id);
    try {
      await api.applyBySupplyProductId(product.id);
      toast.success(`"${product.name}" 내 매장에 추가되었습니다.`);
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isAdded: true } : p));
    } catch (e: any) {
      const code = e?.response?.data?.error?.code || e?.code;
      if (code === 'DUPLICATE_APPLICATION') toast.error('이미 내 매장에 추가된 상품입니다.');
      else toast.error(e?.message || '상품 추가에 실패했습니다.');
    } finally {
      setApplyingId(null);
    }
  };

  // ─── 단건 제외 ───────────────────────────────────────────────────────────
  const handleRemove = async (product: T) => {
    if (removingId) return;
    if (!window.confirm(`"${product.name}"을(를) 내 매장에서 제외하시겠습니까?`)) return;
    setRemovingId(product.id);
    try {
      await api.cancelProductByOfferId(product.id);
      toast.success(`"${product.name}"을(를) 내 매장에서 제외했습니다.`);
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isAdded: false } : p));
    } catch (e: any) {
      toast.error(e?.message || '상품 제외에 실패했습니다.');
    } finally {
      setRemovingId(null);
    }
  };

  // ─── Bulk 추가 (단건 API fan-out) ─────────────────────────────────────────
  const handleBulkAdd = useCallback(async () => {
    const targets = products.filter(p => selectedIds.has(p.id) && !p.isAdded);
    if (targets.length === 0) {
      toast.error('추가할 상품을 선택해주세요.');
      return;
    }
    setBulkAdding(true);
    const results = await Promise.allSettled(
      targets.map(p => api.applyBySupplyProductId(p.id).then(() => p.id)),
    );
    let successCount = 0;
    let failCount = 0;
    const successIds = new Set<string>();
    for (const r of results) {
      if (r.status === 'fulfilled') { successCount++; successIds.add(r.value); }
      else failCount++;
    }
    if (successIds.size > 0) {
      setProducts(prev => prev.map(p => successIds.has(p.id) ? { ...p, isAdded: true } : p));
    }
    if (successCount > 0 && failCount === 0) toast.success(`${successCount}개 상품을 내 매장에 추가했습니다.`);
    else if (successCount > 0) toast.success(`${successCount}개 추가 완료. ${failCount}개 실패.`);
    else toast.error('상품 추가에 실패했습니다. 다시 시도해주세요.');
    setSelectedIds(new Set());
    setBulkAdding(false);
  }, [api, products, selectedIds]);

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
              <span className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded ${ac.badge}`}>내 매장</span>
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
        <span className="text-[0.8125rem] text-slate-600 font-medium">{row.supplierName || '-'}</span>
      ),
    },
    {
      key: 'price',
      header: '공급가',
      width: '120px',
      align: 'right',
      render: (_v, row) => (
        <span className="text-[0.8125rem] font-semibold text-slate-900">{formatPrice(row)}</span>
      ),
    },
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
              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${ac.checkBox}`} title="이미 내 매장에 추가됨">
                <Check className="w-4 h-4" />
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRemove(row); }}
                disabled={isRemoving}
                title="내 매장에서 제외"
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
              title={isApplying ? '추가 중...' : '내 매장에 추가'}
              className={`inline-flex items-center justify-center w-7 h-7 rounded-full disabled:opacity-60 ${ac.applyBtn}`}
            >
              {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>
        );
      },
    },
  ], [applyingId, removingId, ac, supplierLabel]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const currentPage = Math.floor(offset / PAGE_LIMIT) + 1;

  return (
    <div className="px-1 py-2">
      {/* 페이지 헤더 */}
      <div className="mb-5 pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900">상품 카탈로그</h1>
        <p className="text-sm text-slate-500 mt-1">
          현재 활성 공급자가 제공 중인 상품을 탐색하고 내 매장에 추가할 수 있습니다.
        </p>
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
            onClick={() => fetchCatalog(distributionFilter, offset)}
            className={`px-4 py-2 text-sm border rounded-lg transition-colors ${ac.retryBtn}`}
          >
            다시 시도
          </button>
        </div>
      ) : (
        <>
          {/* ActionBar — 선택 항목 있을 때만 */}
          <div className="mb-3">
            <ActionBar
              selectedCount={selectedIds.size}
              onClearSelection={() => setSelectedIds(new Set())}
              actions={[
                {
                  key: 'bulk-add',
                  label: `내 매장에 추가 (${notAddedSelectedCount || selectedIds.size})`,
                  onClick: handleBulkAdd,
                  variant: 'primary' as const,
                  icon: <Plus className="w-3.5 h-3.5" />,
                  loading: bulkAdding,
                  group: 'actions',
                  tooltip: '선택한 상품을 내 매장에 일괄 추가합니다',
                  visible: selectedIds.size > 0,
                },
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

          <DataTable<T>
            columns={columns}
            data={products}
            rowKey="id"
            loading={loading}
            emptyMessage={
              distributionFilter === 'all'
                ? '현재 공급 가능한 상품이 없습니다.'
                : `"${DISTRIBUTION_TABS.find(t => t.key === distributionFilter)?.label}" 유형의 상품이 없습니다.`
            }
            tableId={tableId}
            selectable
            selectedKeys={selectedIds}
            onSelectionChange={setSelectedIds}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                disabled={currentPage <= 1}
                onClick={() => setOffset(o => Math.max(0, o - PAGE_LIMIT))}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50"
              >
                이전
              </button>
              <span className="text-sm text-slate-500">{currentPage} / {totalPages} · 전체 {total}건</span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setOffset(o => o + PAGE_LIMIT)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-md disabled:opacity-40 hover:bg-slate-50"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}

      {/* 안내 */}
      <div className={`flex items-start gap-3 px-5 py-4 border rounded-xl mt-6 text-sm text-slate-600 leading-relaxed ${ac.noticeBox}`}>
        <span className="text-lg shrink-0">💡</span>
        <span>
          상품을 선택한 뒤 <strong>내 매장에 추가</strong>로 한 번에 추가하거나, 각 행의 + 버튼으로 단건 추가할 수 있습니다.
          {channelHref ? (
            <>
              {' '}추가된 상품은 <a href={channelHref} className={ac.link}>채널 관리</a>에서 진열하면 고객에게 보여집니다.
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
                {' '}<a href={channelHref} className={ac.linkBold}>채널 관리로 이동 →</a>
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

export default B2BCatalogHub;
