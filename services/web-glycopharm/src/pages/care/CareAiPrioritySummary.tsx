/**
 * CareAiPrioritySummary — Priority Patients AI 요약
 * WO-GLYCOPHARM-CARE-CONTROL-TOWER-AI-UX-REFINE-V1
 *
 * Priority 당뇨인 데이터에서 AI reason을 수집하여
 * 요약 설명 + "AI 분석 보기" 링크 제공.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import type { PriorityPatientDto, AiPriorityPatientDto } from '@/api/pharmacy';

interface Props {
  patients: (PriorityPatientDto | AiPriorityPatientDto)[];
}

export default function CareAiPrioritySummary({ patients }: Props) {
  const navigate = useNavigate();

  const { lines, topPatientId } = useMemo(() => {
    const result: string[] = [];
    let firstHighId: string | null = null;

    const highRiskCount = patients.filter(p => p.riskLevel === 'high').length;
    if (highRiskCount > 0) {
      result.push(`고위험 당뇨인 ${highRiskCount}명이 우선 관리 대상입니다.`);
      firstHighId = patients.find(p => p.riskLevel === 'high')?.patientId ?? null;
    }

    // Collect unique AI reasons
    const aiReasons: string[] = [];
    let aiAdjustedCount = 0;
    for (const p of patients) {
      if ('aiAdjustment' in p && p.aiAdjustment !== 0) {
        aiAdjustedCount++;
      }
      if ('aiReason' in p && p.aiReason) {
        const reason = p.aiReason;
        if (!aiReasons.includes(reason)) {
          aiReasons.push(reason);
        }
      }
    }

    if (aiReasons.length > 0) {
      const topReasons = aiReasons.slice(0, 3).join(' / ');
      result.push(topReasons);
    }

    if (aiAdjustedCount > 0) {
      result.push(`AI 분석으로 ${aiAdjustedCount}명의 우선순위가 조정되었습니다.`);
    }

    if (!firstHighId && patients.length > 0) {
      firstHighId = patients[0].patientId;
    }

    return { lines: result, topPatientId: firstHighId };
  }, [patients]);

  if (lines.length === 0) return null;

  return (
    <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-blue-800 mb-1">AI 우선순위 분석</h3>
          <div className="space-y-0.5">
            {lines.map((line, i) => (
              <p key={i} className="text-sm text-blue-700 leading-relaxed">{line}</p>
            ))}
          </div>
          {topPatientId && (
            <button
              onClick={() => navigate(`/care/patients/${topPatientId}/analysis`)}
              className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              AI 분석 보기
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
