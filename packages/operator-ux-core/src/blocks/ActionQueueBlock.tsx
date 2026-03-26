/**
 * Block 3 — Action Queue (즉시 처리 항목)
 * "오늘 반드시 처리해야 할 것"
 *
 * WO-O4O-OPERATOR-ACTION-LAYER-V1: Enhanced 모드 추가
 * - legacy ActionItem → 기존 렌더링 (하위호환)
 * - enhanced ActionQueueItem → 우선순위 색상 + AI 뱃지 + 실행 버튼
 *
 * 비어 있으면 초록 상태 (모두 처리 완료).
 */

import { Link } from 'react-router-dom';
import type { ActionItem, ActionQueueItem } from '../types';

function isEnhanced(item: ActionItem | ActionQueueItem): item is ActionQueueItem {
  return 'priority' in item && item.priority !== undefined;
}

const priorityStyles: Record<string, { border: string; badge: string; badgeText: string }> = {
  high: { border: 'border-l-red-500', badge: 'bg-red-100 text-red-700', badgeText: '긴급' },
  medium: { border: 'border-l-amber-400', badge: 'bg-amber-100 text-amber-700', badgeText: '보통' },
  low: { border: 'border-l-slate-300', badge: 'bg-slate-100 text-slate-600', badgeText: '낮음' },
};

interface ActionQueueBlockProps {
  items: (ActionItem | ActionQueueItem)[];
  onExecute?: (item: ActionQueueItem) => void;
  onDismiss?: (item: ActionQueueItem) => void;
  executing?: string | null;
}

export function ActionQueueBlock({ items, onExecute, onDismiss, executing }: ActionQueueBlockProps) {
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

  // 모든 항목이 legacy인 경우 기존 렌더링
  const hasEnhanced = items.some(isEnhanced);

  if (!hasEnhanced) {
    return (
      <section className="bg-white border border-slate-200 rounded-2xl p-4">
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Action Queue</h2>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={item.link}
                className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <span className="text-sm text-slate-700">{item.label}</span>
                <span className="text-sm font-semibold text-amber-600">
                  {item.count}건
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  // Enhanced 렌더링
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4">
      <h2 className="text-lg font-semibold text-slate-800 mb-3">Action Queue</h2>
      <ul className="space-y-2">
        {items.map((item) => {
          if (!isEnhanced(item)) {
            // legacy item 혼재 시
            return (
              <li key={item.id}>
                <Link
                  to={item.link}
                  className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm text-slate-700">{item.label}</span>
                  <span className="text-sm font-semibold text-amber-600">{item.count}건</span>
                </Link>
              </li>
            );
          }

          const style = priorityStyles[item.priority || 'medium'];
          const isExecuting = executing === item.id;

          return (
            <li
              key={item.id}
              className={`border-l-4 ${style.border} bg-white rounded-xl px-3 py-2.5 hover:bg-slate-50 transition-colors group relative`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${style.badge}`}>
                      {style.badgeText}
                    </span>
                    {item.source === 'AI' && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                        AI
                      </span>
                    )}
                    {item.title && (
                      <span className="text-sm font-medium text-slate-800 truncate">
                        {item.title}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                      {item.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.count > 0 && (
                    <span className="text-sm font-semibold text-amber-600">
                      {item.count}건
                    </span>
                  )}
                  {item.actionType === 'EXECUTE' && onExecute ? (
                    <button
                      onClick={() => onExecute(item)}
                      disabled={isExecuting}
                      className="text-xs font-medium px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isExecuting ? '처리 중...' : item.actionLabel}
                    </button>
                  ) : (
                    <Link
                      to={item.actionUrl || item.link}
                      className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      {item.actionLabel || '바로 이동'}
                    </Link>
                  )}
                </div>
              </div>
              {/* Dismiss 버튼 (hover 시 표시) */}
              {onDismiss && (
                <button
                  onClick={() => onDismiss(item)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                  title="숨기기"
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
