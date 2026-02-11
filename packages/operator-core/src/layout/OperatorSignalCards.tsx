/**
 * OperatorSignalCards - Signal Card 그리드 (3열)
 */

import type { OperatorSignalCardConfig } from '../types';
import { SignalCard } from '../components/SignalCard';

export function OperatorSignalCards({
  cards,
  loading,
}: {
  cards: OperatorSignalCardConfig[];
  loading: boolean;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {cards.map((card, i) => (
        <SignalCard key={i} config={card} loading={loading} />
      ))}
    </div>
  );
}
