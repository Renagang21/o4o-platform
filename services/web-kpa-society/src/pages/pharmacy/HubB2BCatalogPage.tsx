/**
 * HubB2BCatalogPage - 플랫폼 B2B 상품 카탈로그
 *
 * WO-O4O-HUB-B2B-CATALOG-V1
 * WO-O4O-HUB-B2B-STATE-VISIBILITY-V1: 상태 배지 + 버튼 정비 + 요약 영역
 *
 * Hub 공용공간에서 플랫폼 공급자 상품을 탐색하고
 * "판매 신청" 버튼으로 내 매장 상품 신청을 진행하는 페이지.
 *
 * 사용 API:
 *   - getCatalog() : 플랫폼 B2B 상품 카탈로그 (neture_supplier_products PUBLIC)
 *   - applyBySupplyProductId() : 카탈로그 기반 상품 판매 신청
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getCatalog,
  applyBySupplyProductId,
  type CatalogProduct,
} from '../../api/pharmacyProducts';
import { colors, shadows, borderRadius } from '../../styles/theme';

// ============================================
// 카테고리 필터
// ============================================

const DISTRIBUTION_TABS: { key: string; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'SERVICE', label: 'B2B' },
  { key: 'recommended', label: '운영자 추천' },
  { key: 'PUBLIC', label: '거점판매 모집' },
];

const PAGE_LIMIT = 20;

// ============================================
// 상태 정의 (WO-O4O-HUB-B2B-STATE-VISIBILITY-V1)
// ============================================

type ProductState = 'listed' | 'approved' | 'pending' | 'available';

const STATE_CONFIG: Record<ProductState, { label: string; color: string; bg: string; border: string }> = {
  listed:    { label: '판매 중',  color: '#065f46', bg: '#d1fae5', border: '#6ee7b7' },
  approved:  { label: '승인 완료', color: '#1e40af', bg: '#dbeafe', border: '#93c5fd' },
  pending:   { label: '승인 대기', color: '#92400e', bg: '#fef3c7', border: '#fcd34d' },
  available: { label: '신청 가능', color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db' },
};

function getProductState(item: CatalogProduct): ProductState {
  if (item.isListed) return 'listed';
  if (item.isApproved) return 'approved';
  if (item.isApplied) return 'pending';
  return 'available';
}

// ============================================
// 컴포넌트
// ============================================

export function HubB2BCatalogPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [distributionFilter, setDistributionFilter] = useState('all');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 정렬 상태
  type SortKey = 'name' | 'supplier' | 'category' | 'status' | 'date';
  type SortOrder = 'asc' | 'desc';
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const fetchCatalog = useCallback(async (distType: string, pageOffset: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCatalog({
        distributionType: (distType === 'all' || distType === 'recommended') ? undefined : distType,
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
    if (distributionFilter !== 'recommended') {
      fetchCatalog(distributionFilter, offset);
    }
  }, [fetchCatalog, distributionFilter, offset]);

  const handleDistributionChange = (key: string) => {
    setDistributionFilter(key);
    setOffset(0);
  };

  const handleApply = async (product: CatalogProduct) => {
    if (applyingId) return; // 중복 클릭 방지
    setApplyingId(product.id);
    setToast(null);
    try {
      await applyBySupplyProductId(product.id);
      setToast({ type: 'success', message: `"${product.name}" 등록 신청이 완료되었습니다.` });
      // 로컬 상태 즉시 반영 (재조회 없이)
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, isApplied: true } : p,
      ));
    } catch (e: any) {
      const code = e?.response?.data?.error?.code || e?.code;
      if (code === 'DUPLICATE_APPLICATION') {
        setToast({ type: 'error', message: '이미 등록 신청된 상품입니다.' });
      } else {
        setToast({ type: 'error', message: e.message || '등록 신청에 실패했습니다.' });
      }
    } finally {
      setApplyingId(null);
      setTimeout(() => setToast(null), 4000);
    }
  };

  // 상태 요약 (WO-O4O-HUB-B2B-STATE-VISIBILITY-V1 §4)
  const summary = useMemo(() => {
    let listed = 0;
    let approved = 0;
    let pending = 0;
    for (const p of products) {
      if (p.isListed) listed++;
      else if (p.isApproved) approved++;
      else if (p.isApplied) pending++;
    }
    return { listed, approved, pending };
  }, [products]);

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
        case 'category': va = a.category || ''; vb = b.category || ''; break;
        case 'status': {
          const order: Record<ProductState, number> = { listed: 0, approved: 1, pending: 2, available: 3 };
          return (order[getProductState(a)] - order[getProductState(b)]) * dir;
        }
        case 'date': va = a.updatedAt || ''; vb = b.updatedAt || ''; break;
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
      {/* Hero */}
      <header style={styles.hero}>
        <h1 style={styles.heroTitle}>상품리스트</h1>
        <p style={styles.heroDesc}>
          공급자가 제공하는 상품을 탐색하고 내 대시보드에 등록할 수 있습니다.
        </p>
      </header>

      {/* Summary Box */}
      {!loading && !error && products.length > 0 && (summary.listed > 0 || summary.pending > 0 || summary.approved > 0) && (
        <div style={styles.summaryBox}>
          {summary.listed > 0 && (
            <div style={styles.summaryItem}>
              <span style={{ ...styles.summaryDot, backgroundColor: STATE_CONFIG.listed.border }} />
              <span style={styles.summaryLabel}>판매 중</span>
              <span style={styles.summaryCount}>{summary.listed}건</span>
            </div>
          )}
          {summary.approved > 0 && (
            <div style={styles.summaryItem}>
              <span style={{ ...styles.summaryDot, backgroundColor: STATE_CONFIG.approved.border }} />
              <span style={styles.summaryLabel}>승인 완료</span>
              <span style={styles.summaryCount}>{summary.approved}건</span>
            </div>
          )}
          {summary.pending > 0 && (
            <div style={styles.summaryItem}>
              <span style={{ ...styles.summaryDot, backgroundColor: STATE_CONFIG.pending.border }} />
              <span style={styles.summaryLabel}>승인 대기</span>
              <span style={styles.summaryCount}>{summary.pending}건</span>
            </div>
          )}
        </div>
      )}

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

      {/* Content */}
      {distributionFilter === 'recommended' ? (
        <div style={styles.emptyState}>운영자 추천 상품이 준비 중입니다.</div>
      ) : loading ? (
        <div style={styles.emptyState}>상품리스트를 불러오는 중...</div>
      ) : error ? (
        <div style={styles.errorState}>
          <p>{error}</p>
          <button onClick={() => fetchCatalog(distributionFilter, offset)} style={styles.retryButton}>
            다시 시도
          </button>
        </div>
      ) : products.length === 0 ? (
        <div style={styles.emptyState}>
          {distributionFilter === 'all'
            ? '현재 공급 가능한 상품이 없습니다.'
            : `"${DISTRIBUTION_TABS.find(t => t.key === distributionFilter)?.label}" 유형의 상품이 없습니다.`}
        </div>
      ) : (
        <>
          <div style={styles.resultCount}>총 {total}건</div>

          <div style={styles.tableCard}>
            {/* Table Header */}
            <div style={styles.tableHeader}>
              <span style={{ ...styles.th, flex: 2, cursor: 'pointer' }} onClick={() => handleSort('name')}>
                상품명{sortIndicator('name')}
              </span>
              <span style={{ ...styles.th, flex: 1.2, cursor: 'pointer' }} onClick={() => handleSort('supplier')}>
                공급사{sortIndicator('supplier')}
              </span>
              <span style={{ ...styles.th, flex: 0.8, cursor: 'pointer' }} onClick={() => handleSort('category')}>
                카테고리{sortIndicator('category')}
              </span>
              <span style={{ ...styles.th, flex: 0.8, cursor: 'pointer' }} onClick={() => handleSort('status')}>
                상태{sortIndicator('status')}
              </span>
              <span style={{ ...styles.th, flex: 0.8, cursor: 'pointer' }} onClick={() => handleSort('date')}>
                등록일{sortIndicator('date')}
              </span>
              <span style={{ ...styles.th, flex: 1, textAlign: 'right' }}>액션</span>
            </div>

            {/* Table Rows */}
            {sortedProducts.map(item => {
              const state = getProductState(item);
              const stateInfo = STATE_CONFIG[state];
              const isApplying = applyingId === item.id;

              return (
                <div key={item.id} style={styles.tableRow}>
                  {/* 상품명 */}
                  <div style={{ ...styles.td, flex: 2, minWidth: 0 }}>
                    <span style={styles.rowTitle}>{item.name}</span>
                    {item.description && (
                      <span style={styles.rowDesc}>{item.description}</span>
                    )}
                  </div>

                  {/* 공급사 */}
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

                  {/* 카테고리 */}
                  <div style={{ ...styles.td, flex: 0.8 }}>
                    {item.category && (
                      <span style={styles.categoryBadge}>{item.category}</span>
                    )}
                  </div>

                  {/* 상태 */}
                  <div style={{ ...styles.td, flex: 0.8 }}>
                    <span style={{
                      ...styles.stateBadge,
                      color: stateInfo.color,
                      backgroundColor: stateInfo.bg,
                      borderColor: stateInfo.border,
                    }}>
                      {stateInfo.label}
                    </span>
                  </div>

                  {/* 등록일 */}
                  <div style={{ ...styles.td, flex: 0.8 }}>
                    <span style={styles.rowDate}>
                      {new Date(item.updatedAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>

                  {/* 액션 */}
                  <div style={{ ...styles.td, flex: 1, justifyContent: 'flex-end' }}>
                    {state === 'listed' ? (
                      <button disabled style={styles.buttonDisabled}>판매 중</button>
                    ) : state === 'approved' ? (
                      <button onClick={() => navigate('/store/products/b2c')} style={styles.buttonNavigate}>매장 관리</button>
                    ) : state === 'pending' ? (
                      <button disabled style={styles.buttonDisabled}>승인 대기</button>
                    ) : (
                      <button
                        onClick={() => handleApply(item)}
                        disabled={isApplying}
                        style={{
                          ...styles.applyButton,
                          opacity: isApplying ? 0.6 : 1,
                          cursor: isApplying ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isApplying ? '등록 중...' : '내 대시보드에 등록'}
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
          등록 신청 후 승인이 완료되면{' '}
          <Link to="/store/commerce/orderable" style={{ color: colors.primary }}>내 매장관리 &gt; 주문 가능 상품</Link>
          에서 상품을 관리할 수 있습니다.
        </span>
      </div>
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

  // Summary Box
  summaryBox: {
    display: 'flex',
    gap: '24px',
    padding: '14px 20px',
    marginBottom: '16px',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.neutral200}`,
    boxShadow: shadows.sm,
  },
  summaryItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  summaryDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  summaryLabel: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
  },
  summaryCount: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.neutral900,
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
  rowDate: {
    fontSize: '0.75rem',
    color: colors.neutral400,
  },
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

  // State Badge
  stateBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    fontSize: '0.6875rem',
    fontWeight: 600,
    borderRadius: '10px',
    border: '1px solid',
    whiteSpace: 'nowrap' as const,
  },

  categoryBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '0.6875rem',
    fontWeight: 500,
    color: colors.neutral600,
    backgroundColor: colors.neutral100,
    borderRadius: '4px',
  },

  // Buttons
  applyButton: {
    padding: '6px 14px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: colors.white,
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  buttonDisabled: {
    padding: '6px 14px',
    fontSize: '0.75rem',
    fontWeight: 500,
    color: colors.neutral400,
    backgroundColor: colors.neutral100,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '6px',
    cursor: 'not-allowed',
  },
  buttonNavigate: {
    padding: '6px 14px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#1e40af',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
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
};
