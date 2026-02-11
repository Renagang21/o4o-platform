/**
 * OperatorHero - Hero Summary 영역
 *
 * 운영 상태 배지 + 서브 메시지 + StatusDot 목록
 */

import { CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import type { SignalStatus, OperatorHeroConfig } from '../types';
import { StatusDot } from '../components/StatusDot';

const HERO_CONFIG: Record<
  SignalStatus,
  { label: string; color: string; bgColor: string; Icon: typeof CheckCircle }
> = {
  good: { label: '정상', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200', Icon: CheckCircle },
  warning: { label: '주의', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200', Icon: AlertTriangle },
  alert: { label: '점검 필요', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', Icon: AlertCircle },
};

export function OperatorHero({
  config,
  loading,
}: {
  config: OperatorHeroConfig;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-48 mb-2" />
        <div className="h-4 bg-slate-200 rounded w-64" />
      </div>
    );
  }

  const cfg = HERO_CONFIG[config.status];
  const HeroIcon = cfg.Icon;

  return (
    <div className={`rounded-2xl border p-5 ${cfg.bgColor}`}>
      <div className="flex items-center gap-3">
        <HeroIcon className={`w-6 h-6 ${cfg.color}`} />
        <div>
          <span className={`text-lg font-semibold ${cfg.color}`}>
            {config.title}: {cfg.label}
          </span>
          {config.subtitle && (
            <p className={`text-sm mt-0.5 ${cfg.color} opacity-80`}>{config.subtitle}</p>
          )}
          {config.statusDots.length > 0 && (
            <div className="flex gap-4 mt-1 text-sm">
              {config.statusDots.map(dot => (
                <StatusDot key={dot.label} label={dot.label} status={dot.status} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
