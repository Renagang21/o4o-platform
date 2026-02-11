/**
 * StatusDot - 상태 표시 점 (Hero 내부에서 사용)
 */

import type { SignalStatus } from '../types';

const DOT_COLOR: Record<SignalStatus, string> = {
  good: 'bg-green-500',
  warning: 'bg-amber-500',
  alert: 'bg-red-500',
};

const TEXT_COLOR: Record<SignalStatus, string> = {
  good: 'text-green-600',
  warning: 'text-amber-600',
  alert: 'text-red-600',
};

export function StatusDot({ label, status }: { label: string; status: SignalStatus }) {
  return (
    <span className={`flex items-center gap-1.5 ${TEXT_COLOR[status]}`}>
      <span className={`w-2 h-2 rounded-full ${DOT_COLOR[status]}`} />
      {label}
    </span>
  );
}
