/**
 * GroupbuyManagePage - 공동구매 운영자 관리 페이지
 *
 * WO-KPA-GROUPBUY-OPERATOR-UI-V1
 * WO-KPA-GROUPBUY-OPERATION-STABILIZATION-V1: 안정화
 *
 * - 상품 리스트 관리
 * - 노출/비노출 토글
 * - 순서 변경
 * - 집계 통계 조회
 *
 * 안정화 적용:
 * - 권한 오류 명확 표시
 * - 통계 로딩/실패 UX
 * - 캐시 정보 표시
 * - 고정 문구 적용
 */

import { useState, useEffect } from 'react';
import { colors } from '../../../styles/theme';
import {
  eventOfferAdminApi,
  type GroupbuyProduct,
  type GroupbuyStats,
  type GroupbuyApiError,
} from '../../../api/eventOfferAdmin';

/** 고정 메시지 (WO-KPA-GROUPBUY-OPERATION-STABILIZATION-V1) */
const MESSAGES = {
  EMPTY_STATE_TITLE: '현재 공동구매 상품이 없습니다.',
  EMPTY_STATE_DESC: '상품을 추가하면 공동구매가 시작됩니다.',
  STATS_LOADING: '통계 집계 중...',
  STATS_ERROR: '통계 집계 중입니다. 잠시 후 다시 시도해 주세요.',
  PERMISSION_DENIED: '접근 권한이 없습니다.',
  CACHE_INFO_PREFIX: '최근 집계 기준',
  NOTICE: '주문·결제·배송은 공급자 시스템에서 처리되며, 본 화면에서는 상품 노출과 집계 통계만 관리합니다.',
} as const;

