/**
 * PatientAiSummary — 당뇨인 AI 요약 패널
 * WO-GLYCOPHARM-CARE-CONTROL-TOWER-AI-UX-REFINE-V1
 *
 * PatientDetailPage 헤더 아래 / 탭 위에 표시.
 * LLM insight + KPI 추세를 기반으로 AI 요약 제공.
 */

import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { pharmacyApi, type CareLlmInsightDto, type KpiComparisonDto } from '@/api/pharmacy';

interface Props {
  patientId: string;
}

const TREND_CONFIG = {
  improving: { label: '개선 중', cls: 'text-green-700 bg-green-100', Icon: TrendingUp },
  worsening: { label: '악화 추세', cls: 'text-red-700 bg-red-100', Icon: TrendingDown },
  stable: { label: '유지', cls: 'text-slate-600 bg-slate-100', Icon: Minus },
} as const;

export default function PatientAiSummary({ patientId }: Props) {
  const [insight, setInsight] = useState<CareLlmInsightDto | null>(null);
  const [kpi, setKpi] = useState<KpiComparisonDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      pharmacyApi.getCareLlmInsight(patientId).catch(() => null),
      pharmacyApi.getCareKpi(patientId).catch(() => null),
    ]).then(([llm, k]) => {
      setInsight(llm);
      setKpi(k);
    }).finally(() => setLoading(false));
  }, [patientId]);

  if (loading) return null;

  const hasInsight = insight?.pharmacyInsight;
  const hasKpi = kpi?.latestTir != null;

  if (!hasInsight && !hasKpi) {
    return (
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-slate-400" />
          <p className="text-sm text-slate-500">
            분석 데이터가 없습니다. 건강 데이터를 입력하면 AI 요약이 생성됩니다.
          </p>
        </div>
      </div>
    );
  }

  const trendKey = kpi?.riskTrend && kpi.riskTrend in TREND_CONFIG
    ? kpi.riskTrend as keyof typeof TREND_CONFIG
    : null;

  return (
    <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 mb-4">
      <div className="flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-blue-800">AI 분석 요약</h3>
            {trendKey && (() => {
              const trend = TREND_CONFIG[trendKey];
              return (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${trend.cls}`}>
                  <trend.Icon className="w-3 h-3" />
                  {trend.label}
                </span>
              );
            })()}
          </div>

          {/* KPI trend */}
          {hasKpi && (
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs text-blue-600">
                TIR {kpi!.latestTir}%
                {kpi!.tirChange != null && kpi!.tirChange !== 0 && (
                  <span className={kpi!.tirChange > 0 ? 'text-green-600' : 'text-red-600'}>
                    {' '}({kpi!.tirChange > 0 ? '+' : ''}{kpi!.tirChange}%)
                  </span>
                )}
              </span>
              {kpi!.latestCv != null && (
                <span className="text-xs text-blue-600">
                  CV {kpi!.latestCv}%
                </span>
              )}
            </div>
          )}

          {/* LLM insight text */}
          {hasInsight && (
            <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-line">
              {insight!.pharmacyInsight}
            </p>
          )}

          {/* Model + timestamp */}
          {insight?.createdAt && (
            <p className="text-[10px] text-blue-400 mt-2">
              {new Date(insight.createdAt).toLocaleString('ko-KR')}
              {insight.model && ` | ${insight.model}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
