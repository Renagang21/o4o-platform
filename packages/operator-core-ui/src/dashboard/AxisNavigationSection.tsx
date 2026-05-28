/**
 * AxisNavigationSection — 2축 운영 네비게이션 카드 (공통)
 *
 * WO-O4O-OPERATOR-DASHBOARD-AXIS-NAVIGATION-COMMONIZATION-V1:
 *   KPA inline AxisNavigationSection → 공통 데이터-주도 컴포넌트로 추출.
 *   각 서비스가 axes 배열을 구성하여 주입하는 방식으로 서비스-독립 렌더링.
 *
 * KPA: extData 기반 실시간 metrics 포함
 * GP / K-Cos: 초기에는 links-only (metrics 확장은 향후 WO)
 */

import { Link } from 'react-router-dom';

export interface AxisMetric {
  label: string;
  value: number;
  href: string;
  warn?: boolean;
}

export interface AxisLink {
  key: string;
  label: string;
  href: string;
}

export interface OperatorAxisGroup {
  key: string;
  title: string;
  description?: string;
  icon?: string;
  tone?: 'blue' | 'emerald' | 'purple' | 'amber' | 'slate';
  metrics?: AxisMetric[];
  links: AxisLink[];
}

export interface AxisNavigationSectionProps {
  axes: OperatorAxisGroup[];
}

const TONE_MAP: Record<string, { border: string; link: string }> = {
  blue:    { border: 'border-blue-100',    link: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
  emerald: { border: 'border-emerald-100', link: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
  purple:  { border: 'border-purple-100',  link: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
  amber:   { border: 'border-amber-100',   link: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
  slate:   { border: 'border-slate-200',   link: 'bg-slate-100 text-slate-600 hover:bg-slate-200' },
};

export function AxisNavigationSection({ axes }: AxisNavigationSectionProps) {
  return (
    <div className={`grid grid-cols-1 gap-4${axes.length >= 2 ? ' md:grid-cols-2' : ''}`}>
      {axes.map((axis) => {
        const t = TONE_MAP[axis.tone ?? 'slate'];
        return (
          <div key={axis.key} className={`bg-white rounded-xl border ${t.border} p-5`}>
            <div className="flex items-center gap-2 mb-1">
              {axis.icon && <span>{axis.icon}</span>}
              <span className="text-sm font-semibold text-slate-800">{axis.title}</span>
            </div>
            {axis.description && (
              <p className="text-xs text-slate-400 mb-3">{axis.description}</p>
            )}
            {axis.metrics && axis.metrics.length > 0 && (
              <div
                className="grid gap-2 mb-3"
                style={{ gridTemplateColumns: `repeat(${axis.metrics.length}, 1fr)` }}
              >
                {axis.metrics.map((m) => (
                  <Link
                    key={m.href}
                    to={m.href}
                    className={`text-center py-2 px-1 rounded-lg text-xs border transition-colors hover:opacity-80 ${
                      m.warn ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50'
                    }`}
                  >
                    <div className={`text-lg font-bold ${m.warn ? 'text-amber-600' : 'text-slate-500'}`}>
                      {m.value}
                    </div>
                    <div className="text-slate-500 mt-0.5">{m.label}</div>
                  </Link>
                ))}
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              {axis.links.map((l) => (
                <Link
                  key={l.key}
                  to={l.href}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${t.link}`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
