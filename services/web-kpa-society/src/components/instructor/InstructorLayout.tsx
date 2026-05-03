/**
 * InstructorLayout - KPA Society 강사 영역 레이아웃
 *
 * WO-KPA-INSTRUCTOR-DASHBOARD-SIDEBAR-LAYOUT-V1
 *
 * 다른 운영자/관리자 화면과 동일한 좌측 사이드바 + 본문 구조.
 * KpaGlobalHeader(상단) + Sidebar(데스크톱 좌측, 모바일 상단 가로 스크롤) + Content + Footer.
 */

import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, PlusSquare, FileText, UserCircle } from 'lucide-react';
import { KpaGlobalHeader } from '../KpaGlobalHeader';
import { Footer } from '../Footer';

interface InstructorMenuItem {
  label: string;
  path?: string;
  icon: typeof LayoutDashboard;
  /** path 일치 판단 — undefined이면 prefix 매칭 */
  match?: (pathname: string) => boolean;
  /** 라우트 미구현 항목 — disabled로 표시 */
  disabled?: boolean;
  /** disabled 항목 안내 메시지 */
  hint?: string;
}

const MENU: InstructorMenuItem[] = [
  {
    label: '강사 대시보드',
    path: '/instructor',
    icon: LayoutDashboard,
    match: (p) => p === '/instructor',
  },
  {
    label: '강의 관리',
    path: '/instructor/courses',
    icon: BookOpen,
    match: (p) =>
      p === '/instructor/courses' ||
      (p.startsWith('/instructor/courses/') && p !== '/instructor/courses/new'),
  },
  {
    label: '강의 등록',
    path: '/instructor/courses/new',
    icon: PlusSquare,
    match: (p) => p === '/instructor/courses/new',
  },
  {
    label: '신청 / 심사 정보',
    icon: FileText,
    disabled: true,
    hint: '강사 대시보드 카드에서 확인',
  },
  {
    label: '프로필 관리',
    icon: UserCircle,
    disabled: true,
    hint: '강사 대시보드의 “프로필 수정” 버튼',
  },
];

interface InstructorLayoutProps {
  children: ReactNode;
}

export function InstructorLayout({ children }: InstructorLayoutProps) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <KpaGlobalHeader />

      <div className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Desktop Sidebar */}
          <aside className="w-60 flex-shrink-0 hidden md:block">
            <nav className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-20">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-400">KPA</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">강사 영역</p>
              </div>
              {MENU.map((item) => {
                const Icon = item.icon;
                const active = item.match ? item.match(pathname) : false;

                if (item.disabled) {
                  return (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 border-l-2 border-transparent cursor-not-allowed select-none"
                      title={item.hint}
                    >
                      <Icon size={18} />
                      <span className="flex-1">{item.label}</span>
                      <span className="text-[10px] text-gray-300 border border-gray-200 rounded px-1.5 py-0.5">
                        준비중
                      </span>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.path}
                    to={item.path!}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors border-l-2 ${
                      active
                        ? 'bg-blue-50 text-blue-600 border-blue-600'
                        : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Mobile Top Nav */}
          <div className="md:hidden w-full mb-4">
            <nav className="flex gap-1 overflow-x-auto bg-white rounded-xl border border-gray-200 p-1">
              {MENU.map((item) => {
                const Icon = item.icon;
                const active = item.match ? item.match(pathname) : false;

                if (item.disabled) {
                  return (
                    <span
                      key={item.label}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap text-gray-300 cursor-not-allowed"
                      title={item.hint}
                    >
                      <Icon size={14} />
                      {item.label}
                    </span>
                  );
                }

                return (
                  <Link
                    key={item.path}
                    to={item.path!}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon size={14} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>

      <Footer />
    </div>
  );
}
