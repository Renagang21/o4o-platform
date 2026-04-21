/**
 * HeroCtaSection - Hero 하단 환영 메시지 + CTA 버튼
 *
 * WO-KPA-MAIN-HOME-RESTRUCTURE-V1
 *
 * 로그인: "{name}님, 환영합니다" / 비로그인: "약사 커뮤니티에 오신 것을 환영합니다"
 * CTA 2개: 포럼 참여, 강의 수강
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

const hoverStyles = `
  .hero-cta-btn:hover {
    border-color: ${colors.primary};
    box-shadow: ${shadows.sm};
    color: ${colors.primary};
  }
`;

const ForumIconSmall = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const EducationIconSmall = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const ctaItems = [
  { label: '포럼 참여', href: '/forum', icon: <ForumIconSmall /> },
  { label: '강의 수강', href: '/lms', icon: <EducationIconSmall /> },
];

export function HeroCtaSection() {
  const { isAuthenticated, user } = useAuth();

  const greeting = isAuthenticated && user?.name
    ? `${user.name}님, 환영합니다`
    : '약사 커뮤니티에 오신 것을 환영합니다';

  useEffect(() => {
    const styleId = 'hero-cta-hover-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = hoverStyles;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <section style={styles.container}>
      <p style={styles.greeting}>{greeting}</p>
      <p style={styles.subtitle}>자주 사용하는 서비스를 빠르게 시작하세요</p>
      <div style={styles.ctaRow}>
        {ctaItems.map((item) => (
          <Link key={item.href} to={item.href} style={styles.ctaButton} className="hero-cta-btn">
            <span style={styles.ctaIcon}>{item.icon}</span>
            <span style={styles.ctaLabel}>{item.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: `${spacing.lg} ${spacing.lg} ${spacing.md}`,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.neutral100}`,
  },
  greeting: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: `0 0 ${spacing.md}`,
  },
  ctaRow: {
    display: 'flex',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  ctaButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing.xs,
    padding: `${spacing.sm} ${spacing.md}`,
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.lg,
    textDecoration: 'none',
    color: colors.neutral700,
    fontSize: '0.875rem',
    fontWeight: 500,
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: colors.neutral500,
    margin: `0 0 ${spacing.md}`,
  },
  ctaIcon: {
    display: 'flex',
    alignItems: 'center',
    color: colors.neutral500,
  },
  ctaLabel: {
    whiteSpace: 'nowrap',
  },
};
