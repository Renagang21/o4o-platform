/**
 * PharmacyPlaceholderPage — 약사용 시스템 임시 페이지
 * WO-GLYCOPHARM-ENTRY-SCREENS-V1
 * WO-GLYCOPHARM-PHARMACY-BIZ-MENU-V1:
 *   "약국 경영" 아코디언 메뉴 추가 (커뮤니티, 약국 HUB, 내 매장)
 * WO-O4O-GLYCOPHARM-PHARMACY-ONLY-ROLE-CLEANUP-V1 Phase 4-C1:
 *   file/component PharmacistPlaceholderPage → PharmacyPlaceholderPage 표준화.
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Activity, LogOut, Users, UserPlus, Calendar, Briefcase, ChevronDown, MessageSquare, LayoutGrid, Store, Info } from 'lucide-react';

export default function PharmacyPlaceholderPage() {
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
        <h1 className="text-2xl font-bold text-slate-800 mb-2">약국 메인</h1>
        <button
          onClick={() => navigate('/store/settings')}
          className="text-slate-500 mb-1 hover:text-blue-600 transition-colors cursor-pointer"
        >
          {(user?.lastName && user?.firstName) ? `${user.lastName}${user.firstName}` : user?.name || user?.email || '약국'}님 환영합니다.
        </button>
        <p className="text-sm text-slate-400 mb-6">
          등록된 당뇨인을 관리하고 상담을 진행하세요.
        </p>

        {/* WO-O4O-GLYCOPHARM-ADMIN-OPERATOR-TERM-AND-UI-CONSISTENCY-CLEANUP-V1
            약국 등록 안내: 약사 승인만으로는 당뇨인 검색 노출이 되지 않음 */}
        <div className="w-full max-w-xs mx-auto mb-6 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-left">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
          <div className="text-[12px] leading-relaxed text-blue-800">
            <p className="font-semibold">당뇨인 검색에 노출되려면 약국 등록이 필요합니다.</p>
            <p className="mt-0.5 text-blue-700">
              회원 가입만으로는 당뇨인이 약국을 찾을 수 없습니다. 아래 <span className="font-medium">약국 경영 → 내 매장</span>에서 약국 등록·승인을 완료해 주세요.
            </p>
          </div>
        </div>
        <div className="w-full max-w-xs mx-auto space-y-3">
          <button
            onClick={() => navigate('/pharmacy/patients')}
            className="w-full py-3.5 text-base font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors flex flex-col items-center justify-center gap-0.5"
          >
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              당뇨인 관리
            </span>
            <span className="text-xs font-normal text-blue-100">등록된 당뇨인 목록 · 건강 기록 확인</span>
          </button>

          {/* WO-O4O-GLYCOPHARM-PHARMACY-MENU-LABEL-AND-CONSULTATION-VISIBILITY-REFINE-V1 */}
          <button
            onClick={() => navigate('/pharmacy/appointments')}
            className="w-full p-4 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-orange-800">상담 예약 관리</p>
                <p className="text-xs text-orange-600/70">상담 요청 승인 · 일정 확인 · 결과 기록</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/pharmacy/patient-requests')}
            className="w-full py-3 text-sm font-medium text-violet-600 border border-violet-200 rounded-xl hover:bg-violet-50 transition-colors flex flex-col items-center justify-center gap-0.5"
          >
            <span className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              당뇨인 연결 요청
            </span>
            <span className="text-[11px] font-normal text-violet-400">환자가 보낸 약사 연결 신청 승인</span>
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
