/**
 * HubB2BCatalogPage - 플랫폼 B2B 상품 카탈로그
 *
 * WO-O4O-HUB-B2B-CATALOG-V1
 * WO-O4O-STORE-HUB-B2B-UI-REFINEMENT-V1: 내 매장에 추가/제외 UX 정비
 * WO-O4O-STORE-PRODUCT-STATUS-REMOVAL-V1: 매장 상품 상태 제거 — 단순 취급 목록 모델
 *
 * Hub 공용공간에서 플랫폼 공급자 상품을 탐색하고
 * "내 매장에 추가" 버튼으로 내 매장 상품 신청을 진행하는 페이지.
 *
 * 사용 API:
 *   - getCatalog() : 플랫폼 B2B 상품 카탈로그 (neture_supplier_products PUBLIC)
 *   - applyBySupplyProductId() : 카탈로그 기반 상품 추가
 *   - cancelProductByOfferId() : 내 매장에서 상품 제외
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getCatalog,
  applyBySupplyProductId,
  cancelProductByOfferId,
  type CatalogProduct,
} from '../../api/pharmacyProducts';
import { colors, shadows, borderRadius } from '../../styles/theme';

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

// ============================================
// 카테고리 필터
// ============================================

// WO-KPA-HUB-OPERATOR-TAB-AND-STATUS-ALIGNMENT-V1:
// 운영자 탭 추가 — KPA 운영자 승인 흐름 관련 상품을 모아보는 뷰.
// 과거 비활성화된 '운영자 추천(offer_curations)' 개념과는 다른 개념임.
// 백엔드(offer_curations) 및 getCatalog의 recommended 파라미터는 향후 재활성화를 위해 유지.
const DISTRIBUTION_TABS: { key: string; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'SERVICE', label: 'B2B' },
  { key: 'operator', label: '운영자' },
  { key: 'PRIVATE', label: '판매자 모집' },
];

const PAGE_LIMIT = 20;

// ============================================
// 컴포넌트
// ============================================

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
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 정렬 상태
  type SortKey = 'name' | 'supplier';
  type SortOrder = 'asc' | 'desc';
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const fetchCatalog = useCallback(async (distType: string, pageOffset: number) => {
    setLoading(true);
    setError(null);
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
    // WO-KPA-HUB-RECOMMENDED-TAB-HIDE-AND-STATE-CLEANUP-V1:
    // recommended 탭 숨김 — 혹시 외부에서 값이 들어와도 'all'로 fallback.
    const safeKey = DISTRIBUTION_TABS.some(t => t.key === key) ? key : 'all';
    setDistributionFilter(safeKey);
    setOffset(0);
  };

  const handleApply = async (product: CatalogProduct) => {
    if (applyingId) return; // 중복 클릭 방지
    setApplyingId(product.id);
    setToast(null);
    try {
      await applyBySupplyProductId(product.id);
      setToast({ type: 'success', message: `"${product.name}" 내 매장에 추가되었습니다.` });
      // 로컬 상태 즉시 반영 (재조회 없이)
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, isAdded: true } : p,
      ));
    } catch (e: any) {
      const code = e?.response?.data?.error?.code || e?.code;
      if (code === 'DUPLICATE_APPLICATION') {
        setToast({ type: 'error', message: '이미 내 매장에 추가된 상품입니다.' });
      } else {
        setToast({ type: 'error', message: e.message || '상품 추가에 실패했습니다.' });
      }
    } finally {
      setApplyingId(null);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleRemove = async (product: CatalogProduct) => {
    if (removingId) return;
    setRemovingId(product.id);
    setRemoveConfirmId(null);
    setToast(null);
    try {
      await cancelProductByOfferId(product.id);
      setToast({ type: 'success', message: `"${product.name}"을(를) 내 매장에서 제외했습니다.` });
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, isAdded: false } : p,
      ));
    } catch (e: any) {
      setToast({ type: 'error', message: e.message || '상품 제외에 실패했습니다.' });
    } finally {
      setRemovingId(null);
      setTimeout(() => setToast(null), 4000);
    }
  };

  // 정렬 적용
  const sortedProducts = useMemo(() => {
    if (!sortKey) return products;
    const dir = sortOrder === 'asc' ? 1 : -1;
    return [...products].sort((a, b) => {
      let va = '';
      let vb = '';
      switch (sortKey) {
        case 'name': va = a.name || ''; vb = b.name || ''; break;
        case 'supplier': va = a.supplierName || ''; vb = b.supplierName || ''; break;
      }
      return va.localeCompare(vb, 'ko') * dir;
    });
  }, [products, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return ' \u2195';
    return sortOrder === 'asc' ? ' \u2191' : ' \u2193';
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const currentPage = Math.floor(offset / PAGE_LIMIT) + 1;

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

      {/* Toast */}
      {toast && (
        <div style={{
          ...styles.toast,
          backgroundColor: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
          borderColor: toast.type === 'success' ? '#86efac' : '#fecaca',
          color: toast.type === 'success' ? '#166534' : '#991b1b',
        }}>
          <span>{toast.type === 'success' ? '\u2705' : '\u274c'}</span>
          <span>{toast.message}</span>
        </div>
      )}

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

      {/* Content */}
      {loading ? (
        <div style={styles.emptyState}>상품 카탈로그를 불러오는 중...</div>
      ) : error ? (
        <div style={styles.errorState}>
          <p>{error}</p>
          <button onClick={() => fetchCatalog(distributionFilter, offset)} style={styles.retryButton}>
            다시 시도
          </button>
        </div>
      ) : products.length === 0 ? (
        <div style={styles.emptyState}>
          {distributionFilter === 'operator'
            ? '운영자 승인 흐름에 참여 중인 상품이 없습니다. B2B 탭에서 상품을 확인하고 내 매장에 추가해보세요.'
            : distributionFilter === 'all'
              ? '현재 공급 가능한 상품이 없습니다.'
              : `"${DISTRIBUTION_TABS.find(t => t.key === distributionFilter)?.label}" 유형의 상품이 없습니다.`}
        </div>
      ) : (
        <>
          <div style={styles.resultCount}>공급 가능 상품 {total}건</div>

          <div style={styles.tableCard}>
            {/* Table Header */}
            <div style={styles.tableHeader}>
              <span style={{ ...styles.th, flex: 2, cursor: 'pointer' }} onClick={() => handleSort('name')}>
                상품명{sortIndicator('name')}
              </span>
              <span style={{ ...styles.th, flex: 1.2, cursor: 'pointer' }} onClick={() => handleSort('supplier')}>
                공급자{sortIndicator('supplier')}
              </span>
              <span style={{ ...styles.th, flex: 1, textAlign: 'right' }}>
                공급가
              </span>
              <span style={{ ...styles.th, flex: 1, textAlign: 'right' }}>
                권장 소비자가
              </span>
              <span style={{ ...styles.th, flex: 1, textAlign: 'right' }}>액션</span>
            </div>

            {/* Table Rows */}
            {sortedProducts.map(item => {
              const isApplying = applyingId === item.id;
              const isAdded = item.isAdded;

              return (
                <div key={item.id} style={styles.tableRow}>
                  {/* 상품명 */}
                  <div style={{ ...styles.td, flex: 2, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <span style={styles.rowTitle}>{item.name}</span>
                      {isAdded && (
                        <span style={styles.myStoreBadge}>내 매장</span>
                      )}
                    </div>
                    {item.description && (
                      <span style={styles.rowDesc}>{item.description}</span>
                    )}
                  </div>

                  {/* 공급자 */}
                  <div style={{ ...styles.td, flex: 1.2 }}>
                    <div style={styles.supplierCell}>
                      {item.supplierLogoUrl ? (
                        <img src={item.supplierLogoUrl} alt={item.supplierName} style={styles.supplierLogo} />
                      ) : (
                        <div style={styles.supplierLogoPlaceholder}>{item.supplierName.charAt(0)}</div>
                      )}
                      <span style={styles.supplierName}>{item.supplierName}</span>
                    </div>
                  </div>

                  {/* 공급가 */}
                  <div style={{ ...styles.td, flex: 1, alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: colors.neutral900 }}>
                      {formatKpaPrice(item)}
                    </span>
                    {getPriceSublabel(item) && (
                      <span style={{ fontSize: '0.625rem', color: colors.neutral400, marginTop: 1 }}>
                        {getPriceSublabel(item)}
                      </span>
                    )}
                  </div>

                  {/* 권장 소비자가 */}
                  <div style={{ ...styles.td, flex: 1, alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '0.8125rem', color: colors.neutral700 }}>
                      {item.consumerReferencePrice != null
                        ? item.consumerReferencePrice.toLocaleString('ko-KR') + '원'
                        : '-'}
                    </span>
                  </div>

                  {/* 액션 */}
                  <div style={{ ...styles.td, flex: 1, justifyContent: 'flex-end', flexDirection: 'row', gap: '6px', alignItems: 'center' }}>
                    {isAdded ? (
                      <>
                        {/* 추가됨 표시 아이콘 */}
                        <button
                          disabled
                          title="이미 내 매장에 추가됨"
                          aria-label="이미 내 매장에 추가됨"
                          style={styles.iconButtonAdded}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </button>
                        {/* 제외 버튼 */}
                        <button
                          onClick={() => setRemoveConfirmId(item.id)}
                          disabled={removingId === item.id}
                          title="내 매장에서 제외"
                          aria-label="내 매장에서 제외"
                          style={{
                            ...styles.iconButtonRemove,
                            opacity: removingId === item.id ? 0.5 : 1,
                            cursor: removingId === item.id ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      /* 내 매장에 추가 버튼 */
                      <button
                        onClick={() => handleApply(item)}
                        disabled={isApplying}
                        title={isApplying ? '추가 중...' : '내 매장에 추가'}
                        aria-label="내 매장에 추가"
                        style={{
                          ...styles.iconButtonAdd,
                          opacity: isApplying ? 0.6 : 1,
                          cursor: isApplying ? 'not-allowed' : 'pointer',
                        }}
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
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button
                onClick={() => setOffset(Math.max(0, offset - PAGE_LIMIT))}
                disabled={currentPage <= 1}
                style={{
                  ...styles.pageButton,
                  opacity: currentPage <= 1 ? 0.4 : 1,
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                &laquo; 이전
              </button>
              <span style={styles.pageInfo}>{currentPage} / {totalPages}</span>
              <button
                onClick={() => setOffset(offset + PAGE_LIMIT)}
                disabled={currentPage >= totalPages}
                style={{
                  ...styles.pageButton,
                  opacity: currentPage >= totalPages ? 0.4 : 1,
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                다음 &raquo;
              </button>
            </div>
          )}
        </>
      )}

      {/* Guide */}
      <div style={styles.notice}>
        <span style={styles.noticeIcon}>💡</span>
        <span>
          내 매장에 추가하면 주문 시 빠르게 사용할 수 있습니다.
        </span>
      </div>

      {/* 채널 진열 CTA — 추가된 상품이 있을 때 표시 */}
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

// ============================================
// 스타일
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '24px',
  },
  breadcrumb: { marginBottom: '16px' },
  breadcrumbLink: {
    fontSize: '0.875rem',
    color: colors.primary,
    textDecoration: 'none',
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

  // Toast
  toast: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '0.875rem',
    marginBottom: '16px',
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
  resultCount: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
    marginBottom: '12px',
  },

  // Table
  tableCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.neutral200}`,
    overflow: 'hidden',
    marginBottom: '24px',
  },
  tableHeader: {
    display: 'flex',
    padding: '10px 20px',
    borderBottom: `1px solid ${colors.neutral200}`,
    backgroundColor: colors.neutral50,
    userSelect: 'none' as const,
  },
  th: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: colors.neutral500,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    transition: 'color 0.15s',
  } as React.CSSProperties,
  tableRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 20px',
    borderBottom: `1px solid ${colors.neutral100}`,
    transition: 'background-color 0.1s',
  },
  td: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    fontSize: '0.8125rem',
    color: colors.neutral700,
    paddingRight: '12px',
  } as React.CSSProperties,
  rowTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.neutral900,
    lineHeight: 1.4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
  rowDesc: {
    fontSize: '0.75rem',
    color: colors.neutral400,
    lineHeight: 1.4,
    marginTop: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
  supplierCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
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
  },
  supplierName: {
    fontSize: '0.8125rem',
    color: colors.neutral600,
    fontWeight: 500,
  },

  // Icon Buttons (WO-O4O-STORE-HUB-B2B-UI-REFINEMENT-V1)
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

  // Pagination
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    marginBottom: '32px',
  },
  pageButton: {
    padding: '6px 14px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: colors.neutral600,
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '6px',
  },
  pageInfo: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
  },

  // States
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    fontSize: '0.9rem',
    color: colors.neutral400,
  },
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
