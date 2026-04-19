/**
 * HeroCtaSection - Hero 하단 환영 메시지 + CTA 버튼
 *
 * WO-KPA-MAIN-HOME-RESTRUCTURE-V1
 *
 * 로그인: "{name}님, 환영합니다" / 비로그인: "약사 커뮤니티에 오신 것을 환영합니다"
 * CTA 3개: 포럼 참여, 강의 수강, 콘텐츠 허브
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius } from '../../styles/theme';

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

const ContentIconSmall = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ctaItems = [
  { label: '포럼 참여', href: '/forum', icon: <ForumIconSmall /> },
  { label: '강의 수강', href: '/lms', icon: <EducationIconSmall /> },
  { label: '콘텐츠 허브', href: '/content', icon: <ContentIconSmall /> },
];

export function HeroCtaSection() {
  const { isAuthenticated, user } = useAuth();

  const greeting = isAuthenticated && user?.name
    ? `${user.name}님, 환영합니다`
    : '약사 커뮤니티에 오신 것을 환영합니다';

  return (
    <section style={styles.container}>
      <p style={styles.greeting}>{greeting}</p>
      <div style={styles.ctaRow}>
        {ctaItems.map((item) => (
          <Link key={item.href} to={item.href} style={styles.ctaButton}>
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
    padding: `${spacing.lg} 0 ${spacing.sm}`,
  },
  greeting: {
    fontSize: '1rem',
    fontWeight: 600,
    color: colors.neutral800,
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
  ctaIcon: {
    display: 'flex',
    alignItems: 'center',
    color: colors.neutral500,
  },
  ctaLabel: {
    whiteSpace: 'nowrap',
  },
};
