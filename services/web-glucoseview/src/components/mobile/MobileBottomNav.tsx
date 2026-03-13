/**
 * MobileBottomNav — 환자 모바일 하단 네비게이션
 * WO-GLUCOSEVIEW-PATIENT-MOBILE-UX-V1
 *
 * 5탭: 홈, 입력, 분석, 코칭, 내정보
 * md 이상에서는 숨김
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { Home, ClipboardEdit, BarChart3, MessageCircle, User } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/patient', label: '홈', icon: Home, exact: true },
  { path: '/patient/glucose-input', label: '입력', icon: ClipboardEdit, exact: false },
  { path: '/patient/data-analysis', label: '분석', icon: BarChart3, exact: false },
  { path: '/patient/pharmacist-coaching', label: '코칭', icon: MessageCircle, exact: false },
  { path: '/patient/profile', label: '내정보', icon: User, exact: false },
] as const;

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (item: (typeof NAV_ITEMS)[number]) => {
    if (item.exact) {
      return location.pathname === '/' || location.pathname === '/patient';
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 md:hidden">
      <div className="max-w-md mx-auto flex items-center justify-around h-16">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                active ? 'text-teal-600' : 'text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
      {/* iOS safe area */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
