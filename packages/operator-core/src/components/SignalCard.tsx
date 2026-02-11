/**
 * SignalCard - 행동 유도 카드 (Signal 기반)
 *
 * 구성: 아이콘 + 타이틀 → Signal 메시지 → 액션 버튼
 */

import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { SignalStatus, OperatorSignalCardConfig } from '../types';

const SIGNAL_BG: Record<SignalStatus, string> = {
  good: 'bg-green-50',
  warning: 'bg-amber-50',
  alert: 'bg-red-50',
};

const SIGNAL_TEXT: Record<SignalStatus, string> = {
  good: 'text-green-700',
  warning: 'text-amber-700',
  alert: 'text-red-700',
};

export function SignalCard({
  config,
  loading,
}: {
  config: OperatorSignalCardConfig;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 animate-pulse">
        <div className="h-10 w-10 bg-slate-200 rounded-xl mb-4" />
        <div className="h-5 bg-slate-200 rounded w-24 mb-2" />
        <div className="h-4 bg-slate-200 rounded w-40 mb-4" />
        <div className="h-9 bg-slate-200 rounded w-full" />
      </div>
    );
  }

  const Icon = config.icon;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 ${config.iconBg} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${config.iconColor}`} />
        </div>
        <h3 className="font-semibold text-slate-800">{config.title}</h3>
      </div>

      <div className={`rounded-lg px-3 py-2 mb-4 ${SIGNAL_BG[config.signal.status]}`}>
        <p className={`text-sm font-medium ${SIGNAL_TEXT[config.signal.status]}`}>
          {config.signal.message}
        </p>
      </div>

      <Link
        to={config.actionLink}
        className="mt-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors text-sm"
      >
        {config.actionLabel}
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
