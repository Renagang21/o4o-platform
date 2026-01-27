/**
 * EducationSidebar - 좌측 필터/이동 사이드바
 *
 * 전체 강의, 진행 중, 수강 완료, 무료/유료 필터
 * 클릭 시 URL 상태 변경
 */

import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius } from '../../styles/theme';

export type EducationFilter = 'all' | 'ongoing' | 'completed' | 'free' | 'paid';

interface EducationSidebarProps {
  currentFilter: EducationFilter;
  onFilterChange: (filter: EducationFilter) => void;
}

const filters: { key: EducationFilter; label: string; icon: string; requireAuth?: boolean }[] = [
  { key: 'all', label: '전체 강의', icon: '📚' },
  { key: 'ongoing', label: '진행 중 강의', icon: '▶️', requireAuth: true },
  { key: 'completed', label: '수강 완료', icon: '✅', requireAuth: true },
  { key: 'free', label: '무료 강의', icon: '🆓' },
  { key: 'paid', label: '유료 강의', icon: '💎' },
];

export function EducationSidebar({ currentFilter, onFilterChange }: EducationSidebarProps) {
  const { isAuthenticated } = useAuth();

  return (
    <nav style={styles.sidebar}>
      <ul style={styles.list}>
        {filters.map((f) => {
          // 인증 필요 항목은 로그인 전 숨김
          if (f.requireAuth && !isAuthenticated) return null;

          return (
            <li key={f.key}>
              <button
                style={{
                  ...styles.filterBtn,
                  ...(currentFilter === f.key ? styles.filterBtnActive : {}),
                }}
                onClick={() => onFilterChange(f.key)}
              >
                <span style={styles.filterIcon}>{f.icon}</span>
                <span>{f.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '200px',
    flexShrink: 0,
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  filterBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    padding: `${spacing.sm} ${spacing.md}`,
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
    color: colors.neutral600,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.2s',
  },
  filterBtnActive: {
    backgroundColor: `${colors.primary}10`,
    color: colors.primary,
    fontWeight: 600,
  },
  filterIcon: {
    fontSize: '1rem',
    flexShrink: 0,
  },
};
