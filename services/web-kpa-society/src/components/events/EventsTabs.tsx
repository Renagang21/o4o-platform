/**
 * EventsTabs - 이벤트 유형 탭
 *
 * 전체, 퀴즈, 설문조사, 업체 이벤트
 */

import { colors, spacing, borderRadius } from '../../styles/theme';

export type EventTab = 'all' | 'quiz' | 'survey' | 'corporate';

interface EventsTabsProps {
  currentTab: EventTab;
  onTabChange: (tab: EventTab) => void;
}

const tabs: { key: EventTab; label: string }[] = [
  { key: 'all', label: '전체 이벤트' },
  { key: 'quiz', label: '퀴즈' },
  { key: 'survey', label: '설문조사' },
  { key: 'corporate', label: '업체 이벤트' },
];

export function EventsTabs({ currentTab, onTabChange }: EventsTabsProps) {
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
