/**
 * DashboardLayout - K-Cosmetics 운영자/파트너 대시보드 레이아웃
 * GlycoPharm 스타일 적용
 */

import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth, type UserRole } from '@/contexts/AuthContext';

interface DashboardLayoutProps {
  role: UserRole;
}

// 인라인 SVG 아이콘 컴포넌트들
const icons = {
  LayoutDashboard: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  ),
  Package: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
    </svg>
  ),
  ShoppingCart: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  ),
  Users: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Settings: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Menu: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  ),
  X: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  ),
  LogOut: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  ),
  ChevronDown: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  Shield: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  ),
  Bell: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  ),
  Search: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  ),
  Home: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  MessageSquare: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Store: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" /><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" /><path d="M2 7h20" /><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" />
    </svg>
  ),
  FileCheck: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><path d="m9 15 2 2 4-4" />
    </svg>
  ),
  Boxes: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z" /><path d="m7 16.5-4.74-2.85" /><path d="m7 16.5 5-3" /><path d="M7 16.5v5.17" /><path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z" /><path d="m17 16.5-5-3" /><path d="m17 16.5 4.74-2.85" /><path d="M17 16.5v5.17" /><path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z" /><path d="M12 8 7.26 5.15" /><path d="m12 8 4.74-2.85" /><path d="M12 13.5V8" />
    </svg>
  ),
  CreditCard: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  ),
  BarChart3: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
    </svg>
  ),
  Megaphone: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  ),
  HelpCircle: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" />
    </svg>
  ),
  FileText: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" /><line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" />
    </svg>
  ),
  Sparkles: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  ),
  Handshake: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m11 17 2 2a1 1 0 1 0 3-3" /><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" /><path d="m21 3 1 11h-2" /><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" /><path d="M3 4h8" />
    </svg>
  ),
  Monitor: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="3" rx="2" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  ),
};

type IconType = (props: { className?: string }) => JSX.Element;

interface MenuItem {
  path: string;
  label: string;
  icon: IconType;
}

interface RoleConfig {
  title: string;
  icon: IconType;
  color: string;
  menuItems: MenuItem[];
}

const roleConfig: Record<string, RoleConfig> = {
  partner: {
    title: '파트너 관리',
    icon: icons.Handshake,
    color: 'purple',
    menuItems: [
      { path: '/partner', label: '대시보드', icon: icons.LayoutDashboard },
      { path: '/partner/overview', label: '개요', icon: icons.BarChart3 },
      { path: '/partner/targets', label: '타겟 설정', icon: icons.Users },
      { path: '/partner/content', label: '콘텐츠', icon: icons.Package },
      { path: '/partner/signage/content', label: '사이니지 콘텐츠', icon: icons.Monitor },
      { path: '/partner/events', label: '이벤트', icon: icons.Megaphone },
      { path: '/partner/status', label: '현황', icon: icons.FileCheck },
    ],
  },
  operator: {
    title: '운영자 관리',
    icon: icons.Shield,
    color: 'pink',
    menuItems: [
      { path: '/operator', label: '대시보드', icon: icons.LayoutDashboard },
      { path: '/operator/stores', label: '매장 네트워크', icon: icons.Store },
      { path: '/operator/applications', label: '신청 관리', icon: icons.FileCheck },
      { path: '/operator/products', label: '상품 관리', icon: icons.Package },
      { path: '/operator/orders', label: '주문 관리', icon: icons.ShoppingCart },
      { path: '/operator/inventory', label: '재고/공급', icon: icons.Boxes },
      { path: '/operator/settlements', label: '정산 관리', icon: icons.CreditCard },
      { path: '/operator/analytics', label: '분석/리포트', icon: icons.BarChart3 },
      { path: '/operator/marketing', label: '마케팅', icon: icons.Megaphone },
      { path: '/operator/signage/content', label: '사이니지 콘텐츠', icon: icons.Monitor },
      { path: '/operator/users', label: '회원 관리', icon: icons.Users },
      { path: '/operator/support', label: '고객지원', icon: icons.HelpCircle },
      { path: '/operator/settings', label: '설정', icon: icons.Settings },
    ],
  },
};

export default function DashboardLayout({ role }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const config = roleConfig[role];
  if (!config) {
    return <div>Invalid role configuration</div>;
  }
  const RoleIcon = config.icon;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const colorClasses: Record<string, { bg: string; text: string; light: string; hover: string }> = {
    pink: { bg: 'bg-pink-600', text: 'text-pink-700', light: 'bg-pink-100', hover: 'hover:bg-pink-50' },
    purple: { bg: 'bg-purple-600', text: 'text-purple-700', light: 'bg-purple-100', hover: 'hover:bg-purple-50' },
  };
  const colors = colorClasses[config.color] || colorClasses.pink;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Global Top Navigation */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-slate-200/50">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center shadow-md`}>
              <icons.Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-800">K-Cosmetics</span>
          </NavLink>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? `${colors.light} ${colors.text}`
                  : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <icons.Home className="w-4 h-4" />
              홈
            </NavLink>
            <NavLink
              to="/forum"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? `${colors.light} ${colors.text}`
                  : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <icons.MessageSquare className="w-4 h-4" />
              포럼
            </NavLink>
            <span className="mx-2 h-5 w-px bg-slate-200" />
            <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${colors.light} ${colors.text}`}>
              {config.title}
            </span>
          </nav>

          {/* Mobile - Current Section */}
          <div className="md:hidden flex items-center gap-2">
            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${colors.light} ${colors.text}`}>
              {config.title}
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
        className={`fixed top-14 left-0 z-40 h-[calc(100vh-56px)] w-64 bg-white shadow-xl transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${colors.light} flex items-center justify-center`}>
                <RoleIcon className={`w-5 h-5 ${colors.text}`} />
              </div>
              <div>
                <h2 className="font-bold text-slate-800">{config.title}</h2>
                <p className="text-xs text-slate-500">K-Cosmetics</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
            >
              <icons.X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {config.menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === `/${role}`}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                      ? `${colors.light} ${colors.text}`
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

          {/* Sidebar Footer */}
          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <icons.LogOut className="w-5 h-5" />
              로그아웃
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64 pt-14">
        {/* Dashboard Header */}
        <header className="sticky top-14 z-30 bg-white border-b">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
            >
              <icons.Menu className="w-6 h-6" />
            </button>

            {/* Search */}
            <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="검색..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors">
                <icons.Bell className="w-5 h-5 text-slate-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center`}>
                    <span className="text-white text-sm font-medium">
                      {user?.name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <span className="hidden md:block text-sm font-medium text-slate-700">
                    {user?.name}
                  </span>
                  <icons.ChevronDown className="w-4 h-4 text-slate-400" />
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
