/**
 * EducationTabs - 상단 정렬 탭
 *
 * 전체, 추천, 신규, 인기 정렬
 */

import { colors, spacing, borderRadius } from '../../styles/theme';

export type EducationTab = 'all' | 'recommended' | 'new' | 'popular';

interface EducationTabsProps {
  currentTab: EducationTab;
  onTabChange: (tab: EducationTab) => void;
}

const tabs: { key: EducationTab; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'recommended', label: '추천' },
  { key: 'new', label: '신규' },
  { key: 'popular', label: '인기' },
];

export function EducationTabs({ currentTab, onTabChange }: EducationTabsProps) {
  return (
    <div style={styles.container}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          style={{
            ...styles.tab,
            ...(currentTab === tab.key ? styles.tabActive : {}),
          }}
          onClick={() => onTabChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tab: {
    padding: `${spacing.sm} ${spacing.md}`,
    backgroundColor: 'transparent',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
    color: colors.neutral600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    color: colors.white,
    fontWeight: 600,
  },
};
