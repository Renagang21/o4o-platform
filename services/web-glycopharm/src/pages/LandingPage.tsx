/**
 * LandingPage — GlycoPharm 진입 화면
 * WO-GLYCOPHARM-ENTRY-SCREENS-V1
 *
 * 두 버튼만 존재. MainLayout 밖에서 렌더링 (헤더/푸터 없음).
 */

import { useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="mb-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
          <Activity className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">GlycoPharm</h1>
        <p className="text-sm text-slate-500 mt-1">혈당관리 전문 플랫폼</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={() => navigate('/patient')}
          className="w-full py-4 text-lg font-medium text-slate-800 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200"
        >
          환자용 시스템
        </button>
        <button
          onClick={() => navigate('/pharmacy')}
          className="w-full py-4 text-lg font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
        >
          약사용 시스템
        </button>

        <div className="pt-2">
          <div className="border-t border-slate-200 mb-4" />
          <button
            onClick={() => navigate('/admin/login')}
            className="w-full py-3 text-sm font-medium text-slate-600 bg-white rounded-xl border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-colors"
          >
            운영자 / 관리자 로그인
          </button>
        </div>
      </div>
    </div>
  );
}
