/**
 * OperatorActivityFeed - 최근 운영 활동 피드
 */

import { AlertCircle, FileText, MessageSquarePlus, Package, ClipboardList } from 'lucide-react';
import type { OperatorActivityItem } from '../types';
import { timeAgo } from '../utils';

const TYPE_ICON: Record<string, { bg: string; Icon: typeof FileText; color: string }> = {
  content: { bg: 'bg-blue-50', Icon: FileText, color: 'text-blue-500' },
  forum: { bg: 'bg-amber-50', Icon: MessageSquarePlus, color: 'text-amber-500' },
  order: { bg: 'bg-pink-50', Icon: Package, color: 'text-pink-500' },
  application: { bg: 'bg-orange-50', Icon: ClipboardList, color: 'text-orange-500' },
};

export function OperatorActivityFeed({
  items,
  loading,
}: {
  items: OperatorActivityItem[];
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
      <div className="p-5 border-b border-slate-100">
        <h2 className="text-lg font-semibold text-slate-800">최근 운영 활동</h2>
      </div>

      {loading ? (
        <div className="p-6 text-center text-slate-500">로딩 중...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-10">
          <AlertCircle size={40} className="mx-auto mb-4 text-slate-300" />
          <p className="text-slate-400 text-sm">최근 활동이 없습니다</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map(item => {
            const iconCfg = TYPE_ICON[item.type] || TYPE_ICON.content;
            const ItemIcon = iconCfg.Icon;
            return (
              <div key={item.id} className="p-4 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconCfg.bg}`}>
                  <ItemIcon className={`w-4 h-4 ${iconCfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{item.title}</p>
                  <p className="text-xs text-slate-400">{item.detail}</p>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">{timeAgo(item.date)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
