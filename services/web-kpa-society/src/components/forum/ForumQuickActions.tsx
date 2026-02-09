/**
 * ForumQuickActions - 포럼 빠른 접근 바
 *
 * QuickAccessBar 패턴: 글쓰기, 내 글, 인기 글, 카테고리 등 바로가기
 * 로그인 여부 무관 (인증 필요 기능은 클릭 시 로그인 유도)
 *
 * WO-FIX-FORUM-LINKS: 현재 경로에 따라 링크 동적 생성
 */

import { Link, useLocation } from 'react-router-dom';
import { colors, spacing, borderRadius, shadows } from '../../styles/theme';

// 포럼 베이스 경로
function useForumBasePath(): string {
  return '/forum';
}

// 빠른 접근 액션 (베이스 경로 제외)
const quickActionPaths = [
  { label: '글쓰기', path: '/write', icon: '✏️' },
  { label: '전체 글', path: '?view=all', icon: '📋' },
  { label: '인기 글', path: '?sort=popular', icon: '🔥' },
  { label: '공지사항', path: '?category=notice', icon: '📢' },
];

export function ForumQuickActions() {
  const basePath = useForumBasePath();
  return (
    <section style={styles.container}>
      <div style={styles.inner}>
        {quickActionPaths.map((action) => (
          <Link key={action.label} to={`${basePath}${action.path}`} style={styles.item}>
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
