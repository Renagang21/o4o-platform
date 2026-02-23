/**
 * PlatformContentSection — 플랫폼 콘텐츠 리스트 블록
 *
 * WO-O4O-HUB-LIST-UI-UNIFICATION-V1
 * WO-O4O-CMS-VISIBILITY-EXTENSION-PHASE1-V1: author_role tab filter
 *
 * HubList 래퍼. PlatformContentItem → HubListItem 매핑.
 * 서비스별 "내 매장 복사" 콜백은 wrapper가 제공.
 */

import { useMemo } from 'react';
import type { PlatformContentSectionProps, HubListItem } from '../types.js';
import { HubList } from './HubList.js';
import { NEUTRALS } from '../theme.js';

const TAB_STYLES = {
  container: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
    flexWrap: 'wrap' as const,
  },
  tab: (active: boolean) => ({
    padding: '6px 14px',
    borderRadius: '16px',
    border: `1px solid ${active ? '#2563EB' : NEUTRALS[200]}`,
    backgroundColor: active ? '#EFF6FF' : '#FFFFFF',
    color: active ? '#2563EB' : NEUTRALS[600],
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer' as const,
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap' as const,
  }),
};

export function PlatformContentSection({
  items,
  title = '플랫폼 콘텐츠',
  pageSize = 6,
  ctaLabel,
  onCtaClick,
  authorTabs,
  activeAuthorTab = 'all',
  onAuthorTabChange,
}: PlatformContentSectionProps) {
  // Filter items by active tab (client-side fallback if server filtering not used)
  const filteredItems = useMemo(() => {
    if (!activeAuthorTab || activeAuthorTab === 'all') return items;
    return items.filter(item => item.authorRole === activeAuthorTab);
  }, [items, activeAuthorTab]);

  const listItems: HubListItem[] = useMemo(() =>
    filteredItems.map(item => ({
      id: item.id,
      thumbnail: item.icon,
      primaryText: item.title,
      secondaryText: item.description,
      tertiaryText: item.date,
      actionLabel: item.onCopy ? '내 매장 복사' : undefined,
      onAction: item.onCopy,
    })),
    [filteredItems],
  );

  return (
    <div>
      {authorTabs && authorTabs.length > 1 && onAuthorTabChange && (
        <div style={TAB_STYLES.container}>
          {authorTabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              style={TAB_STYLES.tab(activeAuthorTab === tab.key)}
              onClick={() => onAuthorTabChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
      <HubList
        items={listItems}
        pageSize={pageSize}
        title={!authorTabs ? title : undefined}
        ctaLabel={ctaLabel}
        onCtaClick={onCtaClick}
        emptyMessage="현재 제공되는 콘텐츠가 없습니다."
      />
    </div>
  );
}
