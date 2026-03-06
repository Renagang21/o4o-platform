import type { MetricStatus } from '@/api/public';

interface AnalysisSummaryProps {
  avgTimeInRange: number;
  avgTimeInRangeStatus?: MetricStatus;
  highRiskCount: number;
  moderateRiskCount: number;
  lowRiskCount: number;
  totalPatients: number;
}

function RiskBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-12 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2.5">
        <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-slate-700 w-8 text-right">{count}</span>
    </div>
  );
}

export default function AnalysisSummarySection(props: AnalysisSummaryProps) {
  const { avgTimeInRange, avgTimeInRangeStatus, highRiskCount, moderateRiskCount, lowRiskCount, totalPatients } = props;
  const isTableMissing = avgTimeInRangeStatus === 'TABLE_MISSING';

  const tirColor = isTableMissing
    ? 'text-slate-300'
    : avgTimeInRange >= 70
      ? 'text-emerald-600'
      : avgTimeInRange >= 50
        ? 'text-amber-600'
        : avgTimeInRange > 0
          ? 'text-red-600'
          : 'text-slate-300';

  return (
    <section className="py-8 px-4 sm:px-6 max-w-7xl mx-auto">
      <h2 className="text-lg font-bold text-slate-800 mb-4">분석 요약</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {/* Left: Average TIR */}
        <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-2xl p-6 border border-primary-100">
          <p className="text-xs text-slate-500 mb-1">약국 평균 Time-in-Range</p>
          {isTableMissing ? (
            <p className="text-3xl font-bold text-slate-300">--</p>
          ) : (
            <p className={`text-3xl font-bold ${tirColor}`}>
              {avgTimeInRange}
              <span className="text-sm font-normal text-slate-400 ml-1">%</span>
            </p>
          )}
          <p className="text-xs text-slate-400 mt-2">목표: 70% 이상</p>
          {!isTableMissing && avgTimeInRange > 0 && (
            <div className="mt-3 bg-white/60 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  avgTimeInRange >= 70 ? 'bg-emerald-500' : avgTimeInRange >= 50 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(avgTimeInRange, 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Right: Risk Distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <p className="text-sm font-bold text-slate-800 mb-4">위험도 분포</p>
          <div className="space-y-3">
            <RiskBar label="고위험" count={highRiskCount} total={totalPatients} color="bg-red-500" />
            <RiskBar label="주의" count={moderateRiskCount} total={totalPatients} color="bg-amber-500" />
            <RiskBar label="양호" count={lowRiskCount} total={totalPatients} color="bg-green-500" />
          </div>
        </div>
      </div>
    </section>
  );
}
