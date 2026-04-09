/**
 * LandingPage — GlycoPharm 진입 화면
 * WO-GLYCOPHARM-ENTRY-SCREENS-V1
 * WO-GLYCOPHARM-LANDING-FLOW-FIX-V1:
 *   약국용 → /login?type=pharmacy
 * WO-O4O-GLYCOPHARM-LANDING-OPERATOR-BUTTONS-REMOVE-V1:
 *   랜딩 화면에서 운영자 로그인 버튼 2종 제거
 *   (당뇨인용 운영자 → GlucoseView, 약국/약사용 운영자 → /admin/login).
 *   운영자 진입은 URL 직접 접근으로만 유지.
 *
 * MainLayout 밖에서 렌더링 (헤더/푸터 없음).
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
        <p className="text-sm text-slate-500 mt-1">약국·약사를 위한 혈당관리 전문 플랫폼</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <div>
          <button
            onClick={() => navigate('/patient')}
            className="w-full py-4 text-lg font-medium text-slate-800 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors border border-slate-200"
          >
            당뇨인용 시스템
          </button>
          <p className="text-xs text-slate-400 text-center mt-1.5">혈당·투약·운동·증상 기록 및 약사 코칭 확인</p>
        </div>
        <div>
          <button
            onClick={() => navigate('/login?type=pharmacy')}
            className="w-full py-4 text-lg font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
          >
            약국용 시스템
          </button>
          <p className="text-xs text-slate-400 text-center mt-1.5">당뇨인 데이터 열람·분석 및 코칭 작성</p>
        </div>
      </div>
    </div>
  );
}
