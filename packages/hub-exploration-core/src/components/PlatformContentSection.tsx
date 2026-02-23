/**
 * PlatformContentSection — 플랫폼 콘텐츠 리스트 블록
 *
 * WO-O4O-HUB-LIST-UI-UNIFICATION-V1
 *
 * HubList 래퍼. PlatformContentItem → HubListItem 매핑.
 * 서비스별 "내 매장 복사" 콜백은 wrapper가 제공.
 */

import { useMemo } from 'react';
import type { PlatformContentSectionProps, HubListItem } from '../types.js';
import { HubList } from './HubList.js';

export function PlatformContentSection({
  items,
  title = '플랫폼 콘텐츠',
  pageSize = 6,
  ctaLabel,
  onCtaClick,
}: PlatformContentSectionProps) {
  const listItems: HubListItem[] = useMemo(() =>
    items.map(item => ({
      id: item.id,
      thumbnail: item.icon,
      primaryText: item.title,
      secondaryText: item.description,
      tertiaryText: item.date,
      actionLabel: item.onCopy ? '내 매장 복사' : undefined,
      onAction: item.onCopy,
    })),
    [items],
  );

  return (
    <HubList
      items={listItems}
      pageSize={pageSize}
      title={title}
      ctaLabel={ctaLabel}
      onCtaClick={onCtaClick}
      emptyMessage="현재 제공되는 콘텐츠가 없습니다."
    />
  );
}
