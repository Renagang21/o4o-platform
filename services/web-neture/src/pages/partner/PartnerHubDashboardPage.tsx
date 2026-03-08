/**
 * PartnerHubDashboardPage - 파트너 HUB 대시보드
 *
 * Work Order: WO-O4O-PARTNER-HUB-DASHBOARD-V1
 *
 * KPI: 총 판매 건수, 총 커미션, 정산 가능 금액, 지급 완료 금액
 * Table: 최근 커미션 내역 (주문번호 / 공급자 / 주문금액 / 커미션율 / 커미션 / 상태 / 날짜)
 * Data Source: partnerCommissionApi (기존 API 활용)
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  CreditCard,
  CheckCircle,
  RefreshCw,
  ShoppingBag,
  Link2,
  Wallet,
  ArrowRight,
} from 'lucide-react';
import {
  partnerCommissionApi,
  type PartnerCommissionKpi,
  type Commission,
} from '../../lib/api';

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: '대기',   bg: '#FEF3C7', color: '#92400E' },
  approved:  { label: '승인',   bg: '#DBEAFE', color: '#1E40AF' },
  paid:      { label: '지급완료', bg: '#D1FAE5', color: '#065F46' },
  cancelled: { label: '취소',   bg: '#F1F5F9', color: '#64748B' },
};

function formatCurrency(amount: number): string {
  return amount.toLocaleString('ko-KR');
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function PartnerHubDashboardPage() {
  const [kpi, setKpi] = useState<PartnerCommissionKpi | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [kpiData, commissionsData] = await Promise.all([
        partnerCommissionApi.getKpi(),
        partnerCommissionApi.getCommissions({ limit: 10 }),
      ]);
      setKpi(kpiData);
      setCommissions(commissionsData.data);
    } catch (error) {
      console.error('[Partner HUB] Failed to fetch dashboard data:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalSales = kpi ? kpi.pending_count + kpi.paid_count : 0;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Partner HUB Dashboard</h1>
          <p style={styles.subtitle}>판매 현황과 커미션을 한눈에 확인하세요</p>
        </div>
        <button onClick={fetchData} style={styles.refreshBtn} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {/* KPI Cards */}
      <div style={styles.kpiGrid} data-partner-hub-kpi>
        <div style={styles.kpiCard}>
          <div style={{ ...styles.kpiIconWrap, backgroundColor: '#EFF6FF' }}>
            <TrendingUp size={22} style={{ color: '#2563EB' }} />
          </div>
          <div>
            <p style={styles.kpiLabel}>총 판매 건수</p>
            <p style={styles.kpiValue}>{loading ? '-' : totalSales.toLocaleString()}</p>
          </div>
        </div>
        <div style={styles.kpiCard}>
          <div style={{ ...styles.kpiIconWrap, backgroundColor: '#F0FDF4' }}>
            <DollarSign size={22} style={{ color: '#16A34A' }} />
          </div>
          <div>
            <p style={styles.kpiLabel}>총 커미션</p>
            <p style={styles.kpiValue}>
              {loading ? '-' : `${formatCurrency(kpi?.total_amount ?? 0)}원`}
            </p>
          </div>
        </div>
        <Link to="/partner/settlements" style={{ ...styles.kpiCard, textDecoration: 'none', cursor: 'pointer' }}>
          <div style={{ ...styles.kpiIconWrap, backgroundColor: '#FFF7ED' }}>
            <CreditCard size={22} style={{ color: '#EA580C' }} />
          </div>
          <div>
            <p style={styles.kpiLabel}>정산 가능 금액</p>
            <p style={styles.kpiValue}>
              {loading ? '-' : `${formatCurrency(kpi?.pending_amount ?? 0)}원`}
            </p>
          </div>
        </Link>
        <div style={styles.kpiCard}>
          <div style={{ ...styles.kpiIconWrap, backgroundColor: '#F5F3FF' }}>
            <CheckCircle size={22} style={{ color: '#7C3AED' }} />
          </div>
          <div>
            <p style={styles.kpiLabel}>지급 완료 금액</p>
            <p style={styles.kpiValue}>
              {loading ? '-' : `${formatCurrency(kpi?.paid_amount ?? 0)}원`}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={styles.quickActions} data-partner-hub-quick>
        <Link to="/partner/products" style={styles.quickLink}>
          <ShoppingBag size={16} />
          Browse Products
          <ArrowRight size={14} style={{ marginLeft: 'auto' }} />
        </Link>
        <Link to="/partner/links" style={styles.quickLink}>
          <Link2 size={16} />
          Create Referral Link
          <ArrowRight size={14} style={{ marginLeft: 'auto' }} />
        </Link>
        <Link to="/partner/settlements" style={styles.quickLink}>
          <Wallet size={16} />
          View Settlements
          <ArrowRight size={14} style={{ marginLeft: 'auto' }} />
        </Link>
      </div>

      {/* Recent Commissions */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>최근 커미션 내역</h2>
          <Link to="/partner/settlements" style={styles.viewAll}>
            전체 보기 <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div style={styles.loadingBox}>로딩 중...</div>
        ) : commissions.length === 0 ? (
          <div style={styles.emptyBox}>
            <DollarSign size={40} style={{ color: '#CBD5E1', marginBottom: '12px' }} />
            <p style={{ margin: 0, fontSize: '14px', color: '#64748B' }}>
              아직 커미션 내역이 없습니다.
            </p>
            <Link to="/partner/products" style={{ marginTop: '12px', fontSize: '14px', color: '#2563EB', textDecoration: 'none', fontWeight: 500 }}>
              Products에서 제품 추천 시작하기 &rarr;
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div style={styles.tableWrap} data-partner-hub-table>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>주문번호</th>
                    <th style={styles.th}>공급자</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>커미션</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>상태</th>
                    <th style={styles.th}>날짜</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c) => {
                    const status = STATUS_MAP[c.status] || STATUS_MAP.pending;
                    return (
                      <tr key={c.id} style={styles.tr}>
                        <td style={styles.td}>
                          <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#1E293B' }}>
                            {c.order_number}
                          </span>
                        </td>
                        <td style={styles.td}>{c.supplier_name || '-'}</td>
                        <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600, color: '#16A34A' }}>
                          {formatCurrency(c.commission_amount)}원
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            backgroundColor: status.bg,
                            color: status.color,
                          }}>
                            {status.label}
                          </span>
                        </td>
                        <td style={{ ...styles.td, color: '#64748B', fontSize: '13px' }}>
                          {formatDate(c.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div style={styles.mobileCards} data-partner-hub-cards>
              {commissions.map((c) => {
                const status = STATUS_MAP[c.status] || STATUS_MAP.pending;
                return (
                  <div key={c.id} style={styles.mobileCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>
                        {c.order_number}
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: status.bg,
                        color: status.color,
                      }}>
                        {status.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B', marginBottom: '4px' }}>
                      <span>{c.supplier_name || '-'}</span>
                      <span>{formatDate(c.created_at)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#16A34A' }}>
                        {formatCurrency(c.commission_amount)}원
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
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
  quickActions: {
    display: 'flex',
    gap: '12px',
    marginBottom: '32px',
  },
  quickLink: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 18px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '10px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    color: '#475569',
    transition: 'border-color 0.2s',
  },
  section: {
    marginBottom: '24px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1E293B',
    margin: 0,
  },
  viewAll: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#2563EB',
    textDecoration: 'none',
  },
  loadingBox: {
    textAlign: 'center',
    padding: '60px',
    color: '#94A3B8',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
  },
  emptyBox: {
    textAlign: 'center',
    padding: '60px 40px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    display: 'flex',
    flexDirection: 'column',
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
    borderCollapse: 'collapse',
  },
  th: {
    padding: '12px 16px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748B',
    textTransform: 'uppercase' as const,
    borderBottom: '1px solid #E2E8F0',
    backgroundColor: '#F8FAFC',
    textAlign: 'left',
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
  mobileCards: {
    display: 'none',
  },
  mobileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    padding: '16px',
  },
};

// Responsive CSS injection for mobile
const RESPONSIVE_CSS = `
@media (max-width: 768px) {
  [data-partner-hub-table] { display: none !important; }
  [data-partner-hub-cards] { display: flex !important; flex-direction: column; gap: 12px; }
}
@media (max-width: 640px) {
  [data-partner-hub-kpi] {
    grid-template-columns: repeat(2, 1fr) !important;
  }
  [data-partner-hub-quick] {
    flex-direction: column !important;
  }
}
`;

// Inject responsive styles
if (typeof document !== 'undefined') {
  const styleId = 'partner-hub-dashboard-responsive';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = RESPONSIVE_CSS;
    document.head.appendChild(styleEl);
  }
}
