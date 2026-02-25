/**
 * Block 1 — KPI Grid (상태 인지)
 * "지금 서비스 상태가 건강한가?"
 */

import { Link } from 'react-router-dom';
import type { KpiItem } from '../types';

const statusColors: Record<string, string> = {
  neutral: 'text-slate-900',
  warning: 'text-amber-600',
  critical: 'text-red-600',
};

function KpiCardContent({ item }: { item: KpiItem }) {
  return (
    <>
      <div className="text-sm text-slate-500 mb-1">{item.label}</div>
      <div className={`text-2xl font-bold ${statusColors[item.status ?? 'neutral']}`}>
        {item.value}
      </div>
      {item.delta != null && (
        <div className={`text-xs mt-1 ${item.delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {item.delta >= 0 ? '+' : ''}{item.delta}%
        </div>
      )}
    </>
  );
}

export function KpiGrid({ items }: { items: KpiItem[] }) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item) =>
          item.link ? (
            <Link
              key={item.key}
              to={item.link}
              className="bg-white border border-slate-200 rounded-2xl p-4 hover:bg-slate-50 hover:border-slate-300 transition-colors block no-underline"
            >
              <KpiCardContent item={item} />
            </Link>
          ) : (
            <div
              key={item.key}
              className="bg-white border border-slate-200 rounded-2xl p-4"
            >
              <KpiCardContent item={item} />
            </div>
          )
        )}
      </div>
    </section>
  );
}
