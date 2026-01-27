/**
 * ResourcesTabs - 자료 유형 탭
 *
 * Content 중심: 유형별 필터
 */

import { colors, spacing, borderRadius } from '../../styles/theme';

export type ResourceTab = 'all' | 'document' | 'video' | 'image' | 'corporate' | 'signage';

interface ResourcesTabsProps {
  currentTab: ResourceTab;
  onTabChange: (tab: ResourceTab) => void;
}

const tabs: { key: ResourceTab; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'document', label: '문서' },
  { key: 'video', label: '영상' },
  { key: 'image', label: '이미지' },
  { key: 'corporate', label: '업체 제공' },
  { key: 'signage', label: '사이니지' },
];

export function ResourcesTabs({ currentTab, onTabChange }: ResourcesTabsProps) {
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
    flexWrap: 'wrap',
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
