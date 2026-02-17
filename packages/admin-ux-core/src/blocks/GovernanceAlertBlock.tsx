/**
 * Block C — Governance Alerts (거버넌스 경고)
 * "구조적으로 주의가 필요한 항목은?"
 *
 * Admin 대시보드의 핵심 블록.
 * 비어 있으면 초록 상태 (구조 이상 없음).
 */

import type { GovernanceAlert } from '../types';

const levelStyles: Record<string, { bg: string; border: string; text: string }> = {
  info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' },
  critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' },
};

export function GovernanceAlertBlock({ items }: { items: GovernanceAlert[] }) {
  if (items.length === 0) {
    return (
      <section className="bg-green-50 border border-green-200 rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-green-800 mb-1">Governance Alerts</h2>
        <p className="text-sm text-green-700">
          구조 이상 없음
        </p>
      </section>
    );
  }

  const maxLevel = items.some(i => i.level === 'critical') ? 'critical'
    : items.some(i => i.level === 'warning') ? 'warning' : 'info';
  const style = levelStyles[maxLevel];

  return (
    <section className={`${style.bg} border ${style.border} rounded-2xl p-4`}>
      <h2 className={`text-sm font-semibold ${style.text} mb-2`}>Governance Alerts</h2>
      <ul className="space-y-1">
        {items.map((item) => (
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
