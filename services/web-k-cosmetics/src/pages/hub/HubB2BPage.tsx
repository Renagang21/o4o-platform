/**
 * HubB2BPage — K-Cosmetics Store HUB 상품 카탈로그
 *
 * WO-O4O-HUB-TO-STORE-UX-BRIDGE-V1
 * WO-O4O-KCOS-STORE-HUB-B2B-CATALOG-KPA-ALIGNMENT-V1:
 *   KPA-Society canonical 정렬 — 로컬 raw 테이블(품목 탭) → @o4o/operator-ux-core DataTable
 *   + checkbox multi-select + ActionBar(bulk 내 매장에 추가). 유통유형 탭(전체/B2B/운영자/판매자 모집).
 *   품목(화장품/뷰티디바이스/…) 탭 제거 — 품목·대상·노출 제어는 Neture 공급자/운영자 영역 책임.
 *   공급 가능 상품을 탐색하고 "내 매장에 추가"하는 공통 화면으로 정렬.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Check, Trash2, X, Loader2 } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { ActionBar } from '@o4o/ui';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import {
  getCatalog,
  applyBySupplyProductId,
  cancelProductByOfferId,
  type CatalogProduct,
} from '../../api/pharmacyProducts';

// ─── 탭 (유통유형 — KPA canonical 정합) ───────────────────────────────────────
const DISTRIBUTION_TABS: { key: string; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'SERVICE', label: 'B2B' },
  { key: 'operator', label: '운영자' },
  { key: 'PRIVATE', label: '판매자 모집' },
];

const PAGE_LIMIT = 20;

function formatPrice(item: CatalogProduct): string {
  const price = item.priceGold ?? item.priceGeneral;
  if (price == null) return '-';
  return price.toLocaleString('ko-KR') + '원';
}

export function HubB2BPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
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
      const res = await getCatalog({
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
  }, []);

  useEffect(() => {
    fetchCatalog(distributionFilter, offset);
  }, [fetchCatalog, distributionFilter, offset]);

  const handleDistributionChange = (key: string) => {
    const safeKey = DISTRIBUTION_TABS.some(t => t.key === key) ? key : 'all';
    setDistributionFilter(safeKey);
    setOffset(0);
  };

  // ─── 단건 추가 ───────────────────────────────────────────────────────────
  const handleApply = async (product: CatalogProduct) => {
    if (applyingId) return;
    setApplyingId(product.id);
    try {
      await applyBySupplyProductId(product.id);
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
  const handleRemove = async (product: CatalogProduct) => {
    if (removingId) return;
    if (!window.confirm(`"${product.name}"을(를) 내 매장에서 제외하시겠습니까?`)) return;
    setRemovingId(product.id);
    try {
      await cancelProductByOfferId(product.id);
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
      targets.map(p => applyBySupplyProductId(p.id).then(() => p.id)),
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
  }, [products, selectedIds]);

  const notAddedSelectedCount = useMemo(
    () => [...selectedIds].filter(k => !products.find(p => p.id === k)?.isAdded).length,
    [selectedIds, products],
  );

  // ─── 컬럼 ─────────────────────────────────────────────────────────────────
  const columns: ListColumnDef<CatalogProduct>[] = useMemo(() => [
    {
      key: 'name',
      header: '상품명',
      render: (_v, row) => (
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-slate-900">{row.name}</span>
            {row.isAdded && (
              <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded bg-pink-50 text-pink-700">내 매장</span>
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
      header: '공급사',
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
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-pink-50 text-pink-600" title="이미 내 매장에 추가됨">
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
              className="inline-flex items-center justify-center w-7 h-7 rounded-full text-pink-600 hover:bg-pink-50 disabled:opacity-60"
            >
              {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>
        );
      },
    },
  ], [applyingId, removingId]); // eslint-disable-line react-hooks/exhaustive-deps

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
                ? 'bg-pink-600 text-white'
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
            className="px-4 py-2 text-sm text-pink-600 border border-pink-300 rounded-lg hover:bg-pink-50 transition-colors"
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

          <DataTable<CatalogProduct>
            columns={columns}
            data={products}
            rowKey="id"
            loading={loading}
            emptyMessage={
              distributionFilter === 'all'
                ? '현재 공급 가능한 상품이 없습니다.'
                : `"${DISTRIBUTION_TABS.find(t => t.key === distributionFilter)?.label}" 유형의 상품이 없습니다.`
            }
            tableId="kcos-store-hub-b2b-products"
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
      <div className="flex items-start gap-3 px-5 py-4 bg-pink-50/60 border border-pink-100 rounded-xl mt-6 text-sm text-slate-600 leading-relaxed">
        <span className="text-lg shrink-0">💡</span>
        <span>
          상품을 선택한 뒤 <strong>내 매장에 추가</strong>로 한 번에 추가하거나, 각 행의 + 버튼으로 단건 추가할 수 있습니다.
          추가된 상품은 채널에 진열하면 고객에게 보여집니다.
        </span>
      </div>

      {products.some(p => p.isAdded) && (
        <div className="flex items-start gap-3 px-5 py-4 bg-green-50 border border-green-200 rounded-xl mt-3 text-sm text-slate-600 leading-relaxed">
          <span className="text-lg shrink-0">✅</span>
          <span>
            추가된 상품은 <strong>채널에서 진열</strong>하면 고객에게 보여집니다.
          </span>
        </div>
      )}
    </div>
  );
}

export default HubB2BPage;
