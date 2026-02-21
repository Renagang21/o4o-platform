/**
 * Block 5 — Quick Actions (가속기)
 * "자주 하는 작업을 빠르게"
 *
 * 카드 형태 4~8개. hub-core 재사용 가능 구조.
 */

import { Link } from 'react-router-dom';
import type { QuickActionItem } from '../types';

export function QuickActionBlock({ items }: { items: QuickActionItem[] }) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((item) => (
          <Link
            key={item.id}
            to={item.link}
            className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            {item.icon && <span className="text-lg">{item.icon}</span>}
            <span className="text-sm font-medium text-slate-700">{item.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
