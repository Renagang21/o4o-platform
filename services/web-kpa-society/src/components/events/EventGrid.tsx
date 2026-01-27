/**
 * EventGrid - 이벤트 카드 그리드
 *
 * EventCard 목록을 2열 그리드로 표시
 */

import { EventCard } from './EventCard';
import type { EventData } from './EventCard';
import { spacing } from '../../styles/theme';

interface EventGridProps {
  events: EventData[];
}

export function EventGrid({ events }: EventGridProps) {
  return (
    <div style={styles.grid}>
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: spacing.lg,
  },
};
