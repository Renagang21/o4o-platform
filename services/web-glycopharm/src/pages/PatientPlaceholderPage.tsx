/**
 * PatientMainPage — 환자용 메인 메뉴 화면
 * WO-GLYCOPHARM-PATIENT-MAIN-SCREEN-V1
 *
 * 메뉴형 시스템: 5개 기능 버튼으로 구성
 * - 개인 설정 관리
 * - 데이터 입력 및 조회
 * - 데이터 분석 확인
 * - 약사 코칭 확인
 * - 당뇨 케어 가이드라인
 */

import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Activity, LogOut, Settings, ClipboardEdit, BarChart3, MessageCircle, BookOpen, Building2, ChevronRight } from 'lucide-react';

const MENU_ITEMS = [
  {
    label: '약국 연결',
    description: '담당 약국 선택 및 연결 요청',
    path: '/patient/select-pharmacy',
    icon: Building2,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
  },
  {
    label: '개인 설정 관리',
    description: '내 정보 및 알림 설정',
    path: '/patient/profile',
    icon: Settings,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
  },
  {
    label: '데이터 입력 및 조회',
    description: '혈당·식사·운동 데이터 기록',
    path: '/patient/glucose-input',
    icon: ClipboardEdit,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    label: '데이터 분석 확인',
    description: '혈당 추이 및 패턴 분석',
    path: '/patient/data-analysis',
    icon: BarChart3,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    label: '약사 코칭 확인',
    description: '약사 상담 내역 및 조언',
    path: '/patient/pharmacist-coaching',
    icon: MessageCircle,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
  {
    label: '당뇨 케어 가이드라인',
    description: '당뇨 관리 교육 자료',
    path: '/patient/care-guideline',
    icon: BookOpen,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
] as const;

export default function PatientMainPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-white px-4 py-8">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-3">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">
            {user?.name || user?.email || '환자'}님
          </h1>
          <p className="text-sm text-slate-500 mt-1">GlycoPharm 환자용 시스템</p>
        </div>

        {/* Menu Items */}
        <div className="space-y-3">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left"
              >
                <div className={`w-12 h-12 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-slate-800">{item.label}</p>
                  <p className="text-sm text-slate-400">{item.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <div className="mt-8 text-center">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
