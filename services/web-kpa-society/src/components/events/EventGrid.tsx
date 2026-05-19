/**
 * EventGrid - 이벤트 카드 그리드
 *
 * WO-O4O-LECTURE-EVENT-GRID-RESPONSIVE-V1:
 *   기존 gridTemplateColumns: 'repeat(2, 1fr)' 고정 → @o4o/ui ResponsiveGrid 적용.
 *   mobile 1열 → md 2열 mobile-first 전환.
 */

import { ResponsiveGrid } from '@o4o/ui';
import { EventCard } from './EventCard';
import type { EventData } from './EventCard';

interface EventGridProps {
  events: EventData[];
}

export function EventGrid({ events }: EventGridProps) {
  return (
    <ResponsiveGrid cols={{ base: 1, md: 2 }} gap="default">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </ResponsiveGrid>
  );
}
