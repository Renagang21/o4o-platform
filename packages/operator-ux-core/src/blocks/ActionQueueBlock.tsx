/**
 * Block 3 — Action Queue (즉시 처리 항목)
 * "오늘 반드시 처리해야 할 것"
 *
 * 비어 있으면 초록 상태 (모두 처리 완료).
 */

import type { ActionItem } from '../types';

export function ActionQueueBlock({ items }: { items: ActionItem[] }) {
  if (items.length === 0) {
    return (
      <section className="bg-green-50 border border-green-200 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-green-800 mb-1">Action Queue</h2>
        <p className="text-sm text-green-700">
          모든 항목 처리 완료
        </p>
      </section>
    );
  }

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4">
      <h2 className="text-lg font-semibold text-slate-800 mb-3">Action Queue</h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={item.link}
              className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors"
            >
              <span className="text-sm text-slate-700">{item.label}</span>
              <span className="text-sm font-semibold text-amber-600">
                {item.count}건
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
