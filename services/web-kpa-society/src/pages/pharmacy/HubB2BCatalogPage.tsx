/**
 * HubB2BCatalogPage - 플랫폼 B2B 상품 카탈로그
 *
 * WO-O4O-HUB-B2B-CATALOG-V1
 * WO-O4O-STORE-HUB-B2B-UI-REFINEMENT-V1: 내 매장에 추가/제외 UX 정비
 * WO-O4O-STORE-PRODUCT-STATUS-REMOVAL-V1: 매장 상품 상태 제거 — 단순 취급 목록 모델
 * WO-O4O-STORE-HUB-B2B-CANONICAL-DATATABLE-V1:
 *   raw div 테이블 → @o4o/operator-ux-core DataTable 전환
 *   체크박스 multi-select + ActionBar(내 매장에 추가 bulk / 선택 해제) 추가
 *
 * Hub 공용공간에서 플랫폼 공급자 상품을 탐색하고
 * "내 매장에 추가" 버튼 또는 bulk ActionBar로 내 매장 상품 신청을 진행하는 페이지.
 *
 * 사용 API:
 *   - getCatalog() : 플랫폼 B2B 상품 카탈로그 (neture_supplier_products PUBLIC)
 *   - applyBySupplyProductId() : 카탈로그 기반 상품 추가 (단건/bulk 병렬)
 *   - cancelProductByOfferId() : 내 매장에서 상품 제외
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DataTable, Pagination } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { toast } from '@o4o/error-handling';
import {
  getCatalog,
  applyBySupplyProductId,
  cancelProductByOfferId,
  type CatalogProduct,
} from '../../api/pharmacyProducts';
import { colors, borderRadius } from '../../styles/theme';

// ─── 가격 헬퍼 ────────────────────────────────────────────────────────────────

/** KPA 기준 가격: priceGold 우선 → priceGeneral fallback */
function formatKpaPrice(item: CatalogProduct): string {
  const price = item.priceGold ?? item.priceGeneral;
  if (price == null) return '-';
  return price.toLocaleString('ko-KR') + '원';
}

function getPriceSublabel(item: CatalogProduct): string | null {
  if (item.priceGold != null) return '서비스가';
  if (item.priceGeneral != null) return '일반가';
  return null;
}

// ─── 탭 ───────────────────────────────────────────────────────────────────────

// WO-KPA-HUB-OPERATOR-TAB-AND-STATUS-ALIGNMENT-V1: 운영자 탭 추가
const DISTRIBUTION_TABS: { key: string; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'SERVICE', label: 'B2B' },
  { key: 'operator', label: '운영자' },
  { key: 'PRIVATE', label: '판매자 모집' },
];

