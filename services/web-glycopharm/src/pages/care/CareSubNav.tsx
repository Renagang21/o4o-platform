/**
 * CareSubNav - Care 내부 탭형 네비게이션
 * WO-CARE-INTERNAL-NAV-STRUCTURE-V1
 *
 * 대시보드 | 당뇨인목록 | 분석 | 코칭
 */

import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, BarChart3, MessageSquare, BookOpen, ClipboardList, UserPlus } from 'lucide-react';
import { usePharmacyUnread } from '@/hooks/usePharmacyUnread';

const careNavItems = [
  { path: '/care', label: '대시보드', icon: LayoutDashboard, end: true },
  { path: '/care/patients', label: '당뇨인목록', icon: Users, end: false },
  { path: '/care/patient-requests', label: '당뇨인 연결 요청', icon: UserPlus, end: false },
  { path: '/care/analysis', label: '분석', icon: BarChart3, end: false },
  { path: '/care/coaching', label: '코칭', icon: MessageSquare, end: false },
  { path: '/care/guideline', label: '가이드라인', icon: BookOpen, end: false },
  { path: '/care/records', label: '전체기록', icon: ClipboardList, end: false },
];

export default function CareSubNav() {
  const { totalCount } = usePharmacyUnread();

  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex gap-1 overflow-x-auto">
          {careNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
              {item.label === '당뇨인목록' && totalCount > 0 && (
                <span className="min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                  {totalCount > 99 ? '99+' : totalCount}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
