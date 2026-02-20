/**
 * HistoryTab - 환자 기록 타임라인 (placeholder)
 * WO-CARE-PATIENT-DETAIL-STRUCTURE-V1
 */

import { Clock } from 'lucide-react';

export default function HistoryTab() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">활동 기록</h3>

      {/* Timeline placeholder */}
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200" />
        <div className="space-y-6 pl-10">
          {[
            { date: '2026-02-18', text: '분석 리포트 생성', type: 'analysis' },
            { date: '2026-02-15', text: '코칭 세션 진행', type: 'coaching' },
            { date: '2026-02-10', text: '환자 등록', type: 'register' },
          ].map((item, i) => (
            <div key={i} className="relative">
              <div className="absolute -left-10 top-1 w-3 h-3 rounded-full bg-slate-300 border-2 border-white" />
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span className="text-xs text-slate-400">{item.date}</span>
                </div>
                <p className="text-sm text-slate-600">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-400 text-center pt-4">기록 기능은 다음 단계에서 구현됩니다.</p>
    </div>
  );
}
