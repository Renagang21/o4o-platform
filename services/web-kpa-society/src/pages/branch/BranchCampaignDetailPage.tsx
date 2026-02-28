/**
 * BranchCampaignDetailPage - 분회 공동구매 상세
 *
 * WO-KPA-CAMPAIGN-GROUPBUY-VIEW-API-V1
 * URL :id = listingId (기존 라우트 호환).
 * 서버 조인 API에서 listingId로 매칭하여 캠페인 정보 표시.
 * 참여(주문)는 branchApi.participateCampaign() 사용 — 서버가 campaignPrice 자동 적용.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { useAuth } from '../../contexts';
import { useBranchContext } from '../../contexts/BranchContext';
import { branchApi } from '../../api/branch';
import { campaignApi } from '../../api/campaignApi';
import type { CampaignGroupbuyView } from '../../api/campaignApi';
import { colors } from '../../styles/theme';

export function BranchCampaignDetailPage() {
  const { branchId, id } = useParams<{ branchId: string; id: string }>();
  const { basePath } = useBranchContext();
  const { user } = useAuth();
  const [item, setItem] = useState<CampaignGroupbuyView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [branchId, id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 서버 조인 API에서 listingId로 매칭
      const res = await campaignApi.getCampaignGroupbuys();
      const match = res.data.find(r => r.listingId === id);
      setItem(match || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleParticipate = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      setSubmitting(true);
      await branchApi.participateCampaign(branchId!, id!, { quantity });
      alert('참여가 완료되었습니다.');
      loadData();
    } catch (err) {
      alert('참여에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  if (loading) {
    return <LoadingSpinner message="공동구매 정보를 불러오는 중..." />;
  }

  if (error || !item) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="⚠️"
          title="공동구매를 찾을 수 없습니다"
          description={error || '요청하신 공동구매가 존재하지 않거나 캠페인이 종료되었습니다.'}
          action={{ label: '목록으로', onClick: () => window.history.back() }}
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title="공동구매"
        breadcrumb={[
          { label: '홈', href: `${basePath}` },
          { label: '공동구매', href: `${basePath}/groupbuy` },
          { label: item.campaignName },
        ]}
      />

      <div style={styles.layout}>
        {/* Left: Image */}
        <div style={styles.imageSection}>
          <div style={styles.image}>
            <span style={styles.imagePlaceholder}>🛍️</span>
          </div>
        </div>

        {/* Right: Info */}
        <div style={styles.infoSection}>
          <span style={{
            ...styles.statusBadge,
            backgroundColor: colors.accentGreen,
          }}>
            진행중
          </span>
          <h1 style={styles.title}>{item.campaignName}</h1>
          <div style={styles.productName}>{item.productName}</div>
          <div style={styles.price}>{Number(item.campaignPrice).toLocaleString()}원</div>

          {/* Dates */}
          <div style={styles.dates}>
            <div style={styles.dateItem}>
              <span style={styles.dateLabel}>시작일</span>
              <span style={styles.dateValue}>{formatDate(item.startAt)}</span>
            </div>
            <div style={styles.dateItem}>
              <span style={styles.dateLabel}>종료일</span>
              <span style={styles.dateValue}>{formatDate(item.endAt)}</span>
            </div>
          </div>

          {/* Participate */}
          <div style={styles.participateSection}>
            <div style={styles.quantityControl}>
              <button
                style={styles.quantityBtn}
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                -
              </button>
              <span style={styles.quantity}>{quantity}</span>
              <button
                style={styles.quantityBtn}
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </button>
            </div>
            <button
              style={styles.participateButton}
              onClick={handleParticipate}
              disabled={submitting}
            >
              {submitting ? '처리 중...' : '참여하기'}
            </button>
          </div>
        </div>
      </div>

      {/* Description */}
      <Card padding="large" style={{ marginTop: '32px' }}>
        <h2 style={styles.sectionTitle}>상세 정보</h2>
        <div style={styles.description}>
          {item.campaignDescription || '상세 정보가 없습니다.'}
        </div>
      </Card>

      <div style={styles.actions}>
        <Link to={`${basePath}/groupbuy`} style={styles.backButton}>
          ← 목록으로
        </Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '40px',
  },
  imageSection: {},
  image: {
    aspectRatio: '1',
    backgroundColor: colors.neutral100,
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholder: {
    fontSize: '80px',
  },
  infoSection: {},
  statusBadge: {
    display: 'inline-block',
    padding: '6px 14px',
    color: colors.white,
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '4px',
    lineHeight: 1.4,
  },
  productName: {
    fontSize: '14px',
    color: colors.neutral500,
    marginBottom: '12px',
  },
  price: {
    fontSize: '28px',
    fontWeight: 700,
    color: colors.primary,
    marginBottom: '24px',
  },
  dates: {
    display: 'flex',
    gap: '20px',
    marginBottom: '24px',
  },
  dateItem: {
    flex: 1,
    padding: '14px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
  dateLabel: {
    display: 'block',
    fontSize: '12px',
    color: colors.neutral500,
    marginBottom: '4px',
  },
  dateValue: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral900,
  },
  participateSection: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  quantityControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 16px',
    backgroundColor: colors.neutral100,
    borderRadius: '8px',
  },
  quantityBtn: {
    width: '32px',
    height: '32px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    fontSize: '16px',
    fontWeight: 600,
    minWidth: '24px',
    textAlign: 'center' as const,
  },
  participateButton: {
    flex: 1,
    padding: '16px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '16px',
  },
  description: {
    fontSize: '15px',
    lineHeight: 1.8,
    color: colors.neutral700,
    whiteSpace: 'pre-wrap' as const,
  },
  actions: {
    marginTop: '24px',
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
};
