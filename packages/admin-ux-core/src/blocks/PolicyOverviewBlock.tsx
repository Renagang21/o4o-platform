/**
 * Block B — Policy Overview (정책 현황)
 * "설정된 정책과 미설정 정책은?"
 *
 * configured / not_configured / partial 3단계 표시.
 */

import type { PolicyItem } from '../types';

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  configured: { label: '설정됨', bg: 'bg-green-100', text: 'text-green-700' },
  not_configured: { label: '미설정', bg: 'bg-slate-100', text: 'text-slate-500' },
  partial: { label: '일부 설정', bg: 'bg-amber-100', text: 'text-amber-700' },
};

export function PolicyOverviewBlock({ items }: { items: PolicyItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4">
      <h2 className="text-lg font-semibold text-slate-800 mb-3">Policy Overview</h2>
      <ul className="space-y-2">
        {items.map((item) => {
          const sc = statusConfig[item.status];
          return (
            <li key={item.key} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-2">
                {item.link ? (
                  <a href={item.link} className="text-sm text-slate-700 underline underline-offset-2">
                    {item.label}
                  </a>
                ) : (
                  <span className="text-sm text-slate-700">{item.label}</span>
                )}
                {item.version && (
                  <span className="text-xs text-slate-400">v{item.version}</span>
                )}
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                {sc.label}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
