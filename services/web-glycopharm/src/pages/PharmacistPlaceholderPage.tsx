/**
 * PharmacistPlaceholderPage — 약사용 시스템 임시 페이지
 * WO-GLYCOPHARM-ENTRY-SCREENS-V1
 */

import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Activity, LogOut } from 'lucide-react';

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
          이 페이지는 준비 중입니다.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate('/care')}
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
          >
            Care 대시보드
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-600 border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
