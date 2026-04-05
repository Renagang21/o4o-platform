/**
 * KpaGroupbuyPage - 공동구매 상품 카탈로그 페이지
 *
 * WO-KPA-GROUPBUY-PAGE-V1: organization_product_listings 기반 상품 카탈로그
 * WO-KPA-GROUPBUY-STATS-V1: 운영자 통계 카드 추가
 * WO-O4O-GROUPBUY-IA-ALIGNMENT-V1: 매장 통합 구매 크로스 네비게이션
 */

import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Pagination, Card } from '../../components/common';
import { groupbuyApi } from '../../api';
import { useAuth } from '../../contexts';
import { colors, typography } from '../../styles/theme';
import { PLATFORM_ROLES, hasAnyRole } from '../../lib/role-constants';
import type { GroupbuyProduct, GroupbuyStats } from '../../types';

export function KpaGroupbuyPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<GroupbuyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<GroupbuyStats | null>(null);
  const { user } = useAuth();

  const currentPage = parseInt(searchParams.get('page') || '1');

  const hasStore = user?.isStoreOwner === true;
  const isOperator = user ? hasAnyRole(user.roles, PLATFORM_ROLES) : false;

  useEffect(() => {
    loadData();
  }, [currentPage]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await groupbuyApi.getGroupbuyProducts({
        page: currentPage,
        limit: 12,
      });
      setProducts(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      console.warn('Groupbuy products API not available:', err);
      setProducts([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }

    // 운영자인 경우 통계 로드
    if (isOperator) {
      try {
        const statsRes = await groupbuyApi.getGroupbuyStats();
        setStats(statsRes.data);
      } catch {
        // 통계 실패 시 무시
      }
    }
  };

  const handlePageChange = (page: number) => {
    setSearchParams(prev => {
      prev.set('page', String(page));
      return prev;
    });
  };

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return '가격 미정';
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR');
  };

  if (loading) {
    return <LoadingSpinner message="공동구매 상품을 불러오는 중..." />;
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title="공동구매"
        description="약사회 회원 전용 공동구매 상품"
        breadcrumb={[{ label: '약국 HUB', href: '/hub' }, { label: '공동구매' }]}
      />

      {/* 운영자 통계 카드 (WO-KPA-GROUPBUY-STATS-V1) */}
      {isOperator && stats && (
        <div style={styles.statsSection}>
          <h3 style={styles.statsTitle}>공동구매 운영 현황</h3>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>총 주문</span>
              <span style={styles.statValue}>{stats.totalOrders}</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>판매 수량</span>
              <span style={styles.statValue}>{stats.totalQuantity}</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>매출액</span>
              <span style={styles.statValue}>{formatCurrency(stats.totalRevenue)}</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>참여 매장</span>
              <span style={styles.statValue}>{stats.participatingStores}</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>등록 상품</span>
              <span style={{ ...styles.statValue, color: '#7C3AED' }}>{stats.registeredProducts}</span>
            </div>
          </div>
        </div>
      )}

      {/* 안내 배너 */}
      <div style={styles.banner}>
        <div style={styles.bannerContent}>
          <span style={styles.bannerIcon}>🛒</span>
          <div>
            <p style={styles.bannerTitle}>약사회 공동구매 전용 상품입니다.</p>
            <p style={styles.bannerDesc}>
              {hasStore
                ? '매장 등록이 확인되었습니다. 상품을 선택하여 주문할 수 있습니다.'
                : '매장 등록 후 주문에 참여할 수 있습니다.'}
            </p>
            {/* WO-O4O-GROUPBUY-IA-ALIGNMENT-V1 */}
            <Link to="/store/products?tab=kpa-groupbuy" style={styles.crossNavLink}>
              매장 통합 구매로 보기 &rarr;
            </Link>
          </div>
        </div>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon="🛒"
          title="공동구매 상품이 없습니다"
          description="현재 등록된 공동구매 상품이 없습니다."
        />
      ) : (
        <>
          <div style={styles.grid}>
            {products.map(product => (
              <Link key={product.id} to={`/groupbuy/${product.id}`} style={styles.itemLink}>
                <Card hover padding="none">
                  <div style={styles.thumbnail}>
                    <div style={styles.thumbnailPlaceholder}>🛍️</div>
                    <span style={styles.serviceBadge}>공동구매</span>
                  </div>
                  <div style={styles.content}>
                    <h3 style={styles.title}>{product.product_name}</h3>

                    <div style={styles.priceSection}>
                      <span style={styles.price}>{formatPrice(product.retail_price)}</span>
                    </div>

                    <div style={styles.meta}>
                      <span style={styles.metaItem}>
                        ID: {product.external_product_id}
                      </span>
                      <span style={styles.metaItem}>
                        {formatDate(product.created_at)}
                      </span>
                    </div>

                    <div style={styles.actionArea}>
                      {hasStore ? (
                        <span style={styles.orderButton}>상세보기</span>
                      ) : (
                        <span style={styles.disabledButton}>매장 등록 후 참여 가능</span>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  // Stats section (WO-KPA-GROUPBUY-STATS-V1)
  statsSection: {
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '12px',
    padding: '20px 24px',
    marginBottom: '20px',
  },
  statsTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral700,
    margin: '0 0 16px 0',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '16px',
  },
  statCard: {
    textAlign: 'center',
    padding: '12px 8px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
  statLabel: {
    display: 'block',
    fontSize: '12px',
    color: colors.neutral500,
    marginBottom: '4px',
  },
  statValue: {
    display: 'block',
    fontSize: '22px',
    fontWeight: 700,
    color: colors.neutral900,
  },
  // Banner
  banner: {
    backgroundColor: '#F5F3FF',
    border: '1px solid #DDD6FE',
    borderRadius: '12px',
    padding: '20px 24px',
    marginBottom: '24px',
  },
  bannerContent: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
  },
  bannerIcon: {
    fontSize: '32px',
    flexShrink: 0,
  },
  bannerTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#5B21B6',
    margin: '0 0 4px 0',
  },
  bannerDesc: {
    fontSize: '14px',
    color: '#6D28D9',
    margin: 0,
  },
  // WO-O4O-GROUPBUY-IA-ALIGNMENT-V1
  crossNavLink: {
    display: 'inline-block',
    marginTop: '8px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#7C3AED',
    textDecoration: 'none',
  },
  // Product grid
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
  },
  itemLink: {
    textDecoration: 'none',
    color: 'inherit',
  },
  thumbnail: {
    position: 'relative',
    height: '160px',
    backgroundColor: colors.neutral100,
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
  },
  serviceBadge: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#7C3AED',
    backgroundColor: '#EDE9FE',
  },
  content: {
    padding: '16px',
  },
  title: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: '0 0 12px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  priceSection: {
    marginBottom: '12px',
  },
  price: {
    fontWeight: 600,
    fontSize: '18px',
    color: colors.neutral900,
  },
  meta: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  metaItem: {
    ...typography.bodyS,
    color: colors.neutral500,
  },
  actionArea: {
    borderTop: `1px solid ${colors.neutral200}`,
    paddingTop: '12px',
    textAlign: 'center',
  },
  orderButton: {
    display: 'inline-block',
    padding: '8px 20px',
    backgroundColor: '#7C3AED',
    color: colors.white,
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
  },
  disabledButton: {
    display: 'inline-block',
    padding: '8px 20px',
    backgroundColor: colors.neutral200,
    color: colors.neutral500,
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
  },
};
