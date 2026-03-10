/**
 * PartnerCopilotDashboardPage - 파트너 AI Copilot 대시보드
 *
 * Work Order: WO-O4O-PARTNER-COPILOT-DASHBOARD-V1
 *
 * 6 Blocks:
 * 1. KPI Cards - 총 커미션, 활성 계약, 레퍼럴, 최근 클릭
 * 2. Product Performance Table
 * 3. Store Expansion
 * 4. Commission Trends
 * 5. Alerts
 * 6. AI Insight
 */

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  TrendingUp,
  DollarSign,
  FileText,
  Link2,
  Store,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Info,
  Sparkles,
} from 'lucide-react';
import {
  partnerCopilotApi,
  type CopilotKpi,
  type CopilotProductPerformance,
  type CopilotStoreExpansion,
  type CopilotCommissionTrend,
  type CopilotAlert,
  type CopilotAiInsight,
} from '../../lib/api';

function formatCurrency(amount: number): string {
  return amount.toLocaleString('ko-KR');
}

export function PartnerCopilotDashboardPage() {
  const [kpi, setKpi] = useState<CopilotKpi | null>(null);
  const [products, setProducts] = useState<CopilotProductPerformance[]>([]);
  const [stores, setStores] = useState<CopilotStoreExpansion | null>(null);
  const [trends, setTrends] = useState<CopilotCommissionTrend | null>(null);
  const [alerts, setAlerts] = useState<CopilotAlert[]>([]);
  const [aiInsight, setAiInsight] = useState<CopilotAiInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [kpiData, productsData, storesData, trendsData, alertsData] = await Promise.all([
        partnerCopilotApi.getKpi(),
        partnerCopilotApi.getProductPerformance(),
        partnerCopilotApi.getStoreExpansion(),
        partnerCopilotApi.getCommissionTrends(),
        partnerCopilotApi.getAlerts(),
      ]);
      setKpi(kpiData);
      setProducts(productsData);
      setStores(storesData);
      setTrends(trendsData);
      setAlerts(alertsData);
    } catch (error) {
      console.error('[PartnerCopilot] Failed to fetch dashboard data:', error);
    }
    setLoading(false);

    // AI insight loaded separately (may be slower)
    setAiLoading(true);
    try {
      const ai = await partnerCopilotApi.getAiSummary();
      setAiInsight(ai);
    } catch {
      // AI unavailable
    }
    setAiLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Partner Copilot</h1>
          <p style={styles.subtitle}>AI 기반 파트너 실적 인사이트</p>
        </div>
        <button onClick={fetchData} style={styles.refreshBtn} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {/* Block 1: KPI Cards */}
      <div style={styles.kpiGrid} data-copilot-kpi>
        <div style={styles.kpiCard}>
          <div style={{ ...styles.kpiIconWrap, backgroundColor: '#F0FDF4' }}>
            <DollarSign size={22} style={{ color: '#16A34A' }} />
          </div>
          <div>
            <p style={styles.kpiLabel}>총 커미션</p>
            <p style={styles.kpiValue}>
              {loading ? '-' : `${formatCurrency(kpi?.totalCommissionAmount ?? 0)}원`}
            </p>
          </div>
        </div>
        <div style={styles.kpiCard}>
          <div style={{ ...styles.kpiIconWrap, backgroundColor: '#EFF6FF' }}>
            <FileText size={22} style={{ color: '#2563EB' }} />
          </div>
          <div>
            <p style={styles.kpiLabel}>활성 계약</p>
            <p style={styles.kpiValue}>{loading ? '-' : kpi?.activeContracts ?? 0}</p>
          </div>
        </div>
        <div style={styles.kpiCard}>
          <div style={{ ...styles.kpiIconWrap, backgroundColor: '#FFF7ED' }}>
            <Link2 size={22} style={{ color: '#EA580C' }} />
          </div>
          <div>
            <p style={styles.kpiLabel}>레퍼럴 링크</p>
            <p style={styles.kpiValue}>{loading ? '-' : kpi?.totalReferrals ?? 0}</p>
          </div>
        </div>
        <div style={styles.kpiCard}>
          <div style={{ ...styles.kpiIconWrap, backgroundColor: '#F5F3FF' }}>
            <TrendingUp size={22} style={{ color: '#7C3AED' }} />
          </div>
          <div>
            <p style={styles.kpiLabel}>최근 7일 클릭</p>
            <p style={styles.kpiValue}>{loading ? '-' : kpi?.recentClicks ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Block 4: Commission Trends + Block 3: Store Expansion */}
      <div style={styles.twoCol} data-copilot-mid>
        {/* Commission Trends */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>커미션 트렌드</h2>
          {loading ? (
            <div style={styles.loadingBox}>로딩 중...</div>
          ) : trends ? (
            <div>
              <div style={styles.trendRow}>
                <span style={styles.trendLabel}>이번 주</span>
                <span style={styles.trendValue}>{formatCurrency(trends.currentAmount)}원 ({trends.currentCount}건)</span>
              </div>
              <div style={styles.trendRow}>
                <span style={styles.trendLabel}>지난 주</span>
                <span style={{ ...styles.trendValue, color: '#64748B' }}>{formatCurrency(trends.previousAmount)}원 ({trends.previousCount}건)</span>
              </div>
              <div style={{ ...styles.trendRow, borderBottom: 'none', paddingTop: '12px' }}>
                <span style={styles.trendLabel}>변화율</span>
                <span style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: trends.growthRate > 0 ? '#16A34A' : trends.growthRate < 0 ? '#DC2626' : '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  {trends.growthRate > 0 && <ArrowUpRight size={18} />}
                  {trends.growthRate < 0 && <ArrowDownRight size={18} />}
                  {trends.growthRate}%
                </span>
              </div>
            </div>
          ) : (
            <p style={{ color: '#94A3B8', fontSize: '14px' }}>데이터 없음</p>
          )}
        </div>

        {/* Store Expansion */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>매장 확장</h2>
          {loading ? (
            <div style={styles.loadingBox}>로딩 중...</div>
          ) : stores ? (
            <div>
              <div style={styles.storeMetric}>
                <Store size={18} style={{ color: '#2563EB' }} />
                <span style={styles.storeLabel}>연결된 매장</span>
                <span style={styles.storeValue}>{stores.totalStores}</span>
              </div>
              <div style={styles.storeMetric}>
                <ArrowUpRight size={18} style={{ color: '#16A34A' }} />
                <span style={styles.storeLabel}>신규 (7일)</span>
                <span style={{ ...styles.storeValue, color: '#16A34A' }}>+{stores.newStores7d}</span>
              </div>
              <div style={styles.storeMetric}>
                <FileText size={18} style={{ color: '#7C3AED' }} />
                <span style={styles.storeLabel}>계약 매장</span>
                <span style={styles.storeValue}>{stores.contractedStores}</span>
              </div>
            </div>
          ) : (
            <p style={{ color: '#94A3B8', fontSize: '14px' }}>데이터 없음</p>
          )}
        </div>
      </div>

      {/* Block 2: Product Performance */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>상품별 성과</h2>
        {loading ? (
          <div style={styles.loadingBox}>로딩 중...</div>
        ) : products.length === 0 ? (
          <div style={styles.emptyBox}>
            <DollarSign size={40} style={{ color: '#CBD5E1', marginBottom: '12px' }} />
            <p style={{ margin: 0, fontSize: '14px', color: '#64748B' }}>
              아직 상품별 성과 데이터가 없습니다.
            </p>
          </div>
        ) : (
          <div style={styles.tableWrap} data-copilot-table>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>상품명</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>주문 수</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>커미션 합계</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>평균 커미션율</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={i} style={styles.tr}>
                    <td style={styles.td}>{p.productName}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{p.orders}</td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600, color: '#16A34A' }}>
                      {formatCurrency(p.commissionTotal)}원
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', color: '#64748B' }}>
                      {p.avgCommissionRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Block 5: Alerts */}
      {alerts.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>알림</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {alerts.map((alert, i) => (
              <div key={i} style={{
                ...styles.alertItem,
                backgroundColor: alert.severity === 'warning' ? '#FEF3C7' : alert.severity === 'critical' ? '#FEE2E2' : '#EFF6FF',
                borderLeft: `4px solid ${alert.severity === 'warning' ? '#F59E0B' : alert.severity === 'critical' ? '#EF4444' : '#3B82F6'}`,
              }}>
                {alert.severity === 'warning' ? <AlertTriangle size={16} style={{ color: '#F59E0B', flexShrink: 0 }} /> : <Info size={16} style={{ color: '#3B82F6', flexShrink: 0 }} />}
                <span style={{ fontSize: '14px', color: '#1E293B' }}>{alert.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Block 6: AI Insight */}
      <div style={styles.section}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Sparkles size={20} style={{ color: '#7C3AED' }} />
          <h2 style={{ ...styles.sectionTitle, margin: 0 }}>AI 인사이트</h2>
          {aiInsight?.meta && (
            <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: 'auto' }}>
              {aiInsight.meta.provider} · {aiInsight.meta.model}
            </span>
          )}
        </div>
        {aiLoading ? (
          <div style={styles.loadingBox}>AI 분석 중...</div>
        ) : aiInsight ? (
          <div style={styles.aiCard}>
            <p style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#1E293B', lineHeight: 1.6 }}>
              {aiInsight.insight.summary}
            </p>
            {aiInsight.insight.recommendedActions.length > 0 && (
              <div>
                <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#475569' }}>추천 조치</p>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {aiInsight.insight.recommendedActions.map((action, i) => (
                    <li key={i} style={{ fontSize: '14px', color: '#334155', marginBottom: '4px' }}>{action}</li>
                  ))}
                </ul>
              </div>
            )}
            <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '12px', color: '#94A3B8' }}>
              <span>리스크: {aiInsight.insight.riskLevel}</span>
              <span>신뢰도: {Math.round(aiInsight.insight.confidenceScore * 100)}%</span>
            </div>
          </div>
        ) : (
          <div style={styles.emptyBox}>
            <Sparkles size={40} style={{ color: '#CBD5E1', marginBottom: '12px' }} />
            <p style={{ margin: 0, fontSize: '14px', color: '#64748B' }}>
              AI 인사이트를 생성할 수 없습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== Styles ====================

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
  },
  title: {
    fontSize: '26px',
    fontWeight: 700,
    color: '#1E293B',
    margin: '0 0 6px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748B',
    margin: 0,
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    backgroundColor: '#F1F5F9',
    color: '#475569',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  kpiIconWrap: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  kpiLabel: {
    fontSize: '13px',
    color: '#64748B',
    margin: '0 0 4px 0',
  },
  kpiValue: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#1E293B',
    margin: 0,
    lineHeight: 1.2,
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '24px',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    padding: '24px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1E293B',
    margin: '0 0 16px 0',
  },
  trendRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #F1F5F9',
  },
  trendLabel: {
    fontSize: '14px',
    color: '#64748B',
  },
  trendValue: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1E293B',
  },
  storeMetric: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 0',
    borderBottom: '1px solid #F1F5F9',
  },
  storeLabel: {
    fontSize: '14px',
    color: '#64748B',
    flex: 1,
  },
  storeValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1E293B',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1E293B',
    margin: '0 0 16px 0',
  },
  loadingBox: {
    textAlign: 'center' as const,
    padding: '40px',
    color: '#94A3B8',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
  },
  emptyBox: {
    textAlign: 'center' as const,
    padding: '40px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  tableWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    padding: '12px 16px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748B',
    textTransform: 'uppercase' as const,
    borderBottom: '1px solid #E2E8F0',
    backgroundColor: '#F8FAFC',
    textAlign: 'left' as const,
    letterSpacing: '0.05em',
  },
  tr: {
    borderBottom: '1px solid #F1F5F9',
  },
  td: {
    padding: '14px 16px',
    fontSize: '14px',
    color: '#1E293B',
  },
  alertItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    borderRadius: '8px',
  },
  aiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    padding: '24px',
  },
};

// Responsive CSS injection
const RESPONSIVE_CSS = `
@media (max-width: 768px) {
  [data-copilot-kpi] { grid-template-columns: repeat(2, 1fr) !important; }
  [data-copilot-mid] { grid-template-columns: 1fr !important; }
  [data-copilot-table] { overflow-x: auto; }
}
`;

if (typeof document !== 'undefined') {
  const styleId = 'partner-copilot-dashboard-responsive';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = RESPONSIVE_CSS;
    document.head.appendChild(styleEl);
  }
}
