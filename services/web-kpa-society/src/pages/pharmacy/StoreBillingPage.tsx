/**
 * StoreBillingPage - 정산/인보이스
 * WO-STORE-BILLING-FOUNDATION-V1
 *
 * 공통 UI 프레임:
 * [1] KPI 3블록 (이번 달 매출 / 예상 수수료 / 정산 예정)
 * [2] 최근 정산 내역
 *
 * KPA-a 수수료율: 3%
 * API 미연결 — mock 데이터 기반
 */

import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

const COMMISSION_RATE = 0.03; // 3%

/** mock 정산 내역 */
const MOCK_HISTORY = [
  { period: '2026-02', status: '정산 예정', amount: 0 },
  { period: '2026-01', status: '정산 예정', amount: 0 },
];

export function StoreBillingPage() {
  // API 미연결 — 모든 값 0
  const monthlyRevenue = 0;
  const commission = Math.round(monthlyRevenue * COMMISSION_RATE);
  const payout = monthlyRevenue - commission;

  const kpiCards = [
    { label: '이번 달 매출', value: formatCurrency(monthlyRevenue), color: colors.primary },
    { label: '예상 수수료 (3%)', value: formatCurrency(commission), color: colors.accentYellow },
    { label: '정산 예정 금액', value: formatCurrency(payout), color: colors.accentGreen },
  ];

  return (
    <div style={S.container}>
      {/* Header */}
      <div>
        <h1 style={S.title}>정산/인보이스</h1>
        <p style={S.subtitle}>매출 정산 현황과 내역을 확인합니다</p>
      </div>

      {/* [1] KPI 3블록 */}
      <div style={S.kpiGrid}>
        {kpiCards.map((kpi) => (
          <div key={kpi.label} style={S.kpiCard}>
            <p style={S.kpiLabel}>{kpi.label}</p>
            <p style={{ ...S.kpiValue, color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* [2] 최근 정산 내역 */}
      <div style={S.section}>
        <h2 style={S.sectionTitle}>정산 내역</h2>
        <div style={S.tableCard}>
          <div style={S.tableHeader}>
            <span style={{ ...S.th, flex: 1 }}>기간</span>
            <span style={{ ...S.th, flex: 1 }}>상태</span>
            <span style={{ ...S.th, flex: 1, textAlign: 'right' as const }}>금액</span>
          </div>
          {MOCK_HISTORY.map((row) => (
            <div key={row.period} style={S.tableRow}>
              <span style={{ ...S.td, flex: 1 }}>{row.period}</span>
              <span style={{ ...S.td, flex: 1 }}>
                <span style={S.statusBadge}>{row.status}</span>
              </span>
              <span style={{ ...S.td, flex: 1, textAlign: 'right' as const, fontWeight: 600 }}>
                {formatCurrency(row.amount)}
              </span>
            </div>
          ))}
          {MOCK_HISTORY.length === 0 && (
            <div style={S.emptyState}>
              <p style={S.emptyText}>정산 내역이 없습니다</p>
            </div>
          )}
        </div>
      </div>

      {/* 안내 */}
      <div style={S.notice}>
        <p style={S.noticeText}>
          정산 기능이 연결되면 실제 매출 기반의 정산 내역이 표시됩니다.
        </p>
      </div>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return `₩${amount.toLocaleString()}`;
}

/* ── Styles ── */
const S: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.lg,
  },
  title: {
    ...typography.headingL,
    margin: 0,
    color: colors.neutral900,
  },
  subtitle: {
    margin: `${spacing.xs} 0 0`,
    fontSize: '0.875rem',
    color: colors.neutral500,
  },

  /* KPI */
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: spacing.md,
  },
  kpiCard: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
  },
  kpiLabel: {
    margin: 0,
    fontSize: '0.8rem',
    fontWeight: 500,
    color: colors.neutral500,
  },
  kpiValue: {
    margin: `${spacing.xs} 0 0`,
    fontSize: '1.5rem',
    fontWeight: 700,
  },

  /* Section */
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.headingS,
    margin: 0,
    color: colors.neutral800,
  },

  /* Table */
  tableCard: {
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex',
    padding: `${spacing.sm} ${spacing.md}`,
    borderBottom: `1px solid ${colors.neutral200}`,
    backgroundColor: colors.neutral50,
  },
  th: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: colors.neutral500,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  } as React.CSSProperties,
  tableRow: {
    display: 'flex',
    padding: `${spacing.md}`,
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  td: {
    fontSize: '0.875rem',
    color: colors.neutral700,
  },
  statusBadge: {
    display: 'inline-block',
    padding: `2px ${spacing.sm}`,
    fontSize: '0.75rem',
    fontWeight: 500,
    color: colors.accentYellow,
    backgroundColor: '#FEF3C7',
    borderRadius: borderRadius.sm,
  },

  /* Empty */
  emptyState: {
    textAlign: 'center',
    padding: `${spacing.xl} ${spacing.lg}`,
  } as React.CSSProperties,
  emptyText: {
    margin: 0,
    fontSize: '0.875rem',
    color: colors.neutral500,
  },

  /* Notice */
  notice: {
    padding: spacing.md,
    backgroundColor: colors.neutral100,
    borderRadius: borderRadius.md,
  },
  noticeText: {
    margin: 0,
    fontSize: '0.8rem',
    color: colors.neutral500,
    lineHeight: 1.5,
  },
};
