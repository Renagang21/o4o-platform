/**
 * HubSection — 섹션 (제목 + 카드 그리드)
 *
 * WO-PLATFORM-HUB-CORE-EXTRACTION-V1
 */

import type { HubCardDefinition, HubSignal } from '../types.js';
import { HubCard } from './HubCard.js';

interface HubSectionProps {
  title: string;
  badge?: string;
  cards: HubCardDefinition[];
  signals?: Record<string, HubSignal>;
  onCardClick?: (href: string) => void;
}

export function HubSection({ title, badge, cards, signals, onCardClick }: HubSectionProps) {
  if (cards.length === 0) return null;

  return (
    <section style={styles.section}>
      <div style={styles.header}>
        <h2 style={styles.title}>{title}</h2>
        {badge && <span style={styles.badge}>{badge}</span>}
      </div>
      <div style={styles.cardGrid}>
        {cards.map((card) => (
          <HubCard
            key={card.id}
            card={card}
            signal={card.signalKey ? signals?.[card.signalKey] : undefined}
            onClick={onCardClick}
          />
        ))}
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    marginBottom: '32px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  badge: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
};
