/**
 * CareRiskSummary — 설명 중심 Risk 요약
 * WO-GLYCOPHARM-CARE-CONTROL-TOWER-AI-UX-REFINE-V1
 *
 * 기존 bar chart를 대체하여 텍스트 중심 Risk 요약 제공.
 * "AI 분석 보기" 링크 포함.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import type { PopulationDashboardDto } from '@/api/pharmacy';

interface Props {
  population: PopulationDashboardDto | null;
}

const RISK_ITEMS = [
  { key: 'high' as const, label: '고위험', dot: 'bg-red-500', text: 'text-red-700' },
  { key: 'moderate' as const, label: '주의', dot: 'bg-amber-500', text: 'text-amber-700' },
  { key: 'low' as const, label: '양호', dot: 'bg-green-500', text: 'text-green-700' },
] as const;

export default function CareRiskSummary({ population }: Props) {
  const navigate = useNavigate();

  const { total, atRiskPct, explanation } = useMemo(() => {
    if (!population) return { total: 0, atRiskPct: 0, explanation: '' };

    const { high, moderate, low } = population.riskDistribution;
    const t = high + moderate + low;
    if (t === 0) return { total: 0, atRiskPct: 0, explanation: '분석 데이터가 없습니다.' };

    const atRisk = high + moderate;
    const pct = Math.round((atRisk / t) * 100);

    let exp = '';
    if (high > 0 && moderate > 0) {
      exp = `환자의 ${pct}%가 주의 이상 위험도입니다. 고위험 ${high}명에 대한 집중 관리가 필요합니다.`;
    } else if (high > 0) {
      exp = `고위험 환자 ${high}명에 대한 집중 관리가 필요합니다.`;
    } else if (moderate > 0) {
      exp = `주의 단계 환자 ${moderate}명이 있습니다. 악화 방지를 위한 모니터링을 권장합니다.`;
    } else {
      exp = `모든 환자가 양호한 상태입니다.`;
    }

    return { total: t, atRiskPct: pct, explanation: exp };
  }, [population]);

  if (!population || total === 0) return null;

  const { high, moderate, low } = population.riskDistribution;
  const counts = { high, moderate, low };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-blue-500" />
        <p className="text-sm font-medium text-slate-700">위험도 요약</p>
      </div>

      {/* Risk counts with color dots */}
      <div className="space-y-2.5 mb-4">
        {RISK_ITEMS.map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${item.dot}`} />
              <span className="text-sm text-slate-600">{item.label}</span>
            </div>
            <span className={`text-sm font-semibold ${item.text}`}>
              {counts[item.key]}명
            </span>
          </div>
        ))}
      </div>

      {/* AI explanation */}
      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
        <p className="text-xs text-blue-700 leading-relaxed">{explanation}</p>
      </div>

      <button
        onClick={() => navigate('/care/analysis')}
        className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
      >
        AI 분석 보기
        <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}
