/**
 * Block A — Structure Snapshot (구조 상태 지표)
 * "플랫폼 구조가 건강한가?"
 *
 * Admin은 '구조 정의자'이므로 운영 KPI가 아닌 구조 지표를 표시한다.
 */

import type { StructureMetric } from '../types';

const statusColors: Record<string, string> = {
  stable: 'text-slate-900',
  attention: 'text-amber-600',
  critical: 'text-red-600',
};

export function StructureSnapshotBlock({ items }: { items: StructureMetric[] }) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Structure Snapshot</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item) => (
          <div
            key={item.key}
            className="bg-white border border-slate-200 rounded-2xl p-4"
          >
            <div className="text-sm text-slate-500 mb-1">{item.label}</div>
            <div className={`text-2xl font-bold ${statusColors[item.status ?? 'stable']}`}>
              {item.value}
            </div>
            {item.previousValue != null && (
              <div className="text-xs mt-1 text-slate-400">
                이전: {item.previousValue}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
