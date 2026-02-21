/**
 * CareSubNav - Care 내부 탭형 네비게이션
 * WO-CARE-INTERNAL-NAV-STRUCTURE-V1
 *
 * 대시보드 | 환자목록 | 분석 | 코칭
 */

import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, BarChart3, MessageSquare } from 'lucide-react';

const careNavItems = [
  { path: '/care', label: '대시보드', icon: LayoutDashboard, end: true },
  { path: '/care/patients', label: '환자목록', icon: Users, end: false },
  { path: '/care/analysis', label: '분석', icon: BarChart3, end: false },
  { path: '/care/coaching', label: '코칭', icon: MessageSquare, end: false },
];

export default function CareSubNav() {
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
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
