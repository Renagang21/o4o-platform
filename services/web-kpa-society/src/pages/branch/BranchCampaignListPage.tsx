/**
 * BranchCampaignListPage - 분회 공동구매 목록
 *
 * WO-KPA-CAMPAIGN-GROUPBUY-VIEW-API-V1
 * 서버 조인 API(/campaign-groupbuys) 사용 — 프론트 조인 제거.
 * 참여는 기존 branchApi.participateCampaign() 사용 (listingId 기반).
 */

import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState } from '../../components/common';
import { useBranchContext } from '../../contexts/BranchContext';
import { campaignApi } from '../../api/campaignApi';
import type { CampaignGroupbuyView } from '../../api/campaignApi';
import { colors, borderRadius } from '../../styles/theme';

export function BranchCampaignListPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { basePath } = useBranchContext();
  const [items, setItems] = useState<CampaignGroupbuyView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [branchId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await campaignApi.getCampaignGroupbuys();
      setItems(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  if (loading) {
    return <LoadingSpinner message="공동구매 목록을 불러오는 중..." />;
  }

  if (error) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="⚠️"
          title="오류가 발생했습니다"
          description={error}
          action={{ label: '다시 시도', onClick: loadData }}
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
          { label: '공동구매' },
        ]}
      />

      {/* Tabs */}
      <div style={styles.tabs}>
        <Link to={`${basePath}/groupbuy`} style={{ ...styles.tab, ...styles.tabActive }}>
          진행중
        </Link>
        <Link to={`${basePath}/groupbuy/history`} style={styles.tab}>
          참여 내역
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="🛒"
          title="진행중인 공동구매가 없습니다"
          description="새로운 공동구매가 시작되면 알려드리겠습니다."
        />
      ) : (
        <div style={styles.grid}>
          {items.map((item) => (
            <Link
              key={`${item.campaignId}-${item.productId}`}
              to={`${basePath}/groupbuy/${item.listingId}`}
              style={styles.card}
            >
              <div style={styles.cardImage}>
                <span style={styles.cardImagePlaceholder}>🛍️</span>
              </div>
              <div style={styles.cardContent}>
                <div style={styles.cardHeader}>
                  <span style={styles.statusBadge}>진행중</span>
                  <span style={styles.endDate}>~{formatDate(item.endAt)}</span>
                </div>
                <h3 style={styles.cardTitle}>{item.campaignName}</h3>
                <div style={styles.productName}>{item.productName}</div>
                <div style={styles.cardPrice}>{Number(item.campaignPrice).toLocaleString()}원</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
  },
  tab: {
    padding: '10px 20px',
    backgroundColor: colors.neutral100,
    color: colors.neutral600,
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
  tabActive: {
    backgroundColor: colors.primary,
    color: colors.white,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    textDecoration: 'none',
    border: `1px solid ${colors.neutral200}`,
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  cardImage: {
    height: '140px',
    backgroundColor: colors.neutral100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImagePlaceholder: {
    fontSize: '48px',
  },
  cardContent: {
    padding: '16px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  statusBadge: {
    padding: '4px 10px',
    backgroundColor: colors.accentGreen,
    color: colors.white,
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
  },
  endDate: {
    fontSize: '13px',
    color: colors.neutral500,
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '4px',
    lineHeight: 1.4,
  },
  productName: {
    fontSize: '13px',
    color: colors.neutral500,
    marginBottom: '8px',
  },
  cardPrice: {
    fontSize: '18px',
    fontWeight: 700,
    color: colors.primary,
  },
};
