/**
 * CareAiChatEntry — AI Chat 진입점
 * WO-GLYCOPHARM-CARE-AI-CHAT-SYSTEM-V1
 *
 * Population 모드: patientId 없이 렌더링 (Dashboard)
 * Patient 모드: patientId/patientName 전달 (PatientDetailPage)
 *
 * 클릭 시 CareAiChatPanel 슬라이드 아웃 열기.
 */

import { useState } from 'react';
import { MessageCircle, Sparkles } from 'lucide-react';
import CareAiChatPanel from './CareAiChatPanel';

interface CareAiChatEntryProps {
  patientId?: string;
  patientName?: string;
}

const POPULATION_QUESTIONS = [
  '오늘 관리해야 할 당뇨인는?',
  '야간 저혈당 당뇨인는?',
  'TIR이 가장 낮은 당뇨인는?',
];

const PATIENT_QUESTIONS = [
  '이 당뇨인의 최근 혈당 추세는?',
  '위험 요인을 요약해 주세요',
  '코칭에서 다뤄야 할 주제는?',
];

export default function CareAiChatEntry({ patientId, patientName }: CareAiChatEntryProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [initialQuestion, setInitialQuestion] = useState<string | undefined>();

  const questions = patientId ? PATIENT_QUESTIONS : POPULATION_QUESTIONS;

  const openWithQuestion = (q: string) => {
    setInitialQuestion(q);
    setPanelOpen(true);
  };

  const openPanel = () => {
    setInitialQuestion(undefined);
    setPanelOpen(true);
  };

  return (
    <>
      <div className="bg-gradient-to-r from-blue-50 to-primary-50 rounded-2xl border border-blue-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                {patientId ? '이 당뇨인에 대해 AI에게 물어보세요' : '당뇨인에 대해 AI에게 물어보세요'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {patientId ? '당뇨인 데이터 기반 AI 분석' : '당뇨인 데이터 기반 AI 분석을 질문할 수 있습니다'}
              </p>
            </div>
          </div>
          <button
            onClick={openPanel}
            className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            AI에게 질문하기
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {questions.map((q) => (
            <button
              key={q}
              onClick={() => openWithQuestion(q)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              {q}
            </button>
          ))}
        </div>
      </div>

      <CareAiChatPanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        patientId={patientId}
        patientName={patientName}
        initialQuestion={initialQuestion}
      />
    </>
  );
}
