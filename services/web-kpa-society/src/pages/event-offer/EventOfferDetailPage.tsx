/**
 * GroupbuyDetailPage - 이벤트 상품 상세 페이지
 *
 * WO-KPA-GROUPBUY-PAGE-V1: 캠페인 모델 → 상품 상세로 전환
 * OrganizationProductListing 기반
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { eventOfferApi } from '../../api';
import { useAuth } from '../../contexts';
import { colors, typography } from '../../styles/theme';
import type { EventOfferItem } from '../../types';
import { calcFreeShippingProgress, formatWon } from '../../utils/freeShipping';

export function EventOfferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<EventOfferItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participating, setParticipating] = useState(false);

  const hasStore = user?.isStoreOwner === true;

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await eventOfferApi.getEventOfferProduct(id!);
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
          action={{ label: '목록으로', onClick: () => navigate('/event-offers') }}
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
          { label: '이벤트', href: '/event-offers' },
          { label: product.productName },
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
                <span style={styles.infoLabel}>공급업체</span>
                <span style={styles.infoValue}>{product.supplierName}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>서비스</span>
                <span style={styles.serviceBadge}>이벤트</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>등록일</span>
                <span style={styles.infoValue}>{formatDate(product.createdAt)}</span>
              </div>
              {product.startAt && (
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>시작일</span>
                  <span style={styles.infoValue}>{formatDate(product.startAt)}</span>
                </div>
              )}
              {product.endAt && (
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>종료일</span>
                  <span style={styles.infoValue}>{formatDate(product.endAt)}</span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* 사이드바 */}
        <div style={styles.sidebar}>
          <Card padding="large">
            <span style={styles.badge}>이벤트</span>
            <h1 style={styles.title}>{product.productName}</h1>

            <div style={styles.priceSection}>
              <span style={styles.priceLabel}>판매 가격</span>
              <span style={styles.price}>{formatPrice(product.unitPrice)}</span>
            </div>

            {/* 무료배송 안내 — WO-O4O-NETURE-SUPPLIER-FREE-SHIPPING-PROGRESS-UI-V1 */}
            <FreeShippingNotice
              unitPrice={product.unitPrice}
              policy={product.shippingPolicy}
            />

            <div style={styles.actionSection}>
              {hasStore ? (
                <button
                  style={{ ...styles.orderButton, opacity: participating ? 0.7 : 1 }}
                  disabled={participating}
                  onClick={async () => {
                    if (participating) return;
                    setParticipating(true);
                    try {
                      await eventOfferApi.participate(id!, 1);
                      toast.success('이벤트 참여가 완료되었습니다.');
                      navigate('/store-hub/event-offers');
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : '이벤트 참여에 실패했습니다.');
                    } finally {
                      setParticipating(false);
                    }
                  }}
                >
                  {participating ? '참여 중...' : '주문하기'}
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

// 무료배송 안내 (읽기 전용 표시) — WO-O4O-NETURE-SUPPLIER-FREE-SHIPPING-PROGRESS-UI-V1
function FreeShippingNotice({
  unitPrice,
  policy,
}: {
  unitPrice: number | null;
  policy?: { baseShippingFee: number | null; freeShippingThreshold: number | null } | null;
}) {
  // 이 화면은 수량 1로 참여하므로 주문금액 = 단가.
  const subtotal = Number(unitPrice ?? 0);
  const progress = calcFreeShippingProgress({
    subtotal,
    baseShippingFee: policy?.baseShippingFee ?? null,
    freeShippingThreshold: policy?.freeShippingThreshold ?? null,
  });

  const accent = progress.freeShippingApplied ? '#15803d' : '#7C3AED';

  return (
    <div style={styles.shipBox}>
      {progress.hasThreshold && (
        <>
          <div style={styles.shipRow}>
            <span style={styles.shipLabel}>무료배송 기준</span>
            <span style={styles.shipValue}>{formatWon(policy?.freeShippingThreshold)}</span>
          </div>
          <div style={styles.shipRow}>
            <span style={styles.shipLabel}>현재 주문금액</span>
            <span style={styles.shipValue}>{formatWon(subtotal)}</span>
          </div>
        </>
      )}
      <p style={{ ...styles.shipMessage, color: accent }}>{progress.message}</p>
      <p style={styles.shipNote}>
        이벤트 오퍼 상품도 같은 공급자의 주문금액에 포함됩니다. 다른 공급자의 상품 금액은 이 공급자의 무료배송 기준에 포함되지 않습니다.
      </p>
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
  // WO-O4O-NETURE-SUPPLIER-FREE-SHIPPING-PROGRESS-UI-V1
  shipBox: {
    backgroundColor: colors.neutral50,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    padding: '14px 16px',
    marginBottom: '20px',
  },
  shipRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  shipLabel: {
    fontSize: '13px',
    color: colors.neutral500,
  },
  shipValue: {
    fontSize: '13px',
    fontWeight: 600,
    color: colors.neutral800,
  },
  shipMessage: {
    fontSize: '14px',
    fontWeight: 600,
    margin: '8px 0 0 0',
  },
  shipNote: {
    fontSize: '12px',
    color: colors.neutral500,
    margin: '8px 0 0 0',
    lineHeight: 1.5,
  },
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
