/**
 * EducationTabs - 상단 정렬 탭
 *
 * 전체, 추천, 신규, 인기 정렬
 *
 * WO-O4O-EDUCATION-EVENTS-TABS-RESPONSIVE-V1:
 *   mobile에서 탭 가로 스크롤(overflow-x:auto) + 탭 자체 압축 방지(flex-shrink:0 / nowrap)
 *   + currentTab 변경 시 active 탭 자동 center scrollIntoView.
 *   기능 로직(onTabChange / 탭 전환)은 변경 없음.
 */

import { useEffect, useRef } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);

  // 좁은 viewport에서 active 탭이 스크롤 영역 바깥에 가려지지 않도록 center 자동 노출.
  // currentTab 변경 시에만 동작 — 사용자 인터랙션과 충돌 없음.
  useEffect(() => {
    const active = containerRef.current?.querySelector(
      '[data-active="true"]',
    ) as HTMLElement | null;
    if (active && typeof active.scrollIntoView === 'function') {
      active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentTab]);

  return (
    <div ref={containerRef} style={styles.container}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          data-active={currentTab === tab.key ? 'true' : 'false'}
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
    // WO-O4O-EDUCATION-EVENTS-TABS-RESPONSIVE-V1: mobile 가로 스크롤 + iOS 부드러운 스크롤
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
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
    // WO-O4O-EDUCATION-EVENTS-TABS-RESPONSIVE-V1: 좁은 폭에서 탭 압축 방지 + 라벨 한 줄 유지
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    color: colors.white,
    fontWeight: 600,
  },
};
