/**
 * CareAiPopulationSummary — AI 인구 통계 설명
 * WO-GLYCOPHARM-CARE-CONTROL-TOWER-AI-UX-REFINE-V1
 *
 * Population + Dashboard summary 데이터를 기반으로
 * 자연어 설명 + "AI 분석 보기" 링크 제공.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import type { CareDashboardSummary, PopulationDashboardDto } from '@/api/pharmacy';

interface Props {
  summary: CareDashboardSummary | null;
  population: PopulationDashboardDto | null;
}

export default function CareAiPopulationSummary({ summary, population }: Props) {
  const navigate = useNavigate();

  const insights = useMemo(() => {
    const lines: string[] = [];

    if (summary) {
      const total = summary.totalPatients;
      if (total > 0 && summary.highRiskCount > 0) {
        const pct = Math.round((summary.highRiskCount / total) * 100);
        lines.push(`전체 환자 ${total}명 중 고위험 ${summary.highRiskCount}명 (${pct}%) 입니다.`);
      }
      if (summary.moderateRiskCount > 0) {
        lines.push(`주의 단계 환자가 ${summary.moderateRiskCount}명 있습니다.`);
      }
      if (summary.recentCoachingCount > 0) {
        lines.push(`최근 7일간 코칭 ${summary.recentCoachingCount}건이 진행되었습니다.`);
      }
    }

    if (population) {
      if (population.coaching.pending > 0) {
        lines.push(`대기 중인 AI 코칭 초안이 ${population.coaching.pending}건 있습니다.`);
      }
      if (population.activity.inactivePatients > 0) {
        lines.push(`비활성 환자 ${population.activity.inactivePatients}명 — 관리가 필요합니다.`);
      }
    }

    return lines;
  }, [summary, population]);

  if (insights.length === 0) return null;

  return (
    <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-blue-800 mb-1">AI 현황 분석</h3>
          <div className="space-y-0.5">
            {insights.map((line, i) => (
              <p key={i} className="text-sm text-blue-700 leading-relaxed">{line}</p>
            ))}
          </div>
          <button
            onClick={() => navigate('/care/analysis')}
            className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            AI 분석 보기
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
