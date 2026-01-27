/**
 * DemoCardGrid - 데모 카드 그리드
 */

import { DemoCard } from './DemoCard';
import type { DemoCardData } from './DemoCard';
import { spacing } from '../../styles/theme';

interface DemoCardGridProps {
  cards: DemoCardData[];
}

export function DemoCardGrid({ cards }: DemoCardGridProps) {
  return (
    <div style={styles.grid}>
      {cards.map((card) => (
        <DemoCard key={card.href} card={card} />
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
