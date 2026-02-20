/**
 * CoachingTab - 환자 코칭 (placeholder)
 * WO-CARE-PATIENT-DETAIL-STRUCTURE-V1
 */

import { MessageSquare } from 'lucide-react';

export default function CoachingTab() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">코칭 세션</h3>

      {/* Empty state */}
      <div className="bg-slate-50 rounded-xl border border-slate-100 p-8 flex flex-col items-center justify-center min-h-[200px]">
        <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
        <p className="text-sm text-slate-500 font-medium">코칭 세션 목록</p>
        <p className="text-xs text-slate-400 mt-1">코칭 기능 구현 후 표시됩니다</p>
      </div>

      {/* Session list placeholder */}
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100"
          >
            <div className="w-2 h-2 rounded-full bg-slate-300" />
            <div className="flex-1">
              <div className="h-3 bg-slate-200 rounded w-48" />
              <div className="h-2 bg-slate-100 rounded w-32 mt-2" />
            </div>
            <div className="h-3 bg-slate-200 rounded w-16" />
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 text-center pt-4">코칭 기능은 다음 단계에서 구현됩니다.</p>
    </div>
  );
}
