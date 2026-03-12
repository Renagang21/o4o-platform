/**
 * PharmacistCoachingPage — 약사 코칭 확인 (Placeholder)
 * WO-GLYCOPHARM-PATIENT-MAIN-SCREEN-V1
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';

export default function PharmacistCoachingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
          <MessageCircle className="w-8 h-8 text-violet-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">약사 코칭 확인</h1>
        <p className="text-sm text-slate-400 mb-8">이 페이지는 준비 중입니다.</p>
        <button
          onClick={() => navigate('/patient')}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </button>
      </div>
    </div>
  );
}