export function EventOfferManagePage() {
  const [products, setProducts] = useState<GroupbuyProduct[]>([]);
  const [stats, setStats] = useState<GroupbuyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  /**
   * API 에러에서 권한 오류인지 확인
   */
  const isPermissionError = (err: any): boolean => {
    const apiError = err?.response?.data?.error as GroupbuyApiError | undefined;
    return (
      err?.response?.status === 401 ||
      err?.response?.status === 403 ||
      apiError?.code === 'UNAUTHORIZED' ||
      apiError?.code === 'FORBIDDEN'
    );
  };

  /**
   * 통계 조회 실패 에러인지 확인
   */
  const isStatsUnavailableError = (err: any): boolean => {
    const apiError = err?.response?.data?.error as GroupbuyApiError | undefined;
    return apiError?.code === 'STATS_UNAVAILABLE';
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setPermissionDenied(false);
    setStatsError(null);

    try {
      // 상품 목록 조회
      const productsRes = await eventOfferAdminApi.getProducts();
      if (productsRes?.data) {
        setProducts(productsRes.data);
      }
    } catch (err: any) {
      console.error('Groupbuy products load error:', err);
      if (isPermissionError(err)) {
        setPermissionDenied(true);
        setError(MESSAGES.PERMISSION_DENIED);
      } else {
        setError('데이터를 불러오는데 실패했습니다.');
      }
    }

    // 통계는 별도 로딩 (권한 오류가 없을 때만)
    if (!permissionDenied) {
      try {
        const statsRes = await eventOfferAdminApi.getStats();
        if (statsRes?.data) {
          setStats(statsRes.data);
        }
      } catch (statsErr: any) {
        console.error('Groupbuy stats load error:', statsErr);
        if (isStatsUnavailableError(statsErr)) {
          setStatsError(MESSAGES.STATS_ERROR);
        }
        // 통계 오류는 전체 페이지 오류로 처리하지 않음
      }
    }

    setLoading(false);
  };

  /**
   * 통계 새로고침
   */
  const refreshStats = async () => {
    setStatsLoading(true);
    setStatsError(null);

    try {
      const statsRes = await eventOfferAdminApi.getStats();
      if (statsRes?.data) {
        setStats(statsRes.data);
      }
    } catch (err: any) {
      console.error('Stats refresh error:', err);
      if (isStatsUnavailableError(err)) {
        setStatsError(MESSAGES.STATS_ERROR);
      } else {
        setStatsError(MESSAGES.STATS_ERROR);
      }
    } finally {
      setStatsLoading(false);
    }
  };

  /**
   * 캐시 시간 포맷
   */
  const formatCacheTime = (isoString?: string): string => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const handleToggleVisibility = async (product: GroupbuyProduct) => {
    try {
      await eventOfferAdminApi.toggleVisibility(product.id, !product.isVisible);
      setProducts(prev =>
        prev.map(p =>
          p.id === product.id ? { ...p, isVisible: !p.isVisible } : p
        )
      );
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const product = products[index];
    try {
      await eventOfferAdminApi.updateOrder(product.id, index - 1);
      const newProducts = [...products];
      [newProducts[index - 1], newProducts[index]] = [newProducts[index], newProducts[index - 1]];
      setProducts(newProducts);
    } catch (err) {
      console.error('Failed to move up:', err);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === products.length - 1) return;
    const product = products[index];
    try {
      await eventOfferAdminApi.updateOrder(product.id, index + 1);
      const newProducts = [...products];
      [newProducts[index], newProducts[index + 1]] = [newProducts[index + 1], newProducts[index]];
      setProducts(newProducts);
    } catch (err) {
      console.error('Failed to move down:', err);
    }
  };

  const handleRemove = async (product: GroupbuyProduct) => {
    if (!window.confirm(`"${product.title}" 상품을 공동구매 목록에서 제거하시겠습니까?`)) {
      return;
    }
    try {
      await eventOfferAdminApi.removeProduct(product.id);
      setProducts(prev => prev.filter(p => p.id !== product.id));
    } catch (err) {
      console.error('Failed to remove product:', err);
    }
  };

  const getStatusBadge = (status: GroupbuyProduct['status']) => {
    const badges: Record<string, { label: string; bg: string; color: string }> = {
      upcoming: { label: '예정', bg: '#FEF3C7', color: '#D97706' },
      active: { label: '진행중', bg: '#D1FAE5', color: '#059669' },
      ended: { label: '종료', bg: '#E5E7EB', color: '#6B7280' },
    };
    const badge = badges[status] || badges.ended;
    return (
      <span style={{ ...styles.statusBadge, backgroundColor: badge.bg, color: badge.color }}>
        {badge.label}
      </span>
    );
  };

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>공동구매 관리</h1>
          <p style={styles.subtitle}>공동구매 상품 노출을 관리합니다</p>
        </div>
        <div style={styles.actions}>
          <button
            style={styles.statsButton}
            onClick={() => setShowStats(!showStats)}
          >
            {showStats ? '목록 보기' : '통계 보기'}
          </button>
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <div style={styles.errorBanner}>
          {error}
        </div>
      )}

      {/* 통계 섹션 */}
      {showStats && (
        <div style={styles.statsSection}>
          <div style={styles.statsSectionHeader}>
            <h2 style={styles.sectionTitle}>집계 통계</h2>
            {stats?.cachedAt && (
              <span style={styles.cacheInfo}>
                {MESSAGES.CACHE_INFO_PREFIX} {formatCacheTime(stats.cachedAt)}
              </span>
            )}
            <button
              style={styles.refreshButton}
              onClick={refreshStats}
              disabled={statsLoading}
            >
              {statsLoading ? '새로고침 중...' : '새로고침'}
            </button>
          </div>

          {/* 통계 로딩 중 */}
          {statsLoading && !stats && (
            <div style={styles.statsLoadingState}>
              <div style={styles.loadingSpinner}>⏳</div>
              <div>{MESSAGES.STATS_LOADING}</div>
            </div>
          )}

          {/* 통계 에러 */}
          {statsError && !stats && (
            <div style={styles.statsErrorState}>
              <div style={styles.errorIcon}>⚠️</div>
              <div>{statsError}</div>
              <button style={styles.retryButton} onClick={refreshStats}>
                다시 시도
              </button>
            </div>
          )}

          {/* 통계 에러 + 이전 캐시 존재 */}
          {statsError && stats && (
            <div style={styles.statsWarningBanner}>
              {statsError} (이전 캐시 표시 중)
            </div>
          )}

          {/* 통계 데이터 */}
          {stats && (
            <>
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <div style={styles.statValue}>{stats.totalOrders}</div>
                  <div style={styles.statLabel}>총 주문 건수</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statValue}>{stats.totalParticipants}</div>
                  <div style={styles.statLabel}>참여 약국 수</div>
                </div>
              </div>

              {stats.productOrders.length > 0 && (
                <div style={styles.productStats}>
                  <h3 style={styles.subTitle}>상품별 주문 현황</h3>
                  {stats.productOrders.map(item => (
                    <div key={item.productId} style={styles.productStatRow}>
                      <span>{item.productName}</span>
                      <span style={styles.orderCount}>{item.orderCount}건</span>
                    </div>
                  ))}
                </div>
              )}

              {stats.totalOrders === 0 && (
                <div style={styles.emptyStats}>
                  현재 집계된 데이터가 없습니다.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 권한 오류 화면 */}
      {permissionDenied && (
        <div style={styles.permissionDeniedSection}>
          <div style={styles.permissionDeniedIcon}>🔒</div>
          <div style={styles.permissionDeniedTitle}>{MESSAGES.PERMISSION_DENIED}</div>
          <div style={styles.permissionDeniedDesc}>
            운영자 권한이 필요합니다. 관리자에게 문의해 주세요.
          </div>
        </div>
      )}

      {/* 상품 목록 */}
      {!showStats && !permissionDenied && (
        <div style={styles.listSection}>
          {loading ? (
            <div style={styles.loading}>불러오는 중...</div>
          ) : products.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🛒</div>
              <div style={styles.emptyTitle}>{MESSAGES.EMPTY_STATE_TITLE}</div>
              <div style={styles.emptyDesc}>
                {MESSAGES.EMPTY_STATE_DESC}
              </div>
            </div>
          ) : (
            <div style={styles.productList}>
              <div style={styles.listHeader}>
                <span style={styles.colTitle}>상품명</span>
                <span style={styles.colSupplier}>공급자</span>
                <span style={styles.colOrders}>주문</span>
                <span style={styles.colParticipants}>참여</span>
                <span style={styles.colStatus}>상태</span>
                <span style={styles.colActions}>관리</span>
              </div>
              {products.map((product, index) => (
                <div
                  key={product.id}
                  style={{
                    ...styles.productRow,
                    opacity: product.isVisible ? 1 : 0.5,
                  }}
                >
                  <div style={styles.colTitle}>
                    <div style={styles.productTitle}>{product.title}</div>
                    <div style={styles.productCondition}>{product.conditionSummary}</div>
                  </div>
                  <span style={styles.colSupplier}>{product.supplierName}</span>
                  <span style={styles.colOrders}>{product.orderCount}건</span>
                  <span style={styles.colParticipants}>{product.participantCount}곳</span>
                  <span style={styles.colStatus}>{getStatusBadge(product.status)}</span>
                  <div style={styles.colActions}>
                    <button
                      style={styles.iconButton}
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      title="위로"
                    >
                      ▲
                    </button>
                    <button
                      style={styles.iconButton}
                      onClick={() => handleMoveDown(index)}
                      disabled={index === products.length - 1}
                      title="아래로"
                    >
                      ▼
                    </button>
                    <button
                      style={{
                        ...styles.iconButton,
                        color: product.isVisible ? colors.accentGreen : colors.neutral400,
                      }}
                      onClick={() => handleToggleVisibility(product)}
                      title={product.isVisible ? '숨기기' : '보이기'}
                    >
                      {product.isVisible ? '👁️' : '🚫'}
                    </button>
                    <button
                      style={{ ...styles.iconButton, color: colors.accentRed }}
                      onClick={() => handleRemove(product)}
                      title="제거"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 안내 문구 (WO-KPA-GROUPBUY-OPERATION-STABILIZATION-V1 고정 문구) */}
      {!permissionDenied && (
        <div style={styles.notice}>
          <strong>안내:</strong> {MESSAGES.NOTICE}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: colors.neutral900,
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: colors.neutral500,
    marginTop: '4px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  statsButton: {
    padding: '10px 20px',
    backgroundColor: colors.neutral100,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral700,
    cursor: 'pointer',
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  statsSection: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '24px',
  },
  statsSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
    flex: 1,
  },
  cacheInfo: {
    fontSize: '12px',
    color: colors.neutral500,
    backgroundColor: colors.neutral100,
    padding: '4px 8px',
    borderRadius: '4px',
  },
  refreshButton: {
    padding: '6px 12px',
    backgroundColor: colors.neutral100,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  statsLoadingState: {
    textAlign: 'center',
    padding: '40px',
    color: colors.neutral500,
  },
  loadingSpinner: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  statsErrorState: {
    textAlign: 'center',
    padding: '40px',
    color: colors.neutral600,
  },
  errorIcon: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  retryButton: {
    marginTop: '16px',
    padding: '8px 16px',
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.white,
    cursor: 'pointer',
  },
  statsWarningBanner: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
    padding: '10px 16px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '13px',
  },
  permissionDeniedSection: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '60px 20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    textAlign: 'center',
  },
  permissionDeniedIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  permissionDeniedTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral800,
    marginBottom: '8px',
  },
  permissionDeniedDesc: {
    fontSize: '14px',
    color: colors.neutral500,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 700,
    color: colors.primary,
  },
  statLabel: {
    fontSize: '14px',
    color: colors.neutral500,
    marginTop: '4px',
  },
  productStats: {
    borderTop: `1px solid ${colors.neutral200}`,
    paddingTop: '20px',
  },
  subTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: '0 0 16px 0',
  },
  productStatRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: colors.neutral50,
    borderRadius: '6px',
    marginBottom: '8px',
    fontSize: '14px',
  },
  orderCount: {
    fontWeight: 600,
    color: colors.primary,
  },
  emptyStats: {
    textAlign: 'center',
    padding: '40px',
    color: colors.neutral500,
    fontSize: '14px',
  },
  listSection: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: colors.neutral500,
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral800,
    marginBottom: '8px',
  },
  emptyDesc: {
    fontSize: '14px',
    color: colors.neutral500,
  },
  productList: {},
  listHeader: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 80px 80px 80px 120px',
    gap: '16px',
    padding: '12px 16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 600,
    color: colors.neutral500,
    textTransform: 'uppercase',
    marginBottom: '8px',
  },
  productRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 80px 80px 80px 120px',
    gap: '16px',
    padding: '16px',
    borderBottom: `1px solid ${colors.neutral100}`,
    alignItems: 'center',
    fontSize: '14px',
  },
  colTitle: {},
  colSupplier: {
    color: colors.neutral600,
  },
  colOrders: {
    textAlign: 'center',
    fontWeight: 500,
  },
  colParticipants: {
    textAlign: 'center',
    fontWeight: 500,
  },
  colStatus: {
    textAlign: 'center',
  },
  colActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  productTitle: {
    fontWeight: 500,
    color: colors.neutral900,
  },
  productCondition: {
    fontSize: '12px',
    color: colors.neutral500,
    marginTop: '4px',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  iconButton: {
    width: '28px',
    height: '28px',
    backgroundColor: colors.neutral100,
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.neutral600,
    borderLeft: `4px solid ${colors.primary}`,
  },
};

export default EventOfferManagePage;
