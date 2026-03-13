/**
 * PharmacistPlaceholderPage — 약사용 시스템 임시 페이지
 * WO-GLYCOPHARM-ENTRY-SCREENS-V1
 */

import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Activity, LogOut, Users, UserPlus } from 'lucide-react';

export default function PharmacistPlaceholderPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
          <Activity className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">약사용 시스템</h1>
        <p className="text-slate-500 mb-1">
          {user?.name || user?.email || '약사'}님 환영합니다.
        </p>
        <p className="text-sm text-slate-400 mb-8">
          환자 관리와 코칭을 시작하세요.
        </p>
        <div className="w-full max-w-xs mx-auto space-y-3">
          <button
            onClick={() => navigate('/pharmacist/patients')}
            className="w-full py-3.5 text-base font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Users className="w-5 h-5" />
            환자 관리
          </button>
          <button
            onClick={() => navigate('/pharmacist/patient-requests')}
            className="w-full py-3 text-sm font-medium text-violet-600 border border-violet-200 rounded-xl hover:bg-violet-50 transition-colors flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            연결 요청 확인
          </button>
          <button
            onClick={() => navigate('/care')}
            className="w-full py-3 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Care 대시보드
          </button>
          <button
            onClick={handleLogout}
            className="w-full py-3 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
