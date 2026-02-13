/**
 * OperatorActionPanel - AI 행동 제안 패널
 *
 * WO-OPERATOR-AI-ACTION-LAYER-V1
 * WO-OPERATOR-ACTION-TRIGGER-V1
 *
 * Hero 아래, Signal Cards 위에 배치.
 * 제안이 없으면 렌더링하지 않는다.
 * navigate → 화면 이동, trigger → 대시보드 내 즉시 실행.
 */

import { useState } from 'react';
import { AlertTriangle, ArrowRight, Info, AlertCircle, Zap, Loader2 } from 'lucide-react';
import type { OperatorActionSuggestion } from '../action';

const priorityConfig = {
  high: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: AlertTriangle,
    iconColor: 'text-red-500',
    textColor: 'text-red-800',
    descColor: 'text-red-600',
    btnBg: 'bg-red-100 hover:bg-red-200 text-red-700',
  },
  medium: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: AlertCircle,
    iconColor: 'text-amber-500',
    textColor: 'text-amber-800',
    descColor: 'text-amber-600',
    btnBg: 'bg-amber-100 hover:bg-amber-200 text-amber-700',
  },
  low: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: Info,
    iconColor: 'text-blue-500',
    textColor: 'text-blue-800',
    descColor: 'text-blue-600',
    btnBg: 'bg-blue-100 hover:bg-blue-200 text-blue-700',
  },
};

export function OperatorActionPanel({
  actions,
  onNavigate,
  onTrigger,
}: {
  actions: OperatorActionSuggestion[];
  onNavigate?: (route: string) => void;
  /** 트리거 실행 핸들러. Promise를 반환하면 로딩 상태를 표시한다. */
  onTrigger?: (key: string) => void | Promise<void>;
}) {
  const [loadingTrigger, setLoadingTrigger] = useState<string | null>(null);
  const [triggerError, setTriggerError] = useState<string | null>(null);

  if (actions.length === 0) return null;

  const handleTrigger = async (key: string, confirmMessage?: string) => {
    if (!onTrigger) return;
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    setLoadingTrigger(key);
    setTriggerError(null);
    try {
      await onTrigger(key);
    } catch {
      setTriggerError(key);
    } finally {
      setLoadingTrigger(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
        운영 제안
      </h3>
      <div className="space-y-3">
        {actions.map((action) => {
          const cfg = priorityConfig[action.priority];
          const Icon = cfg.icon;
          const isLoading = loadingTrigger === action.trigger?.key;
          const hasError = triggerError === action.trigger?.key;

          return (
            <div
              key={action.id}
              className={`flex items-start gap-3 p-3 rounded-xl border ${cfg.bg} ${cfg.border}`}
            >
              <Icon size={18} className={`mt-0.5 flex-shrink-0 ${cfg.iconColor}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${cfg.textColor}`}>{action.title}</p>
                <p className={`text-xs mt-0.5 ${cfg.descColor}`}>{action.description}</p>
                {hasError && (
                  <p className="text-xs mt-1 text-red-600">실행 실패 — 다시 시도해주세요</p>
                )}
              </div>

              {/* Navigate 버튼 */}
              {action.actionType === 'navigate' && action.targetRoute && onNavigate && (
                <button
                  onClick={() => onNavigate(action.targetRoute!)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${cfg.btnBg}`}
                >
                  이동
                  <ArrowRight size={12} />
                </button>
              )}

              {/* Trigger 버튼 */}
              {action.actionType === 'trigger' && action.trigger && onTrigger && (
                <button
                  onClick={() => handleTrigger(action.trigger!.key, action.trigger!.confirmMessage)}
                  disabled={isLoading}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 disabled:opacity-50 ${cfg.btnBg}`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      실행 중
                    </>
                  ) : (
                    <>
                      <Zap size={12} />
                      실행
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
