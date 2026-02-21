/**
 * CoachingPage - 코칭 (placeholder)
 * WO-CARE-INTERNAL-NAV-STRUCTURE-V1
 */

import { MessageSquare } from 'lucide-react';
import CareSubNav from './CareSubNav';

export default function CoachingPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <CareSubNav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">코칭</h1>
          <p className="text-sm text-slate-400">코칭 화면은 다음 단계에서 구현됩니다.</p>
        </div>
      </div>
    </div>
  );
}
