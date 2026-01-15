/**
 * PartnerLayout - 파트너 대시보드 전용 레이아웃
 *
 * Work Order: WO-GLYCOPHARM-PARTNER-DASHBOARD-IMPLEMENTATION-V1
 *
 * 메뉴 항목 (고정):
 * 1. Overview
 * 2. Targets
 * 3. Content
 * 4. Events
 * 5. Status
 *
 * 금지 사항:
 * - 관리자 메뉴 스타일
 * - 승인/성과/운영 관련 UI
 * - 관리자/운영자 CTA
 */

import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Target,
  FileText,
  Calendar,
  Activity,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Handshake,
  Home,
} from 'lucide-react';

const menuItems = [
  { path: '/partner/overview', label: '요약', icon: LayoutDashboard },
  { path: '/partner/targets', label: '홍보 대상', icon: Target },
  { path: '/partner/content', label: '콘텐츠', icon: FileText },
  { path: '/partner/events', label: '이벤트 조건', icon: Calendar },
  { path: '/partner/status', label: '상태', icon: Activity },
];

export default function PartnerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <Handshake className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-800">GlycoPharm</span>
          </NavLink>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink
              to="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              <Home className="w-4 h-4" />
              홈
            </NavLink>
            <span className="mx-2 h-5 w-px bg-slate-200" />
            <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-100 text-purple-700">
              파트너 센터
            </span>
          </nav>

          {/* Mobile Section Badge */}
          <div className="md:hidden">
            <span className="px-2 py-1 rounded-lg text-xs font-medium bg-purple-100 text-purple-700">
              파트너 센터
            </span>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-14 left-0 z-40 h-[calc(100vh-56px)] w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Handshake className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-800">파트너 센터</h2>
                <p className="text-xs text-slate-500">홍보 활동 공간</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-purple-50 text-purple-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          {/* Info Notice */}
          <div className="p-4 mx-4 mb-4 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-500 leading-relaxed">
              파트너 센터는 홍보 활동을 위한 공간입니다.
              상세 문의는 GlycoPharm 운영팀에 연락해 주세요.
            </p>
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              로그아웃
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Sub Header */}
        <header className="sticky top-14 z-30 bg-white border-b border-slate-200">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Spacer for desktop */}
            <div className="hidden lg:block" />

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.name?.charAt(0) || '?'}
                  </span>
                </div>
                <span className="hidden md:block text-sm font-medium text-slate-700">
                  {user?.name}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border py-2 z-50">
                    <NavLink
                      to="/mypage"
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      마이페이지
                    </NavLink>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      로그아웃
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
