/**
 * BranchCampaignStatusPage — KPA-b (지부) 공동구매 수량 현황
 *
 * WO-KPA-CAMPAIGN-STATUS-CLARITY-V1
 * 지부 관리자가 분회별 공동구매 수량을 read-only로 조회.
 * totalAmount 표시 금지 (NETURE-DOMAIN-ARCHITECTURE-FREEZE-V1 §7.3)
 *
 * 집계 정의:
 *   totalOrders  = 참여(주문) 건수 (status='PAID' 기준)
 *   totalQuantity = 총 수량 (동일 기준 SUM(quantity))
 */

import { useState, useEffect } from 'react';
import { campaignApi } from '../../api/campaignApi';
import type { Campaign, CampaignAggregation } from '../../api/campaignApi';
import { colors } from '../../styles/theme';

export function BranchCampaignStatusPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [aggregations, setAggregations] = useState<CampaignAggregation[]>([]);
  const [loading, setLoading] = useState(true);
  const [aggLoading, setAggLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  useEffect(() => {
    if (selectedCampaignId) {
      loadAggregations(selectedCampaignId);
    }
  }, [selectedCampaignId]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await campaignApi.getActiveCampaigns();
      setCampaigns(res.data);
      if (res.data.length > 0) {
        setSelectedCampaignId(res.data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '캠페인 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadAggregations = async (campaignId: string) => {
    try {
      setAggLoading(true);
      const res = await campaignApi.getCampaignAggregations(campaignId);
      setAggregations(res.data);
    } catch {
      setAggregations([]);
    } finally {
      setAggLoading(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  // 합계 계산
  const totalOrders = aggregations.reduce((sum, a) => sum + a.totalOrders, 0);
  const totalQuantity = aggregations.reduce((sum, a) => sum + a.totalQuantity, 0);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>캠페인 목록을 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <span>⚠️ {error}</span>
          <button onClick={loadCampaigns} style={styles.retryButton}>다시 시도</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.pageTitle}>공동구매 현황</h1>
      <p style={styles.pageDescription}>활성 캠페인의 분회별 주문 수량을 확인합니다.</p>

      {campaigns.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>🛒</span>
          <h3 style={styles.emptyTitle}>진행중인 공동구매가 없습니다</h3>
          <p style={styles.emptyDescription}>활성 캠페인이 시작되면 현황이 표시됩니다.</p>
        </div>
      ) : (
        <>
          {/* 캠페인 선택 */}
          <div style={styles.selectWrapper}>
            <label style={styles.selectLabel}>캠페인 선택</label>
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              style={styles.select}
            >
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* 캠페인 정보 */}
          {selectedCampaign && (
            <div style={styles.campaignInfo}>
              <div style={styles.campaignHeader}>
                <h2 style={styles.campaignName}>{selectedCampaign.name}</h2>
                <span style={styles.activeBadge}>진행중</span>
              </div>
              <div style={styles.campaignDates}>
                {formatDate(selectedCampaign.startAt)} ~ {formatDate(selectedCampaign.endAt)}
              </div>
              {selectedCampaign.description && (
                <div style={styles.campaignDesc}>{selectedCampaign.description}</div>
              )}
            </div>
          )}

          {/* 집계 테이블 */}
          <div style={styles.tableWrapper}>
            {aggLoading ? (
              <div style={styles.loading}>집계 데이터를 불러오는 중...</div>
            ) : aggregations.length === 0 ? (
              <div style={styles.noData}>아직 주문 데이터가 없습니다.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>상품 ID</th>
                    <th style={{ ...styles.th, textAlign: 'right' as const }}>주문건수</th>
                    <th style={{ ...styles.th, textAlign: 'right' as const }}>수량</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregations.map(agg => (
                    <tr key={agg.id} style={styles.tr}>
                      <td style={styles.td}>{agg.productId.slice(0, 8)}...</td>
                      <td style={{ ...styles.td, textAlign: 'right' as const }}>{agg.totalOrders}건</td>
                      <td style={{ ...styles.td, textAlign: 'right' as const }}>{agg.totalQuantity}개</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={styles.totalRow}>
                    <td style={{ ...styles.td, fontWeight: 700 }}>합계</td>
                    <td style={{ ...styles.td, textAlign: 'right' as const, fontWeight: 700 }}>{totalOrders}건</td>
                    <td style={{ ...styles.td, textAlign: 'right' as const, fontWeight: 700 }}>{totalQuantity}개</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* 집계 기준 안내 (WO-KPA-CAMPAIGN-STATUS-CLARITY-V1) */}
          <p style={styles.footnote}>
            수량은 참여 주문 기준 집계이며, 금액은 표시하지 않습니다.
          </p>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '32px',
    maxWidth: '900px',
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: colors.neutral900,
    marginBottom: '8px',
  },
  pageDescription: {
    fontSize: '14px',
    color: colors.neutral500,
    marginBottom: '32px',
  },
  loading: {
    padding: '40px',
    textAlign: 'center' as const,
    color: colors.neutral500,
    fontSize: '14px',
  },
  error: {
    padding: '20px',
    backgroundColor: '#FEF2F2',
    borderRadius: '8px',
    color: '#DC2626',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  retryButton: {
    padding: '8px 16px',
    backgroundColor: colors.white,
    border: '1px solid #DC2626',
    borderRadius: '6px',
    color: '#DC2626',
    cursor: 'pointer',
    fontSize: '13px',
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center' as const,
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '8px',
  },
  emptyDescription: {
    fontSize: '14px',
    color: colors.neutral500,
  },
  selectWrapper: {
    marginBottom: '24px',
  },
  selectLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: colors.neutral700,
    marginBottom: '6px',
  },
  select: {
    width: '100%',
    maxWidth: '400px',
    padding: '10px 14px',
    fontSize: '14px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    backgroundColor: colors.white,
    color: colors.neutral900,
  },
  campaignInfo: {
    padding: '20px',
    backgroundColor: colors.neutral50,
    borderRadius: '12px',
    marginBottom: '24px',
  },
  campaignHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  campaignName: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  activeBadge: {
    padding: '4px 10px',
    backgroundColor: colors.accentGreen,
    color: colors.white,
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
  },
  campaignDates: {
    fontSize: '14px',
    color: colors.neutral500,
    marginBottom: '8px',
  },
  campaignDesc: {
    fontSize: '14px',
    color: colors.neutral700,
    lineHeight: 1.5,
  },
  tableWrapper: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    border: `1px solid ${colors.neutral200}`,
    overflow: 'hidden',
  },
  noData: {
    padding: '40px',
    textAlign: 'center' as const,
    color: colors.neutral500,
    fontSize: '14px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    padding: '12px 16px',
    fontSize: '13px',
    fontWeight: 600,
    color: colors.neutral500,
    backgroundColor: colors.neutral50,
    borderBottom: `1px solid ${colors.neutral200}`,
    textAlign: 'left' as const,
  },
  tr: {
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  td: {
    padding: '12px 16px',
    fontSize: '14px',
    color: colors.neutral900,
  },
  totalRow: {
    backgroundColor: colors.neutral50,
  },
  footnote: {
    marginTop: '12px',
    fontSize: '13px',
    color: colors.neutral500,
    lineHeight: 1.5,
  },
};
