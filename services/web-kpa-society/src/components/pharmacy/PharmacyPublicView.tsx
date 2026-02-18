/**
 * PharmacyPublicView - 로그인 전 약국경영 화면
 *
 * "약국 보유 약사를 위한 공간" 인식만 제공
 * 가입/홍보 유도 ❌
 *
 * 섹션 구조:
 * - 약국 경영 카드 (내부 서비스, 로그인 후 이동)
 * - 약국 경영 지원 서비스 (외부 서비스, 새 창)
 */

import { Link, useNavigate } from 'react-router-dom';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

interface PreviewCardData {
  title: string;
  description: string;
  icon: string;
  /** 내부 경로 (로그인 후 이동) */
  href?: string;
  /** 외부 URL (새 창) */
  externalUrl?: string;
}

const GLUCOSEVIEW_URL = import.meta.env.DEV
  ? 'http://localhost:4101'
  : 'https://glucoseview.neture.co.kr';

/** 약국 경영 내부 서비스 */
const managementCards: PreviewCardData[] = [
  {
    title: 'B2B 구매',
    description: '약국 운영에 필요한 상품 구매',
    icon: '🏭',
    href: '/pharmacy/sales/b2b',
  },
  {
    title: '내 약국 몰 관리',
    description: '고객 노출 화면 및 상품 관리',
    icon: '🏪',
    href: '/pharmacy/settings',
  },
  {
    title: '내 약국 서비스',
    description: '콘텐츠, 사이니지, 포럼 등',
    icon: '🔧',
    href: '/pharmacy/services',
  },
];

/** 약국 경영 지원 서비스 (외부) */
const supportServiceCards: PreviewCardData[] = [
  {
    title: '혈당관리 지원 약국',
    description: '(사)한국당뇨협회와 함께 하는 혈당관리 약국 서비스',
    icon: '🩸',
    externalUrl: GLUCOSEVIEW_URL,
  },
];

export function PharmacyPublicView() {
  const navigate = useNavigate();

  function handleCardClick(card: PreviewCardData) {
    if (card.externalUrl) {
      window.open(card.externalUrl, '_blank', 'noopener,noreferrer');
    } else if (card.href) {
      navigate(card.href);
    }
  }

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

      {/* 약국 경영 카드 */}
      <div style={styles.grid}>
        {managementCards.map((card) => (
          <div
            key={card.title}
            style={styles.card}
            onClick={() => handleCardClick(card)}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = shadows.sm;
            }}
          >
            <span style={styles.cardIcon}>{card.icon}</span>
            <h3 style={styles.cardTitle}>{card.title}</h3>
            <p style={styles.cardDesc}>{card.description}</p>
          </div>
        ))}
      </div>

      {/* 약국 경영 지원 서비스 */}
      <section style={styles.supportSection}>
        <h2 style={styles.sectionTitle}>약국 경영 지원 서비스</h2>
        <div style={styles.grid}>
          {supportServiceCards.map((card) => (
            <div
              key={card.title}
              style={styles.card}
              onClick={() => handleCardClick(card)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = shadows.sm;
              }}
            >
              <span style={styles.cardIcon}>{card.icon}</span>
              <h3 style={styles.cardTitle}>{card.title}</h3>
              <p style={styles.cardDesc}>{card.description}</p>
              <span style={styles.externalBadge}>새 창으로 열기 ↗</span>
            </div>
          ))}
        </div>
      </section>

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

  // Sections
  supportSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: colors.neutral800,
    margin: `0 0 ${spacing.md}`,
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
    cursor: 'pointer',
    transition: 'box-shadow 0.15s',
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
  externalBadge: {
    display: 'inline-block',
    marginTop: spacing.sm,
    fontSize: '0.8rem',
    fontWeight: 500,
    color: colors.primary,
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
