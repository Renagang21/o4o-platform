/**
 * QuickAccessBar - 빠른 접근 바
 *
 * 자주 쓰는 기능에 즉시 접근할 수 있는 아이콘 + 텍스트 바
 * 로그인 여부 무관
 */

import { Link } from 'react-router-dom';
import { colors, spacing, borderRadius, shadows } from '../../styles/theme';

const quickLinks = [
  { label: '포럼', href: '/demo/forum', icon: '💬' },
  { label: '교육', href: '/demo/lms', icon: '📚' },
  { label: '자료실', href: '/demo/docs', icon: '📁' },
  { label: '이벤트', href: '/demo/events', icon: '🎯' },
  { label: '약국경영', href: '/pharmacy', icon: '💊' },
];

export function QuickAccessBar() {
  return (
    <section style={styles.container}>
      <div style={styles.inner}>
        {quickLinks.map((link) => (
          <Link key={link.href} to={link.href} style={styles.item}>
            <span style={styles.icon}>{link.icon}</span>
            <span style={styles.label}>{link.label}</span>
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
