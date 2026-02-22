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

const CATEGORY_TABS: { key: string; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: '의약품', label: '의약품' },
  { key: '건강기능식품', label: '건강기능식품' },
  { key: '의료기기', label: '의료기기' },
  { key: '화장품', label: '화장품' },
  { key: '생활용품', label: '생활용품' },
];

const PURPOSE_LABELS: Record<string, { text: string; color: string; bg: string }> = {
  CATALOG: { text: '정보', color: '#6b7280', bg: '#f3f4f6' },
  APPLICATION: { text: '신청 가능', color: '#2563eb', bg: '#dbeafe' },
  ACTIVE_SALES: { text: '판매 중', color: '#059669', bg: '#d1fae5' },
};

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
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchCatalog = useCallback(async (category: string, pageOffset: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCatalog({
        category: category === 'all' ? undefined : category,
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
    fetchCatalog(categoryFilter, offset);
  }, [fetchCatalog, categoryFilter, offset]);

  const handleCategoryChange = (cat: string) => {
    setCategoryFilter(cat);
    setOffset(0);
  };

  const handleApply = async (product: CatalogProduct) => {
    if (applyingId) return; // 중복 클릭 방지
    setApplyingId(product.id);
    setToast(null);
    try {
      await applyBySupplyProductId(product.id);
      setToast({ type: 'success', message: `"${product.name}" 판매 신청이 완료되었습니다.` });
      // 로컬 상태 즉시 반영 (재조회 없이)
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, isApplied: true } : p,
      ));
    } catch (e: any) {
      const code = e?.response?.data?.error?.code || e?.code;
      if (code === 'DUPLICATE_APPLICATION') {
        setToast({ type: 'error', message: '이미 신청된 상품입니다.' });
      } else {
        setToast({ type: 'error', message: e.message || '신청에 실패했습니다.' });
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const currentPage = Math.floor(offset / PAGE_LIMIT) + 1;

  return (
    <div style={styles.container}>
      {/* Breadcrumb */}
      <div style={styles.breadcrumb}>
        <Link to="/hub" style={styles.breadcrumbLink}>&larr; 공용공간</Link>
      </div>

      {/* Hero */}
      <header style={styles.hero}>
        <h1 style={styles.heroTitle}>B2B 상품 카탈로그</h1>
        <p style={styles.heroDesc}>
          공급자가 제공하는 상품을 탐색하고 판매 신청할 수 있습니다.
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

      {/* Category Filter */}
      <div style={styles.filterBar}>
        {CATEGORY_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleCategoryChange(tab.key)}
            style={{
              ...styles.filterTab,
              ...(categoryFilter === tab.key ? styles.filterTabActive : {}),
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={styles.emptyState}>상품 카탈로그를 불러오는 중...</div>
      ) : error ? (
        <div style={styles.errorState}>
          <p>{error}</p>
          <button onClick={() => fetchCatalog(categoryFilter, offset)} style={styles.retryButton}>
            다시 시도
          </button>
        </div>
      ) : products.length === 0 ? (
        <div style={styles.emptyState}>
          {categoryFilter === 'all'
            ? '현재 공급 가능한 상품이 없습니다.'
            : `"${CATEGORY_TABS.find(t => t.key === categoryFilter)?.label}" 카테고리의 상품이 없습니다.`}
        </div>
      ) : (
        <>
          <div style={styles.resultCount}>총 {total}건</div>

          <div style={styles.cardGrid}>
            {products.map(item => {
              const purposeInfo = PURPOSE_LABELS[item.purpose] || PURPOSE_LABELS.CATALOG;
              const state = getProductState(item);
              const stateInfo = STATE_CONFIG[state];
              const isApplying = applyingId === item.id;

              return (
                <div key={item.id} style={styles.card}>
                  {/* Header: Supplier + Status Badge */}
                  <div style={styles.cardHeader}>
                    <div style={styles.cardSupplier}>
                      {item.supplierLogoUrl ? (
                        <img
                          src={item.supplierLogoUrl}
                          alt={item.supplierName}
                          style={styles.supplierLogo}
                        />
                      ) : (
                        <div style={styles.supplierLogoPlaceholder}>
                          {item.supplierName.charAt(0)}
                        </div>
                      )}
                      <span style={styles.supplierName}>{item.supplierName}</span>
                    </div>
                    {/* Status Badge (우상단) */}
                    <span style={{
                      ...styles.stateBadge,
                      color: stateInfo.color,
                      backgroundColor: stateInfo.bg,
                      borderColor: stateInfo.border,
                    }}>
                      {stateInfo.label}
                    </span>
                  </div>

                  {/* Product info */}
                  <h3 style={styles.cardTitle}>{item.name}</h3>
                  {item.description && (
                    <p style={styles.cardDesc}>{item.description}</p>
                  )}

                  {/* Meta */}
                  <div style={styles.cardMeta}>
                    {item.category && (
                      <span style={styles.categoryBadge}>{item.category}</span>
                    )}
                    <span style={{
                      ...styles.purposeBadge,
                      backgroundColor: purposeInfo.bg,
                      color: purposeInfo.color,
                    }}>
                      {purposeInfo.text}
                    </span>
                  </div>

                  {/* Action Footer */}
                  <div style={styles.cardFooter}>
                    <span style={styles.cardDate}>
                      {new Date(item.updatedAt).toLocaleDateString('ko-KR')}
                    </span>
                    {state === 'listed' ? (
                      <button disabled style={styles.buttonDisabled}>
                        판매 중
                      </button>
                    ) : state === 'approved' ? (
                      <button
                        onClick={() => navigate('/store/products/b2c')}
                        style={styles.buttonNavigate}
                      >
                        매장 관리로 이동
                      </button>
                    ) : state === 'pending' ? (
                      <button disabled style={styles.buttonDisabled}>
                        승인 대기 중
                      </button>
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
                        {isApplying ? '신청 중...' : '판매 신청'}
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
          신청 후 관리자 승인이 완료되면{' '}
          <Link to="/store/products" style={{ color: colors.primary }}>내 매장 &gt; B2B 구매</Link>
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

  // Card Grid
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.neutral200}`,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardSupplier: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  supplierLogo: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    objectFit: 'cover' as const,
  },
  supplierLogoPlaceholder: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    backgroundColor: colors.primary + '15',
    color: colors.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  supplierName: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
    fontWeight: 500,
  },

  // State Badge (카드 우상단)
  stateBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    fontSize: '0.6875rem',
    fontWeight: 600,
    borderRadius: '10px',
    border: '1px solid',
    whiteSpace: 'nowrap' as const,
  },

  cardTitle: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 600,
    color: colors.neutral900,
    lineHeight: 1.4,
  },
  cardDesc: {
    margin: 0,
    fontSize: '0.8125rem',
    color: colors.neutral500,
    lineHeight: 1.5,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    flex: 1,
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap' as const,
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
  purposeBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '0.6875rem',
    fontWeight: 600,
    borderRadius: '4px',
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '4px',
    paddingTop: '10px',
    borderTop: '1px solid #f1f5f9',
  },
  cardDate: {
    fontSize: '0.75rem',
    color: colors.neutral400,
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
