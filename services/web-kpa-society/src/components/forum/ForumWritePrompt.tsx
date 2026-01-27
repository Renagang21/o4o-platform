/**
 * ForumWritePrompt - 글쓰기 유도 섹션
 *
 * OrganizationDemoSection 패턴: 단일 카드 + CTA
 * 로그인 전: 로그인 유도 / 로그인 후: 글쓰기 바로가기
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

export function ForumWritePrompt() {
  const { isAuthenticated } = useAuth();

  return (
    <section style={styles.container}>
      <div style={styles.card}>
        <div style={styles.content}>
          <span style={styles.icon}>✏️</span>
          <div>
            <h3 style={styles.title}>
              {isAuthenticated ? '새 글을 작성해 보세요' : '포럼에 참여해 보세요'}
            </h3>
            <p style={styles.desc}>
              {isAuthenticated
                ? '약사 커뮤니티에 경험과 정보를 공유하세요'
                : '로그인 후 포럼 글을 작성하고 토론에 참여할 수 있습니다'}
            </p>
          </div>
        </div>
        {isAuthenticated ? (
          <Link to="/demo/forum/write" style={styles.ctaPrimary}>
            글쓰기
          </Link>
        ) : (
          <Link to="/login" style={styles.ctaOutline}>
            로그인
          </Link>
        )}
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: `${spacing.lg} 0`,
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.neutral100}`,
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    fontSize: '1.75rem',
    flexShrink: 0,
  },
  title: {
    ...typography.headingS,
    margin: 0,
    color: colors.neutral900,
  },
  desc: {
    margin: `${spacing.xs} 0 0`,
    fontSize: '0.813rem',
    color: colors.neutral500,
  },
  ctaPrimary: {
    padding: `${spacing.sm} ${spacing.lg}`,
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.white,
    backgroundColor: colors.primary,
    textDecoration: 'none',
    border: 'none',
    borderRadius: borderRadius.md,
    whiteSpace: 'nowrap',
  },
  ctaOutline: {
    padding: `${spacing.sm} ${spacing.lg}`,
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.primary,
    textDecoration: 'none',
    border: `1px solid ${colors.primary}`,
    borderRadius: borderRadius.md,
    whiteSpace: 'nowrap',
  },
};
