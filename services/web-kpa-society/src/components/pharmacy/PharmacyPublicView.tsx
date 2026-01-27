/**
 * PharmacyPublicView - 로그인 전 약국경영 화면
 *
 * "약국 보유 약사를 위한 공간" 인식만 제공
 * 가입/홍보 유도 ❌
 */

import { Link } from 'react-router-dom';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

interface PreviewCardData {
  title: string;
  description: string;
  icon: string;
}

const previewCards: PreviewCardData[] = [
  {
    title: '혈당관리 프로그램',
    description: '약국 기반 혈당관리 서비스 운영',
    icon: '🩸',
  },
  {
    title: 'B2B 구매',
    description: '약국 운영에 필요한 상품 구매',
    icon: '🏭',
  },
  {
    title: '약국 몰 관리',
    description: '고객 노출 화면 및 상품 관리',
    icon: '🏪',
  },
  {
    title: '약국 서비스',
    description: '콘텐츠, 사이니지, 포럼 등',
    icon: '🔧',
  },
];

export function PharmacyPublicView() {
  return (
    <div style={styles.container}>
      {/* PageHeader */}
      <div style={styles.header}>
        <h1 style={styles.title}>약국경영</h1>
      </div>

      {/* InfoNotice */}
      <div style={styles.notice}>
        <p style={styles.noticeText}>
          약국 운영에 활용하는 서비스 영역입니다. 로그인 후 이용할 수 있습니다.
        </p>
      </div>

      {/* ServicePreviewGrid */}
      <div style={styles.grid}>
        {previewCards.map((card) => (
          <div key={card.title} style={styles.card}>
            <span style={styles.cardIcon}>{card.icon}</span>
            <h3 style={styles.cardTitle}>{card.title}</h3>
            <p style={styles.cardDesc}>{card.description}</p>
          </div>
        ))}
      </div>

      {/* LoginCTA */}
      <div style={styles.ctaWrap}>
        <Link to="/login" style={styles.loginBtn}>
          로그인
        </Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: `0 ${spacing.lg} ${spacing.xl}`,
  },
  header: {
    padding: `${spacing.xl} 0 ${spacing.lg}`,
    borderBottom: `1px solid ${colors.neutral200}`,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.headingL,
    margin: 0,
    color: colors.neutral900,
  },
  notice: {
    padding: spacing.md,
    backgroundColor: colors.neutral100,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
  },
  noticeText: {
    margin: 0,
    fontSize: '0.875rem',
    color: colors.neutral600,
    lineHeight: 1.5,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  card: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
  },
  cardIcon: {
    fontSize: '1.5rem',
    display: 'block',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    margin: `0 0 ${spacing.xs}`,
    fontSize: '1rem',
    fontWeight: 600,
    color: colors.neutral900,
  },
  cardDesc: {
    margin: 0,
    fontSize: '0.875rem',
    color: colors.neutral500,
    lineHeight: 1.5,
  },
  ctaWrap: {
    textAlign: 'center',
  },
  loginBtn: {
    display: 'inline-block',
    padding: `${spacing.sm} ${spacing.xl}`,
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.white,
    backgroundColor: colors.primary,
    textDecoration: 'none',
    borderRadius: borderRadius.md,
  },
};
