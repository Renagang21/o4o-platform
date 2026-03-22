/**
 * PharmacistPlaceholderPage — 약사용 시스템 임시 페이지
 * WO-GLYCOPHARM-ENTRY-SCREENS-V1
 * WO-GLYCOPHARM-PHARMACY-BIZ-MENU-V1:
 *   "약국 경영" 아코디언 메뉴 추가 (커뮤니티, 약국 HUB, 내 매장)
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Activity, LogOut, Users, UserPlus, Calendar, Briefcase, ChevronDown, MessageSquare, LayoutGrid, Store, BookOpen } from 'lucide-react';

export default function PharmacistPlaceholderPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [bizOpen, setBizOpen] = useState(false);

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
        <h1 className="text-2xl font-bold text-slate-800 mb-2">약국용 시스템</h1>
        <button
          onClick={() => navigate('/store/settings')}
          className="text-slate-500 mb-1 hover:text-blue-600 transition-colors cursor-pointer"
        >
          {(user?.lastName && user?.firstName) ? `${user.lastName}${user.firstName}` : user?.name || user?.email || '약국'}님 환영합니다.
        </button>
        <p className="text-sm text-slate-400 mb-8">
          당뇨인 관리와 코칭을 시작하세요.
        </p>
        <div className="w-full max-w-xs mx-auto space-y-3">
          <button
            onClick={() => navigate('/pharmacy/patients')}
            className="w-full py-3.5 text-base font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Users className="w-5 h-5" />
            당뇨인 관리
          </button>
          <button
            onClick={() => navigate('/pharmacy/patient-requests')}
            className="w-full py-3 text-sm font-medium text-violet-600 border border-violet-200 rounded-xl hover:bg-violet-50 transition-colors flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            당뇨인 연결 요청
          </button>
          <button
            onClick={() => navigate('/pharmacy/appointments')}
            className="w-full py-3 text-sm font-medium text-orange-600 border border-orange-200 rounded-xl hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            예약 관리
          </button>
          <button
            onClick={() => navigate('/care')}
            className="w-full py-3 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Care 대시보드
          </button>
          <button
            onClick={() => navigate('/care/guideline')}
            className="w-full py-3 text-sm font-medium text-amber-600 border border-amber-200 rounded-xl hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 h-4" />
            케어 가이드라인
          </button>

          {/* 약국 경영 아코디언 */}
          <div className="border border-emerald-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setBizOpen(!bizOpen)}
              className="w-full py-3 text-sm font-medium text-emerald-700 bg-white hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
            >
              <Briefcase className="w-4 h-4" />
              약국 경영
              <ChevronDown className={`w-4 h-4 transition-transform ${bizOpen ? 'rotate-180' : ''}`} />
            </button>
            {bizOpen && (
              <div className="border-t border-emerald-100 bg-emerald-50/50 space-y-1 p-2">
                <button
                  onClick={() => navigate('/community')}
                  className="w-full py-2.5 text-sm font-medium text-slate-700 bg-white rounded-lg hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  커뮤니티
                </button>
                <button
                  onClick={() => navigate('/hub')}
                  className="w-full py-2.5 text-sm font-medium text-slate-700 bg-white rounded-lg hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
                >
                  <LayoutGrid className="w-4 h-4 text-emerald-600" />
                  약국 HUB
                </button>
                <button
                  onClick={() => navigate('/store')}
                  className="w-full py-2.5 text-sm font-medium text-slate-700 bg-white rounded-lg hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Store className="w-4 h-4 text-emerald-600" />
                  내 매장
                </button>
              </div>
            )}
          </div>

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
