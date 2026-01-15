/**
 * SupplierBasicStats - 최소 통계 영역
 *
 * Work Order: WO-NETURE-SUPPLIER-DASHBOARD-P2
 *
 * 허용 지표:
 * - 승인 전환율 (승인 / 전체 신청)
 * - 서비스별 신청 비중
 * - APPLICATION → ACTIVE 전환 수
 *
 * UI 규칙:
 * - 단순 바 / 칩 형태
 * - 차트 라이브러리 ❌
 * - 하단 문구: "상세 분석은 AI 요약 기능으로 제공 예정"
 */

import { BarChart3, TrendingUp, Sparkles } from 'lucide-react';

export interface BasicStatsData {
  approvalRate: {
    approved: number;
    total: number;
  };
  serviceDistribution: Array<{
    serviceId: string;
    serviceName: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  conversionCount: number;
}

interface Props {
  data: BasicStatsData;
  loading?: boolean;
}

export function SupplierBasicStats({ data, loading }: Props) {
  const approvalPercentage =
    data.approvalRate.total > 0
      ? Math.round((data.approvalRate.approved / data.approvalRate.total) * 100)
      : 0;

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <BarChart3 size={20} style={{ color: '#64748b' }} />
          <h2 style={styles.sectionTitle}>운영 지표</h2>
        </div>
        <div style={styles.grid}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ ...styles.statCard, opacity: 0.5 }}>
              <div style={styles.skeleton} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <BarChart3 size={20} style={{ color: '#64748b' }} />
        <h2 style={styles.sectionTitle}>운영 지표</h2>
        <span style={styles.badge}>판단용 정보</span>
      </div>

      <div style={styles.grid}>
        {/* Approval Rate */}
        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <TrendingUp size={16} style={{ color: '#22c55e' }} />
            <span style={styles.statLabel}>승인 전환율</span>
          </div>
          <div style={styles.statValue}>
            <span style={styles.bigNumber}>{approvalPercentage}</span>
            <span style={styles.unit}>%</span>
          </div>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${approvalPercentage}%`,
                backgroundColor: '#22c55e',
              }}
            />
          </div>
          <p style={styles.statDetail}>
            {data.approvalRate.approved} / {data.approvalRate.total} 건
          </p>
        </div>

        {/* Service Distribution */}
        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <span style={styles.statLabel}>서비스별 신청 비중</span>
          </div>
          <div style={styles.distributionBars}>
            {data.serviceDistribution.map((service) => (
              <div key={service.serviceId} style={styles.distributionItem}>
                <div style={styles.distributionHeader}>
                  <span style={styles.distributionLabel}>{service.serviceName}</span>
                  <span style={styles.distributionValue}>
                    {service.count}건 ({service.percentage}%)
                  </span>
                </div>
                <div style={styles.progressBar}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${service.percentage}%`,
                      backgroundColor: service.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conversion Count */}
        <div style={styles.statCard}>
          <div style={styles.statHeader}>
            <TrendingUp size={16} style={{ color: '#3b82f6' }} />
            <span style={styles.statLabel}>활성화 전환</span>
          </div>
          <div style={styles.statValue}>
            <span style={styles.bigNumber}>{data.conversionCount}</span>
            <span style={styles.unit}>건</span>
          </div>
          <p style={styles.statDetail}>신청 → 판매 활성화</p>
        </div>
      </div>

      {/* AI Notice */}
      <div style={styles.aiNotice}>
        <Sparkles size={16} style={{ color: '#8b5cf6' }} />
        <p style={styles.aiNoticeText}>
          상세 분석은 AI 요약 기능으로 제공 예정입니다.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '24px',
    marginBottom: '24px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
    flex: 1,
  },
  badge: {
    fontSize: '11px',
    fontWeight: 500,
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    padding: '4px 10px',
    borderRadius: '6px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginBottom: '20px',
  },
  statCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    padding: '20px',
  },
  statHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '12px',
  },
  statLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#64748b',
  },
  statValue: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
    marginBottom: '12px',
  },
  bigNumber: {
    fontSize: '36px',
    fontWeight: 700,
    color: '#1e293b',
    lineHeight: 1,
  },
  unit: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#64748b',
  },
  progressBar: {
    height: '6px',
    backgroundColor: '#e2e8f0',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  statDetail: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0,
  },
  distributionBars: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  distributionItem: {},
  distributionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  distributionLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#1e293b',
  },
  distributionValue: {
    fontSize: '12px',
    color: '#64748b',
  },
  aiNotice: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 16px',
    backgroundColor: '#faf5ff',
    borderRadius: '8px',
    border: '1px solid #e9d5ff',
  },
  aiNoticeText: {
    fontSize: '13px',
    color: '#7c3aed',
    margin: 0,
  },
  skeleton: {
    width: '100%',
    height: '120px',
    backgroundColor: '#e2e8f0',
    borderRadius: '8px',
  },
};

export default SupplierBasicStats;
