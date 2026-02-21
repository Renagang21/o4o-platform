/**
 * AnalysisTab - 환자 분석 (placeholder)
 * WO-CARE-PATIENT-DETAIL-STRUCTURE-V1
 */

import { BarChart3, TrendingUp, Activity } from 'lucide-react';

export default function AnalysisTab() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">분석 데이터</h3>

      {/* Chart placeholder */}
      <div className="bg-slate-50 rounded-xl border border-slate-100 p-8 flex flex-col items-center justify-center min-h-[200px]">
        <BarChart3 className="w-12 h-12 text-slate-300 mb-3" />
        <p className="text-sm text-slate-500 font-medium">혈당 추이 차트</p>
        <p className="text-xs text-slate-400 mt-1">CGM 데이터 연동 후 표시됩니다</p>
      </div>

      {/* Metric placeholders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Activity, label: 'TIR (Time in Range)', value: '--' },
          { icon: TrendingUp, label: 'CV (변동계수)', value: '--' },
          { icon: BarChart3, label: '평균 혈당', value: '--' },
        ].map((metric) => (
          <div
            key={metric.label}
            className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100"
          >
            <metric.icon className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-400">{metric.label}</p>
              <p className="text-lg font-bold text-slate-700">{metric.value}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 text-center pt-4">분석 기능은 다음 단계에서 구현됩니다.</p>
    </div>
  );
}
