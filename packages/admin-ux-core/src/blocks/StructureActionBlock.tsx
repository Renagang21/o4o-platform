/**
 * Block D — Quick Structure Actions (구조 변경 진입점)
 * "구조를 변경하려면 어디로 가는가?"
 *
 * Admin 전용 진입점. Operator의 Quick Actions와 대상이 다름.
 */

import type { StructureAction } from '../types';

export function StructureActionBlock({ items }: { items: StructureAction[] }) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Structure Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {items.map((item) => (
          <a
            key={item.id}
            href={item.link}
            className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            {item.icon && <span className="text-lg">{item.icon}</span>}
            <div className="min-w-0">
              <span className="text-sm font-medium text-slate-700 block">{item.label}</span>
              {item.description && (
                <span className="text-xs text-slate-400 block truncate">{item.description}</span>
              )}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