const PAGE_LIMIT = 20;

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function HubB2BCatalogPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [distributionFilter, setDistributionFilter] = useState('all');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);

  // WO-O4O-STORE-HUB-B2B-CANONICAL-DATATABLE-V1: bulk selection state
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkAdding, setBulkAdding] = useState(false);

  const fetchCatalog = useCallback(async (distType: string, pageOffset: number) => {
    setLoading(true);
    setError(null);
    setSelectedKeys(new Set()); // 탭/페이지 변경 시 선택 초기화
    try {
      const isOperator = distType === 'operator';
      const res = await getCatalog({
        distributionType: (distType === 'all' || distType === 'recommended' || isOperator) ? undefined : distType,
        recommended: distType === 'recommended' ? true : undefined,
        operatorView: isOperator ? true : undefined,
        limit: PAGE_LIMIT,
        offset: pageOffset,
      });
      setProducts(res.data);
      setTotal(res.pagination.total);
    } catch (e: any) {
      setError(e.message || '상품 카탈로그를 불러오지 못했습니다.');
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

  // ─── 단건 추가 ─────────────────────────────────────────────────────────────

  const handleApply = async (product: CatalogProduct) => {
    if (applyingId) return;
    setApplyingId(product.id);
    try {
      await applyBySupplyProductId(product.id);
      toast.success(`"${product.name}" 내 매장에 추가되었습니다.`);
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isAdded: true } : p));
    } catch (e: any) {
      const code = e?.response?.data?.error?.code || e?.code;
      if (code === 'DUPLICATE_APPLICATION') {
        toast.error('이미 내 매장에 추가된 상품입니다.');
      } else {
        toast.error(e.message || '상품 추가에 실패했습니다.');
      }
    } finally {
      setApplyingId(null);
    }
  };

  // ─── 단건 제외 ─────────────────────────────────────────────────────────────

  const handleRemove = async (product: CatalogProduct) => {
    if (removingId) return;
    setRemovingId(product.id);
    setRemoveConfirmId(null);
    try {
      await cancelProductByOfferId(product.id);
      toast.success(`"${product.name}"을(를) 내 매장에서 제외했습니다.`);
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isAdded: false } : p));
    } catch (e: any) {
      toast.error(e.message || '상품 제외에 실패했습니다.');
    } finally {
      setRemovingId(null);
    }
  };

  // ─── Bulk 추가 ─────────────────────────────────────────────────────────────
  // WO-O4O-STORE-HUB-B2B-CANONICAL-DATATABLE-V1:
  // 단건 API(applyBySupplyProductId)를 Promise.all 병렬로 호출.
  // 이미 추가된 항목(isAdded=true) 는 건너뛰고 신규만 처리.
  const handleBulkAdd = useCallback(async () => {
    const targets = products.filter(p => selectedKeys.has(p.id) && !p.isAdded);
    if (targets.length === 0) {
      const alreadyAll = [...selectedKeys].every(k => products.find(p => p.id === k)?.isAdded);
      if (alreadyAll) {
        toast.error('선택한 상품이 이미 모두 내 매장에 추가되어 있습니다.');
      } else {
        toast.error('추가할 상품을 선택해주세요.');
      }
      return;
    }

    setBulkAdding(true);
    const results = await Promise.allSettled(
      targets.map(p => applyBySupplyProductId(p.id).then(() => p.id)),
    );

    let successCount = 0;
    let duplicateCount = 0;
    let failCount = 0;

    const successIds = new Set<string>();
    for (const r of results) {
      if (r.status === 'fulfilled') {
        successCount++;
        successIds.add(r.value);
      } else {
        const code = (r.reason as any)?.response?.data?.error?.code || (r.reason as any)?.code;
        if (code === 'DUPLICATE_APPLICATION') duplicateCount++;
        else failCount++;
      }
    }

    // 성공한 항목 로컬 즉시 반영
    if (successIds.size > 0) {
      setProducts(prev => prev.map(p => successIds.has(p.id) ? { ...p, isAdded: true } : p));
    }

    // 토스트
    if (successCount > 0 && failCount === 0) {
      toast.success(`${successCount}개 상품을 내 매장에 추가했습니다.`);
    } else if (successCount > 0) {
      toast.success(`${successCount}개 추가 완료. ${failCount}개 실패.`);
    } else if (duplicateCount > 0) {
      toast.error('선택한 상품이 이미 내 매장에 추가되어 있습니다.');
    } else {
      toast.error('상품 추가에 실패했습니다. 다시 시도해주세요.');
    }

    setSelectedKeys(new Set());
    setBulkAdding(false);
  }, [products, selectedKeys]);

  // ─── 컬럼 정의 ─────────────────────────────────────────────────────────────

  const columns: ListColumnDef<CatalogProduct>[] = useMemo(
    () => [
      {
        key: 'name',
        header: '상품명',
        sortable: true,
        sortAccessor: (row) => row.name || '',
        render: (_v, row) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 600, color: colors.neutral900, fontSize: '0.875rem' }}>
                {row.name}
              </span>
              {row.isAdded && (
                <span style={styles.myStoreBadge}>내 매장</span>
              )}
            </div>
            {row.description && (
              <span style={{ fontSize: '0.75rem', color: colors.neutral400, lineHeight: 1.4 }}>
                {row.description}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'supplierName',
        header: '공급자',
        width: '150px',
        sortable: true,
        sortAccessor: (row) => row.supplierName || '',
        render: (_v, row) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {row.supplierLogoUrl ? (
              <img src={row.supplierLogoUrl} alt={row.supplierName} style={styles.supplierLogo} />
            ) : (
              <div style={styles.supplierLogoPlaceholder}>{row.supplierName?.charAt(0)}</div>
            )}
            <span style={{ fontSize: '0.8125rem', color: colors.neutral600, fontWeight: 500 }}>
              {row.supplierName}
            </span>
          </div>
        ),
      },
      {
        key: 'priceGold',
        header: '공급가',
        width: '130px',
        align: 'right',
        render: (_v, row) => (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: colors.neutral900 }}>
              {formatKpaPrice(row)}
            </span>
            {getPriceSublabel(row) && (
              <span style={{ fontSize: '0.625rem', color: colors.neutral400 }}>
                {getPriceSublabel(row)}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'consumerReferencePrice',
        header: '권장 소비자가',
        width: '130px',
        align: 'right',
        render: (_v, row) => (
          <span style={{ fontSize: '0.8125rem', color: colors.neutral700 }}>
            {row.consumerReferencePrice != null
              ? row.consumerReferencePrice.toLocaleString('ko-KR') + '원'
              : '-'}
          </span>
        ),
      },
      {
        key: '_actions',
        header: '액션',
        system: true,
        align: 'center',
        width: '80px',
        onCellClick: () => {},
        render: (_v, row) => {
          const isApplying = applyingId === row.id;
          const isRemoving = removingId === row.id;
          if (row.isAdded) {
            return (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <button
                  disabled
                  title="이미 내 매장에 추가됨"
                  style={styles.iconButtonAdded}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
                <button
                  onClick={() => setRemoveConfirmId(row.id)}
                  disabled={isRemoving}
                  title="내 매장에서 제외"
                  style={{ ...styles.iconButtonRemove, opacity: isRemoving ? 0.5 : 1 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>
            );
          }
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button
                onClick={() => handleApply(row)}
                disabled={isApplying}
                title={isApplying ? '추가 중...' : '내 매장에 추가'}
                style={{ ...styles.iconButtonAdd, opacity: isApplying ? 0.6 : 1 }}
              >
                {isApplying ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                )}
              </button>
            </div>
          );
        },
      },
    ],
    [applyingId, removingId, handleApply],
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const currentPage = Math.floor(offset / PAGE_LIMIT) + 1;

  // "미추가" 선택 항목 수 (ActionBar 표시용)
  const notAddedSelectedCount = useMemo(
    () => [...selectedKeys].filter(k => !products.find(p => p.id === k)?.isAdded).length,
    [selectedKeys, products],
  );

  return (
    <div style={styles.container}>
      {/* 제거 확인 다이얼로그 */}
      {removeConfirmId && (() => {
        const target = products.find(p => p.id === removeConfirmId);
        if (!target) return null;
        return (
          <div style={styles.confirmOverlay}>
            <div style={styles.confirmBox}>
              <p style={styles.confirmText}>이 상품을 내 매장에서 제외하시겠습니까?</p>
              <p style={styles.confirmProductName}>{target.name}</p>
              <div style={styles.confirmActions}>
                <button onClick={() => setRemoveConfirmId(null)} style={styles.confirmCancel}>취소</button>
                <button
                  onClick={() => handleRemove(target)}
                  disabled={!!removingId}
                  style={{ ...styles.confirmOk, opacity: removingId ? 0.6 : 1 }}
                >
                  {removingId === target.id ? '처리 중...' : '제외'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Hero */}
      <header style={styles.hero}>
        <h1 style={styles.heroTitle}>상품 카탈로그</h1>
        <p style={styles.heroDesc}>
          현재 활성 공급자가 제공 중인 상품을 탐색하고 내 매장에 추가할 수 있습니다.
        </p>
      </header>

      {/* Distribution Type Filter */}
      <div style={styles.filterBar}>
        {DISTRIBUTION_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleDistributionChange(tab.key)}
            style={{
              ...styles.filterTab,
              ...(distributionFilter === tab.key ? styles.filterTabActive : {}),
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Scope Info */}
      <div style={styles.scopeInfo}>
        <span style={styles.scopeInfoIcon}>ℹ️</span>
        <span>이 화면은 현재 공급 가능한 상품만 표시됩니다. 공급자 등록 전체 상품과는 범위가 다를 수 있습니다.</span>
      </div>

      {/* WO-O4O-STORE-HUB-B2B-CANONICAL-DATATABLE-V1: ActionBar — 선택 항목 있을 때만 표시 */}
      {selectedKeys.size > 0 && (
        <div style={styles.actionBar}>
          <span style={{ fontSize: 13, color: colors.neutral700 }}>
            {selectedKeys.size}개 선택됨
            {notAddedSelectedCount > 0 && notAddedSelectedCount < selectedKeys.size && ` (미추가 ${notAddedSelectedCount}개)`}
          </span>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={handleBulkAdd}
            disabled={bulkAdding}
            style={{ ...styles.actionBarBtn, opacity: bulkAdding ? 0.6 : 1 }}
          >
            {bulkAdding ? '추가 중...' : `내 매장에 추가 (${notAddedSelectedCount || selectedKeys.size}건)`}
          </button>
          <button
            type="button"
            onClick={() => setSelectedKeys(new Set())}
            style={styles.actionBarClearBtn}
          >
            선택 해제
          </button>
        </div>
      )}

      {/* 결과 카운트 */}
      {!loading && !error && products.length > 0 && (
        <div style={styles.resultCount}>공급 가능 상품 {total}건</div>
      )}

      {/* DataTable */}
      {error ? (
        <div style={styles.errorState}>
          <p>{error}</p>
          <button onClick={() => fetchCatalog(distributionFilter, offset)} style={styles.retryButton}>
            다시 시도
          </button>
        </div>
      ) : (
        <DataTable<CatalogProduct>
          columns={columns}
          data={products}
          rowKey="id"
          loading={loading}
          emptyMessage={
            distributionFilter === 'operator'
              ? '운영자 승인 흐름에 참여 중인 상품이 없습니다. B2B 탭에서 상품을 확인해보세요.'
              : distributionFilter === 'all'
                ? '현재 공급 가능한 상품이 없습니다.'
                : `"${DISTRIBUTION_TABS.find(t => t.key === distributionFilter)?.label}" 유형의 상품이 없습니다.`
          }
          tableId="kpa-store-hub-b2b-products"
          selectable
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
        />
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => setOffset((p - 1) * PAGE_LIMIT)}
          total={total}
        />
      )}

      {/* Guide */}
      <div style={styles.notice}>
        <span style={styles.noticeIcon}>💡</span>
        <span>
          상품을 선택한 뒤 "내 매장에 추가"로 한 번에 추가하거나, 각 행의 + 버튼으로 단건 추가할 수 있습니다.
          추가된 상품은 <a href="/store/channels" style={{ color: colors.primary }}>채널 관리</a>에서 진열하면 고객에게 보여집니다.
        </span>
      </div>

      {/* 채널 진열 CTA */}
      {products.some(p => p.isAdded) && (
        <div style={styles.channelCta}>
          <span style={styles.noticeIcon}>✅</span>
          <span>
            추가된 상품은 <strong>채널에서 진열</strong>하면 고객에게 보여집니다.{' '}
            <a href="/store/channels" style={styles.channelCtaLink}>채널 관리로 이동 →</a>
          </span>
        </div>
      )}
    </div>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '24px',
  },
  hero: {
    marginBottom: '24px',
    paddingBottom: '20px',
    borderBottom: '2px solid #e2e8f0',
  },
  heroTitle: {
    margin: 0,
    fontSize: '1.75rem',
    fontWeight: 700,
    color: colors.neutral900,
  },
  heroDesc: {
    margin: '8px 0 0',
    fontSize: '0.95rem',
    color: colors.neutral500,
  },

  // Filter
  filterBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap' as const,
  },
  filterTab: {
    padding: '6px 14px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: colors.neutral500,
    backgroundColor: colors.neutral100,
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    color: '#fff',
  },
  scopeInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    marginBottom: '16px',
    fontSize: '0.75rem',
    color: colors.neutral400,
    backgroundColor: colors.neutral50,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.neutral200}`,
  },
  scopeInfoIcon: {
    fontSize: '12px',
    flexShrink: 0,
  },

  // WO-O4O-STORE-HUB-B2B-CANONICAL-DATATABLE-V1: ActionBar
  actionBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    background: '#fff',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    marginBottom: '12px',
    flexWrap: 'wrap' as const,
  },
  actionBarBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    background: colors.primary,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#fff',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  actionBarClearBtn: {
    padding: '8px 10px',
    background: 'transparent',
    border: 'none',
    fontSize: '13px',
    color: colors.neutral500,
    cursor: 'pointer',
  },

  resultCount: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
    marginBottom: '12px',
  },

  // Icon Buttons
  iconButtonAdd: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    color: colors.white,
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    flexShrink: 0,
  },
  iconButtonAdded: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    color: '#059669',
    backgroundColor: '#d1fae5',
    border: '1px solid #6ee7b7',
    borderRadius: '8px',
    cursor: 'default',
    flexShrink: 0,
  },
  iconButtonRemove: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    color: '#dc2626',
    backgroundColor: '#fff1f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    flexShrink: 0,
  },
  myStoreBadge: {
    display: 'inline-block',
    padding: '1px 6px',
    fontSize: '0.625rem',
    fontWeight: 600,
    color: colors.primary,
    backgroundColor: colors.primary + '15',
    border: `1px solid ${colors.primary}30`,
    borderRadius: '4px',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },

  // Supplier
  supplierLogo: {
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    objectFit: 'cover' as const,
  },
  supplierLogoPlaceholder: {
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    backgroundColor: colors.primary + '15',
    color: colors.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.625rem',
    fontWeight: 700,
    flexShrink: 0,
  },

  // Confirm dialog
  confirmOverlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBox: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    width: '340px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  confirmText: {
    margin: '0 0 8px',
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: colors.neutral900,
  },
  confirmProductName: {
    margin: '0 0 20px',
    fontSize: '0.8125rem',
    color: colors.neutral500,
    wordBreak: 'break-word' as const,
  },
  confirmActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  confirmCancel: {
    padding: '8px 16px',
    fontSize: '0.8125rem',
    color: colors.neutral600,
    backgroundColor: colors.neutral100,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    cursor: 'pointer',
  },
  confirmOk: {
    padding: '8px 16px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#dc2626',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },

  // States
  errorState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    color: '#dc2626',
    fontSize: '0.9rem',
  },
  retryButton: {
    marginTop: '12px',
    padding: '6px 16px',
    fontSize: '0.8125rem',
    color: colors.primary,
    backgroundColor: 'transparent',
    border: `1px solid ${colors.primary}`,
    borderRadius: '6px',
    cursor: 'pointer',
  },
  notice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '18px 22px',
    backgroundColor: colors.primary + '08',
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.primary}20`,
    fontSize: '0.875rem',
    color: colors.neutral600,
    lineHeight: 1.5,
    marginTop: '24px',
  },
  noticeIcon: {
    fontSize: '18px',
    flexShrink: 0,
  },
  channelCta: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '18px 22px',
    backgroundColor: '#f0fdf4',
    borderRadius: borderRadius.lg,
    border: '1px solid #bbf7d0',
    fontSize: '0.875rem',
    color: colors.neutral600,
    lineHeight: 1.5,
    marginTop: '12px',
  },
  channelCtaLink: {
    marginLeft: '6px',
    color: colors.primary,
    fontWeight: 600,
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
};
