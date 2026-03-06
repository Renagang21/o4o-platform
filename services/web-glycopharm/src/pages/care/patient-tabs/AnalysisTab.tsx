/**
 * AnalysisTab - 환자 분석 결과 (live)
 * WO-O4O-PATIENT-DETAIL-CARE-WORKSPACE-V1
 *
 * API:
 *   GET /api/v1/care/analysis/:patientId → TIR/CV/Risk + insights
 *   GET /api/v1/care/kpi/:patientId → 트렌드 비교
 */

import { useState, useEffect } from 'react';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Loader2,
  Lightbulb,
} from 'lucide-react';
import { pharmacyApi, type CareInsightDto, type KpiComparisonDto } from '@/api/pharmacy';
import { usePatientDetail } from '../PatientDetailPage';

const RISK_DISPLAY = {
  high: { label: '고위험', cls: 'bg-red-100 text-red-700', Icon: AlertTriangle },
  moderate: { label: '주의', cls: 'bg-amber-100 text-amber-700', Icon: AlertCircle },
  low: { label: '양호', cls: 'bg-green-100 text-green-700', Icon: CheckCircle },
} as const;

const TREND_DISPLAY = {
  improving: { label: '개선 중', cls: 'text-green-600', Icon: TrendingUp },
  stable: { label: '유지', cls: 'text-slate-500', Icon: Minus },
  worsening: { label: '악화', cls: 'text-red-600', Icon: TrendingDown },
} as const;

export default function AnalysisTab() {
  const { patient } = usePatientDetail();
  const [analysis, setAnalysis] = useState<CareInsightDto | null>(null);
  const [kpi, setKpi] = useState<KpiComparisonDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patient?.id) return;
    setLoading(true);
    Promise.all([
      pharmacyApi.getCareAnalysis(patient.id).catch(() => null),
      pharmacyApi.getCareKpi(patient.id).catch(() => null),
    ]).then(([a, k]) => {
      setAnalysis(a);
      setKpi(k);
    }).finally(() => setLoading(false));
  }, [patient?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-slate-50 rounded-xl border border-slate-100 p-8 flex flex-col items-center justify-center min-h-[200px]">
        <BarChart3 className="w-12 h-12 text-slate-300 mb-3" />
        <p className="text-sm text-slate-500 font-medium">분석 데이터 없음</p>
        <p className="text-xs text-slate-400 mt-1">건강 데이터를 먼저 입력해 주세요.</p>
      </div>
    );
  }

  const riskKey = analysis.riskLevel in RISK_DISPLAY ? analysis.riskLevel : 'low';
  const risk = RISK_DISPLAY[riskKey as keyof typeof RISK_DISPLAY];
  const trend = kpi?.riskTrend && kpi.riskTrend in TREND_DISPLAY
    ? TREND_DISPLAY[kpi.riskTrend as keyof typeof TREND_DISPLAY]
    : null;

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">분석 결과</h3>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* TIR */}
        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <Activity className="w-5 h-5 text-blue-500" />
          <div className="flex-1">
            <p className="text-xs text-slate-400">TIR (Time in Range)</p>
            <p className="text-2xl font-bold text-slate-800">{analysis.tir}%</p>
            {kpi?.tirChange != null && (
              <p className={`text-xs ${kpi.tirChange > 0 ? 'text-green-600' : kpi.tirChange < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                {kpi.tirChange > 0 ? '+' : ''}{kpi.tirChange}% vs 이전
              </p>
            )}
          </div>
        </div>

        {/* CV */}
        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <TrendingUp className="w-5 h-5 text-amber-500" />
          <div className="flex-1">
            <p className="text-xs text-slate-400">CV (변동계수)</p>
            <p className="text-2xl font-bold text-slate-800">{analysis.cv}%</p>
            {kpi?.cvChange != null && (
              <p className={`text-xs ${kpi.cvChange < 0 ? 'text-green-600' : kpi.cvChange > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                {kpi.cvChange > 0 ? '+' : ''}{kpi.cvChange}% vs 이전
              </p>
            )}
          </div>
        </div>

        {/* Risk Level */}
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${risk.cls}`}>
          <risk.Icon className="w-5 h-5" />
          <div className="flex-1">
            <p className="text-xs opacity-70">위험도</p>
            <p className="text-2xl font-bold">{risk.label}</p>
            {trend && (
              <div className={`flex items-center gap-1 text-xs ${trend.cls}`}>
                <trend.Icon className="w-3 h-3" />
                {trend.label}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Insights */}
      {analysis.insights.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-600 mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            분석 인사이트
          </h4>
          <div className="space-y-2">
            {analysis.insights.map((insight, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100"
              >
                <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                  {i + 1}
                </div>
                <p className="text-sm text-amber-800">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart Placeholder */}
      <div className="bg-slate-50 rounded-xl border border-slate-100 p-8 flex flex-col items-center justify-center min-h-[160px]">
        <BarChart3 className="w-10 h-10 text-slate-300 mb-2" />
        <p className="text-sm text-slate-500 font-medium">혈당 추이 차트</p>
        <p className="text-xs text-slate-400 mt-1">Phase 2에서 구현 예정</p>
      </div>
    </div>
  );
}
