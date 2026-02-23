/**
 * B2BRevenueSection — B2B 매출 기회 블록 (리스트형)
 *
 * WO-O4O-HUB-REVENUE-PRIORITY-IMPLEMENTATION-V1
 * WO-O4O-HUB-LIST-UI-UNIFICATION-V1: 카드→HubList 전환
 *
 * Hub 최상단 핵심 블록. B2BPreviewItem을 HubList로 렌더링.
 * items가 비어있으면 null 반환 (optional section).
 */

import { useMemo } from 'react';
import type { B2BRevenueSectionProps, HubListItem } from '../types.js';
import { NEUTRALS } from '../theme.js';
import { HubList } from './HubList.js';

export function B2BRevenueSection({ items, title, ctaLabel, onCtaClick }: B2BRevenueSectionProps) {
  const listItems: HubListItem[] = useMemo(() =>
    items.map(item => ({
      id: item.id,
      thumbnail: item.imageUrl,
      primaryText: item.name,
      secondaryText: item.supplierName,
      tertiaryText: item.badge,
      infoText: item.price,
      onClick: item.onClick,
    })),
    [items],
  );

  if (items.length === 0) return null;

  return (
    <HubList
      items={listItems}
      pageSize={6}
      title={title || 'B2B'}
      ctaLabel={ctaLabel}
      onCtaClick={onCtaClick}
      backgroundColor={NEUTRALS[50]}
    />
  );
}
