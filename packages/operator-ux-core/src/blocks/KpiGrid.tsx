/**
 * Block 1 — KPI Grid (상태 인지)
 * "지금 서비스 상태가 건강한가?"
 */

import type { KpiItem } from '../types';

const statusColors: Record<string, string> = {
  neutral: 'text-slate-900',
  warning: 'text-amber-600',
  critical: 'text-red-600',
};

export function KpiGrid({ items }: { items: KpiItem[] }) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item) => (
          <div
            key={item.key}
            className="bg-white border border-slate-200 rounded-2xl p-4"
          >
            <div className="text-sm text-slate-500 mb-1">{item.label}</div>
            <div className={`text-2xl font-bold ${statusColors[item.status ?? 'neutral']}`}>
              {item.value}
            </div>
            {item.delta != null && (
              <div className={`text-xs mt-1 ${item.delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {item.delta >= 0 ? '+' : ''}{item.delta}%
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
