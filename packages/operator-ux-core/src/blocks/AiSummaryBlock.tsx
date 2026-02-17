/**
 * Block 2 — AI Summary (판단 보조)
 * "운영자가 지금 무엇을 우선해야 하는가?"
 *
 * AI가 없어도 동작한다. 비어 있으면 "특이사항 없음" 표시.
 */

import type { AiSummaryItem } from '../types';

const levelStyles: Record<string, { bg: string; border: string; text: string }> = {
  info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' },
  critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' },
};

export function AiSummaryBlock({ items }: { items: AiSummaryItem[] }) {
  if (items.length === 0) {
    return (
      <section className="bg-green-50 border border-green-200 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-green-800 mb-1">AI Summary</h2>
        <p className="text-sm text-green-700">
          현재 특이사항 없음
        </p>
      </section>
    );
  }

  // Use the highest severity level for the container
  const maxLevel = items.some(i => i.level === 'critical') ? 'critical'
    : items.some(i => i.level === 'warning') ? 'warning' : 'info';
  const style = levelStyles[maxLevel];

  return (
    <section className={`${style.bg} border ${style.border} rounded-2xl p-4`}>
      <h2 className={`text-sm font-semibold ${style.text} mb-2`}>AI Summary</h2>
      <ul className="space-y-1">
        {items.slice(0, 3).map((item) => (
          <li key={item.id} className={`text-sm ${levelStyles[item.level].text}`}>
            {item.link ? (
              <a href={item.link} className="underline underline-offset-2">
                {item.message}
              </a>
            ) : (
              item.message
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
