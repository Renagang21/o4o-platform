/**
 * Block 4 — Activity Log (최근 변화)
 * "최근 무엇이 일어났는가?"
 *
 * 타임라인 형태. 최근 10건.
 * 데이터 소스: action-log-core 연동 예정.
 */

import type { ActivityItem } from '../types';

function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}시간 전`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}일 전`;
  } catch {
    return timestamp;
  }
}

export function ActivityLogBlock({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <section className="bg-white border border-slate-200 rounded-2xl p-4">
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Recent Activity</h2>
        <p className="text-sm text-slate-400">최근 활동 없음</p>
      </section>
    );
  }

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4">
      <h2 className="text-lg font-semibold text-slate-800 mb-3">Recent Activity</h2>
      <ul className="space-y-3">
        {items.slice(0, 10).map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <div className="mt-1.5 w-2 h-2 rounded-full bg-slate-300 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700 truncate">{item.message}</p>
              <p className="text-xs text-slate-400">{formatTime(item.timestamp)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
