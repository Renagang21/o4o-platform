/**
 * GroupbuyDetailPage - 공동구매 상품 상세 페이지
 *
 * WO-KPA-GROUPBUY-PAGE-V1: 캠페인 모델 → 상품 상세로 전환
 * OrganizationProductListing 기반
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { groupbuyApi } from '../../api';
import { useAuth } from '../../contexts';
import { colors, typography } from '../../styles/theme';
import type { GroupbuyProduct } from '../../types';

export function GroupbuyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<GroupbuyProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasStore = user?.pharmacistRole === 'pharmacy_owner';

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await groupbuyApi.getGroupbuyProduct(id!);
      setProduct(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '상품을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return '가격 미정';
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR');
  };

  if (loading) {
    return <LoadingSpinner message="상품 정보를 불러오는 중..." />;
  }

  if (error || !product) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="⚠️"
          title="상품을 찾을 수 없습니다"
          description={error || '삭제되었거나 존재하지 않는 상품입니다.'}
          action={{ label: '목록으로', onClick: () => navigate('/groupbuy') }}
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title=""
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '공동구매', href: '/groupbuy' },
          { label: product.product_name },
        ]}
      />

      <div style={styles.layout}>
        <div style={styles.main}>
          {/* 이미지 */}
          <div style={styles.imageSection}>
            <div style={styles.imagePlaceholder}>🛍️</div>
          </div>

          {/* 상품 정보 */}
          <Card padding="large" style={{ marginTop: '24px' }}>
            <h2 style={styles.sectionTitle}>상품 정보</h2>
            <div style={styles.infoGrid}>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>상품 ID</span>
                <span style={styles.infoValue}>{product.external_product_id}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>서비스</span>
                <span style={styles.serviceBadge}>공동구매</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>등록일</span>
                <span style={styles.infoValue}>{formatDate(product.created_at)}</span>
              </div>
              {product.product_metadata && Object.keys(product.product_metadata).length > 0 && (
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>추가 정보</span>
                  <span style={styles.infoValue}>
                    {Object.entries(product.product_metadata)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ')}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* 사이드바 */}
        <div style={styles.sidebar}>
          <Card padding="large">
            <span style={styles.badge}>공동구매</span>
            <h1 style={styles.title}>{product.product_name}</h1>

            <div style={styles.priceSection}>
              <span style={styles.priceLabel}>판매 가격</span>
              <span style={styles.price}>{formatPrice(product.retail_price)}</span>
            </div>

            <div style={styles.actionSection}>
              {hasStore ? (
                <button style={styles.orderButton} onClick={() => alert('주문 기능은 준비 중입니다.')}>
                  주문하기
                </button>
              ) : user ? (
                <div style={styles.noStoreNotice}>
                  <p style={styles.noStoreText}>매장 등록 후 참여 가능합니다</p>
                  <button
                    style={styles.storeRegisterButton}
                    onClick={() => navigate('/store')}
                  >
                    매장 등록하기
                  </button>
                </div>
              ) : (
                <div style={styles.noStoreNotice}>
                  <p style={styles.noStoreText}>로그인 후 이용할 수 있습니다</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 400px',
    gap: '32px',
  },
  main: {},
  sidebar: {
    position: 'sticky',
    top: '24px',
    height: 'fit-content',
  },
  imageSection: {
    backgroundColor: colors.neutral100,
    borderRadius: '12px',
    overflow: 'hidden',
  },
  imagePlaceholder: {
    width: '100%',
    height: '400px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '80px',
  },
  sectionTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    marginBottom: '16px',
  },
  infoGrid: {},
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  infoLabel: {
    fontSize: '14px',
    color: colors.neutral500,
  },
  infoValue: {
    fontSize: '14px',
    color: colors.neutral800,
    fontWeight: 500,
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#7C3AED',
    backgroundColor: '#EDE9FE',
    marginBottom: '12px',
  },
  serviceBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#7C3AED',
    backgroundColor: '#EDE9FE',
  },
  title: {
    ...typography.headingL,
    color: colors.neutral900,
    margin: '0 0 20px',
  },
  priceSection: {
    padding: '16px 0',
    borderTop: `1px solid ${colors.neutral200}`,
    borderBottom: `1px solid ${colors.neutral200}`,
    marginBottom: '24px',
  },
  priceLabel: {
    display: 'block',
    fontSize: '13px',
    color: colors.neutral500,
    marginBottom: '4px',
  },
  price: {
    fontSize: '28px',
    fontWeight: 700,
    color: colors.neutral900,
  },
  actionSection: {},
  orderButton: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#7C3AED',
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  noStoreNotice: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
  noStoreText: {
    color: colors.neutral500,
    fontSize: '14px',
    margin: '0 0 12px',
  },
  storeRegisterButton: {
    padding: '10px 24px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
};
