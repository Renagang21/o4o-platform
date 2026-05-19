/**
 * EducationTabs - 상단 정렬 탭
 *
 * 전체, 추천, 신규, 인기 정렬
 *
 * WO-O4O-EDUCATION-EVENTS-TABS-RESPONSIVE-V1: mobile 가로 스크롤 + active 자동 노출
 * WO-O4O-RESPONSIVE-TABBAR-PRIMITIVE-V1: @o4o/ui ResponsiveTabBar 적용 (thin wrapper).
 *   기존 public props (currentTab / onTabChange) 시그니처 유지. 시각 토큰
 *   (padding/border/colors.primary 등) 도 inline style 그대로 전달하여
 *   시각 회귀 0.
 */

import { ResponsiveTabBar } from '@o4o/ui';
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
    <ResponsiveTabBar
      tabs={tabs}
      activeKey={currentTab}
      onChange={(key) => onTabChange(key as EducationTab)}
      aria-label="강의 정렬 탭"
      style={styles.container}
      tabStyle={styles.tab}
      activeTabStyle={styles.tabActive}
    />
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
    // display / overflowX / WebkitOverflowScrolling 는 ResponsiveTabBar 가 강제.
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
    // flexShrink / whiteSpace 는 ResponsiveTabBar 가 강제.
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    color: colors.white,
    fontWeight: 600,
  },
};
