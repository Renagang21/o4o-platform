/**
 * OperatorActionPanel - AI 행동 제안 패널
 *
 * WO-OPERATOR-AI-ACTION-LAYER-V1
 * Hero 아래, Signal Cards 위에 배치.
 * 제안이 없으면 렌더링하지 않는다.
 */

import { AlertTriangle, ArrowRight, Info, AlertCircle } from 'lucide-react';
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
}: {
  actions: OperatorActionSuggestion[];
  onNavigate?: (route: string) => void;
}) {
  if (actions.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
        운영 제안
      </h3>
      <div className="space-y-3">
        {actions.map((action) => {
          const config = priorityConfig[action.priority];
          const Icon = config.icon;

          return (
            <div
              key={action.id}
              className={`flex items-start gap-3 p-3 rounded-xl border ${config.bg} ${config.border}`}
            >
              <Icon size={18} className={`mt-0.5 flex-shrink-0 ${config.iconColor}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${config.textColor}`}>{action.title}</p>
                <p className={`text-xs mt-0.5 ${config.descColor}`}>{action.description}</p>
              </div>
              {action.targetRoute && onNavigate && (
                <button
                  onClick={() => onNavigate(action.targetRoute!)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${config.btnBg}`}
                >
                  이동
                  <ArrowRight size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
