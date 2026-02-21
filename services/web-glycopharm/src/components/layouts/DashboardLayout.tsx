import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Building2,
  Truck,
  Handshake,
  Shield,
  Bell,
  Search,
  Activity,
  Home,
  MessageSquare,
  BookOpen,
  Tv,
  FileCheck,
  Monitor,
  Tag,
  Store,
  BarChart3,
  Boxes,
  CreditCard,
  Megaphone,
  HelpCircle,
  FileText,
  Briefcase,
} from 'lucide-react';

interface DashboardLayoutProps {
  role: UserRole;
}

/**
 * WO-GLYCOPHARM-ADMIN-AREA-V1:
 * - admin config 추가 (구조 관리: 약국 네트워크, 회원 관리, 설정)
 * - operator에서 구조 기능 제거 (pharmacies, users, settings → /admin)
 */
const roleConfig: Record<string, { title: string; icon: typeof Building2; color: string; menuItems: Array<{ path: string; label: string; icon: typeof LayoutDashboard }> }> = {
  admin: {
    title: '관리자',
    icon: Shield,
    color: 'red',
    menuItems: [
      { path: '/admin', label: '대시보드', icon: LayoutDashboard },
      { path: '/admin/pharmacies', label: '약국 네트워크', icon: Store },
      { path: '/admin/users', label: '회원 관리', icon: Users },
      { path: '/admin/settings', label: '설정', icon: Settings },
    ],
  },
  pharmacy: {
    title: '약국 관리',
    icon: Building2,
    color: 'primary',
    menuItems: [
      { path: '/store', label: '대시보드', icon: LayoutDashboard },
      { path: '/store/identity', label: '매장 메인', icon: Store },
      { path: '/store/b2b-order', label: 'B2B 주문', icon: ShoppingCart },
      { path: '/store/products', label: '상품 관리', icon: Package },
      { path: '/store/orders', label: '주문 내역', icon: ShoppingCart },
      { path: '/store/services', label: '고객 관리', icon: Users },
      { path: '/store/signage', label: '스마트 디스플레이', icon: Tv },
      { path: '/store/content', label: '콘텐츠 가져오기', icon: Monitor },
      { path: '/store/signage/library', label: '콘텐츠 라이브러리', icon: Monitor },
      { path: '/store/signage/my', label: '내 사이니지', icon: Tv },
      { path: '/store/market-trial', label: 'Market Trial', icon: Tag },
      { path: '/store/funnel', label: '전환 퍼널', icon: BarChart3 },
      { path: '/store/management', label: '약국 경영', icon: Briefcase },
      { path: '/store/settings', label: '설정', icon: Settings },
    ],
  },
  supplier: {
    title: '공급자 관리',
    icon: Truck,
    color: 'blue',
    menuItems: [
      { path: '/supplier', label: '대시보드', icon: LayoutDashboard },
      { path: '/supplier/products', label: '상품 관리', icon: Package },
      { path: '/supplier/orders', label: '주문 현황', icon: ShoppingCart },
      { path: '/supplier/settings', label: '설정', icon: Settings },
    ],
  },
  partner: {
    title: '파트너 관리',
    icon: Handshake,
    color: 'purple',
    menuItems: [
      { path: '/partner', label: '대시보드', icon: LayoutDashboard },
      { path: '/partner/contents', label: '컨텐츠 관리', icon: Package },
      { path: '/partner/analytics', label: '분석', icon: ShoppingCart },
      { path: '/partner/signage/content', label: '콘텐츠 가져오기', icon: Monitor },
      { path: '/partner/signage/library', label: '콘텐츠 라이브러리', icon: Monitor },
      { path: '/partner/signage/my', label: '내 사이니지', icon: Tv },
      { path: '/partner/settings', label: '설정', icon: Settings },
    ],
  },
  operator: {
    title: '운영자 관리',
    icon: Shield,
    color: 'red',
    menuItems: [
      { path: '/operator', label: '대시보드', icon: LayoutDashboard },
      { path: '/operator/applications', label: '신청 관리', icon: FileCheck },
      { path: '/operator/products', label: '상품 관리', icon: Package },
      { path: '/operator/orders', label: '주문 관리', icon: ShoppingCart },
      { path: '/operator/inventory', label: '재고/공급', icon: Boxes },
      { path: '/operator/settlements', label: '정산 관리', icon: CreditCard },
      { path: '/operator/analytics', label: '분석/리포트', icon: BarChart3 },
      { path: '/operator/reports', label: '청구 리포트', icon: FileText },
      { path: '/operator/billing-preview', label: '청구 미리보기', icon: Briefcase },
      { path: '/operator/invoices', label: '인보이스', icon: CreditCard },
      { path: '/operator/marketing', label: '마케팅', icon: Megaphone },
      { path: '/operator/forum-requests', label: '포럼 신청', icon: MessageSquare },
      { path: '/operator/forum-management', label: '포럼 관리', icon: FileText },
      { path: '/operator/market-trial', label: 'Trial 관리', icon: Tag },
      { path: '/operator/signage/content', label: '콘텐츠 허브', icon: Monitor },
      { path: '/operator/signage/library', label: '콘텐츠 라이브러리', icon: Monitor },
      { path: '/operator/signage/my', label: '내 사이니지', icon: Tv },
      { path: '/operator/support', label: '고객지원', icon: HelpCircle },
      { path: '/operator/ai-report', label: 'AI 리포트', icon: BarChart3 },
    ],
  },
};

export default function DashboardLayout({ role }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const config = roleConfig[role];
  const RoleIcon = config.icon;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Global Top Navigation */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-slate-200/50">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md shadow-primary-500/25">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-800">GlycoPharm</span>
          </NavLink>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <Home className="w-4 h-4" />
              홈
            </NavLink>
            <NavLink
              to="/forum"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <MessageSquare className="w-4 h-4" />
              포럼
            </NavLink>
            <NavLink
              to="/education"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <BookOpen className="w-4 h-4" />
              교육/자료
            </NavLink>
            <NavLink
              to="/apply"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <FileText className="w-4 h-4" />
              참여 신청
            </NavLink>
            <NavLink
              to="/signage"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <Monitor className="w-4 h-4" />
              디지털 사이니지
            </NavLink>
            <span className="mx-2 h-5 w-px bg-slate-200" />
            <span className={`px-3 py-1.5 rounded-lg text-sm font-medium bg-${config.color}-100 text-${config.color}-700`}>
              {config.title}
            </span>
          </nav>

          {/* Mobile - Current Section */}
          <div className="md:hidden flex items-center gap-2">
            <span className={`px-2 py-1 rounded-lg text-xs font-medium bg-${config.color}-100 text-${config.color}-700`}>
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
              <div className={`w-10 h-10 rounded-xl bg-${config.color}-100 flex items-center justify-center`}>
                <RoleIcon className={`w-5 h-5 text-${config.color}-600`} />
              </div>
              <div>
                <h2 className="font-bold text-slate-800">{config.title}</h2>
                <p className="text-xs text-slate-500">GlycoPharm</p>
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
            {config.menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === `/${role}`}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                      ? `bg-${config.color}-50 text-${config.color}-700`
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
              <LogOut className="w-5 h-5" />
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
              <Menu className="w-6 h-6" />
            </button>

            {/* Search */}
            <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="검색..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors">
                <Bell className="w-5 h-5 text-slate-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
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
