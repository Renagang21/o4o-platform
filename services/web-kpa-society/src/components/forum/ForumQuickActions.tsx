/**
 * ForumQuickActions - 포럼 빠른 접근 바
 *
 * QuickAccessBar 패턴: 글쓰기, 내 글, 인기 글, 카테고리 등 바로가기
 * 로그인 여부 무관 (인증 필요 기능은 클릭 시 로그인 유도)
 */

import { Link } from 'react-router-dom';
import { colors, spacing, borderRadius, shadows } from '../../styles/theme';

const quickActions = [
  { label: '글쓰기', href: '/demo/forum/write', icon: '✏️' },
  { label: '전체 글', href: '/demo/forum?view=all', icon: '📋' },
  { label: '인기 글', href: '/demo/forum?sort=popular', icon: '🔥' },
  { label: '공지사항', href: '/demo/forum?category=notice', icon: '📢' },
];

export function ForumQuickActions() {
  return (
    <section style={styles.container}>
      <div style={styles.inner}>
        {quickActions.map((action) => (
          <Link key={action.label} to={action.href} style={styles.item}>
            <span style={styles.icon}>{action.icon}</span>
            <span style={styles.label}>{action.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: `${spacing.lg} 0`,
  },
  inner: {
    display: 'flex',
    justifyContent: 'center',
    gap: spacing.lg,
    flexWrap: 'wrap',
  },
  item: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.sm,
    padding: `${spacing.md} ${spacing.lg}`,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    boxShadow: shadows.sm,
    textDecoration: 'none',
    color: colors.neutral700,
    minWidth: '80px',
    transition: 'box-shadow 0.2s, transform 0.2s',
  },
  icon: {
    fontSize: '1.5rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
  },
};
