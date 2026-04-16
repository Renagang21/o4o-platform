/**
 * MarketTrialSection — 커뮤니티 메인 "마켓트라이얼 소식" 단일 배너
 *
 * WO-MARKET-TRIAL-CROSS-SERVICE-ENTRY-ONLY-MIGRATION-V1
 *
 * 변경 사항:
 *  - 기존: Gateway API 호출 + Trial 리스트 + 접근 상태 분기 (324 LOC)
 *  - 신규: 단일 배너 (정적 카드 + Neture 외부 링크)
 *
 * Market Trial 실행이 Neture로 통합되었으므로, KPA Home에서는
 * 진입점만 유지합니다.
 */

import { colors, spacing, borderRadius, shadows } from '../../styles/theme';

const NETURE_MARKET_TRIAL_URL = 'https://neture.co.kr/market-trial';

export function MarketTrialSection() {
  return (
    <section style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>마켓트라이얼 소식</h2>
      </div>

      <a
        href={NETURE_MARKET_TRIAL_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={styles.card}
      >
        <div style={styles.iconWrap}>
          <span style={styles.icon}>🧪</span>
        </div>
        <div style={styles.content}>
          <div style={styles.headline}>신제품 시범판매에 참여해 보세요</div>
          <div style={styles.subline}>
            공급자가 출시 전 제품을 약사 회원에게 먼저 선보입니다. 참여 · 후기 ·
            정산은 Neture 통합 허브에서 진행됩니다.
          </div>
        </div>
        <div style={styles.cta}>Neture에서 보기 →</div>
      </a>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: `${spacing.xl} 0`,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: colors.neutral900,
    margin: 0,
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    boxShadow: shadows.sm,
    textDecoration: 'none',
    color: 'inherit',
    border: `1px solid ${colors.neutral100}`,
  },
  iconWrap: {
    flex: '0 0 auto',
    width: '48px',
    height: '48px',
    backgroundColor: '#DCFCE7',
    borderRadius: borderRadius.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: '1.5rem',
  },
  content: {
    flex: '1 1 auto',
    minWidth: 0,
  },
  headline: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '4px',
  },
  subline: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
    lineHeight: 1.5,
  },
  cta: {
    flex: '0 0 auto',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: colors.primary,
    whiteSpace: 'nowrap' as const,
  },
};
