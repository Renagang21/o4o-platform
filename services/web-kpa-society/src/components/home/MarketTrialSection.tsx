/**
 * MarketTrialSection — 커뮤니티 메인 "마켓트라이얼" CTA 카드
 *
 * WO-MARKET-TRIAL-CROSS-SERVICE-ENTRY-ONLY-MIGRATION-V1
 * WO-KPA-MAIN-HOME-RESTRUCTURE-V1: 컴팩트 CTA 카드로 간소화, 하단 배치
 *
 * Market Trial 실행이 Neture로 통합되었으므로, KPA Home에서는
 * 진입점만 유지합니다.
 */

import { colors, spacing, borderRadius, shadows } from '../../styles/theme';

const NETURE_URL = 'https://neture.co.kr';

export function MarketTrialSection() {
  return (
    <section style={styles.container}>
      <a
        href={NETURE_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={styles.card}
      >
        <div style={styles.iconWrap}>
          <span style={styles.icon}>🧪</span>
        </div>
        <div style={styles.content}>
          <div style={styles.headline}>신제품 시범판매 참여</div>
          <div style={styles.subline}>
            공급자가 제안한 신제품을 먼저 체험해 보세요.
          </div>
        </div>
        <div style={styles.cta}>Neture에서 보기 →</div>
      </a>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: `${spacing.md} 0`,
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
    width: '40px',
    height: '40px',
    backgroundColor: '#DCFCE7',
    borderRadius: borderRadius.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: '1.25rem',
  },
  content: {
    flex: '1 1 auto',
    minWidth: 0,
  },
  headline: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '2px',
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
