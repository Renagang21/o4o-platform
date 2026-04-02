import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth, GLYCOPHARM_ROLES } from '@/contexts/AuthContext';
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
  ChevronRight,
  Building2,
  Truck,
  Shield,
  Bell,
  Search,
  Activity,
  Home,
  MessageSquare,
  BookOpen,
  Tv,
  Monitor,
  Tag,
  Store,
  BarChart3,
  FileText,
  Briefcase,
  DollarSign,
  ShieldCheck,
} from 'lucide-react';

interface DashboardLayoutProps {
  role: UserRole;
}

/**
 * WO-GLYCOPHARM-ADMIN-AREA-V1 + WO-O4O-OPERATOR-COMMON-CAPABILITY-REFINE-V1:
 * - admin/pharmacy/supplier: flat menuItems
 * - operator: grouped menuGroups (11 Capability 표준)
 */
type MenuItem = { path: string; label: string; icon: typeof LayoutDashboard };
type SidebarItem = { label: string; path: string; exact?: boolean };
type SidebarGroup = { label: string; icon: typeof LayoutDashboard; items: SidebarItem[]; };
type RoleConfig = { title: string; icon: typeof Building2; color: string; menuItems?: MenuItem[]; menuGroups?: SidebarGroup[] };

// WO-O4O-AUTH-RBAC-UNIFICATION-V2: prefixed role keys
const roleConfig: Record<string, RoleConfig> = {
  [GLYCOPHARM_ROLES.ADMIN]: {
    title: '관리자',
    icon: Shield,
    color: 'red',
    /* WO-O4O-ADMIN-DASHBOARD-REFINE-V1: 표준 Admin Capability 그룹 */
    menuGroups: [
      { label: 'Overview', icon: LayoutDashboard, items: [
        { label: '대시보드', path: '/admin', exact: true },
      ]},
      { label: 'Users', icon: Users, items: [
        { label: '회원 관리', path: '/admin/users' },
      ]},
      { label: 'Approvals', icon: Store, items: [
        { label: '약국 네트워크', path: '/admin/pharmacies' },
      ]},
      { label: 'Finance', icon: DollarSign, items: [
        { label: '정산 관리', path: '/admin/settlements' },
        { label: '청구 리포트', path: '/admin/reports' },
        { label: '청구 미리보기', path: '/admin/billing-preview' },
        { label: '인보이스', path: '/admin/invoices' },
      ]},
      { label: 'Governance', icon: ShieldCheck, items: [
        { label: '역할 관리', path: '/admin/roles' },
      ]},
      { label: 'System', icon: Settings, items: [
        { label: '설정', path: '/admin/settings' },
      ]},
    ],
  },
  [GLYCOPHARM_ROLES.PHARMACY]: {
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
      { path: '/store/signage', label: '내 사이니지', icon: Tv },
      { path: '/store/market-trial', label: 'Market Trial', icon: Tag },
      { path: '/store/funnel', label: '전환 퍼널', icon: BarChart3 },
      { path: '/store/management', label: '약국 경영', icon: Briefcase },
      { path: '/forum', label: '포럼', icon: MessageSquare },
      { path: '/education', label: '강좌', icon: BookOpen },
      { path: '/store/hub', label: '매장 HUB', icon: ShoppingCart },
      { path: '/store/identity', label: '내 매장', icon: Store },
      { path: '/store/settings', label: '설정', icon: Settings },
    ],
  },
  [GLYCOPHARM_ROLES.SUPPLIER]: {
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
  [GLYCOPHARM_ROLES.CONSUMER]: {
    title: '소비자',
    icon: Building2,
    color: 'green',
    menuItems: [
      { path: '/', label: '홈', icon: LayoutDashboard },
    ],
  },
  // operator config removed — WO-O4O-OPERATOR-UI-STANDARDIZATION-V1: uses shared OperatorShell
};

export default function DashboardLayout({ role }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const config = roleConfig[role];
  const RoleIcon = config.icon;

  // Collapsible group state (for menuGroups)
  const isItemActive = (path: string, exact?: boolean) => {
    if (exact) return pathname === path;
    if (path.includes('/signage/hq-media')) return pathname.startsWith('/operator/signage');
    return pathname === path || pathname.startsWith(path + '/');
  };

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    if (!config.menuGroups) return new Set<string>();
    return new Set(
      config.menuGroups
        .filter(g => g.items.some(i => isItemActive(i.path, i.exact)))
        .map(g => g.label)
    );
  });

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

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
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {config.menuGroups ? (
              /* Grouped sidebar (operator) — WO-O4O-OPERATOR-COMMON-CAPABILITY-REFINE-V1 */
              config.menuGroups.map((group) => {
                const GroupIcon = group.icon;
                const isOpen = openGroups.has(group.label);
                const hasActive = group.items.some(i => isItemActive(i.path, i.exact));

                // Single-item group: render as direct link
                if (group.items.length === 1) {
                  const item = group.items[0];
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.exact}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                          ? `bg-${config.color}-50 text-${config.color}-700`
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`
                      }
                    >
                      <GroupIcon className="w-5 h-5" />
                      {item.label}
                    </NavLink>
                  );
                }

                // Multi-item group: collapsible
                return (
                  <div key={group.label}>
                    <button
                      onClick={() => toggleGroup(group.label)}
                      className={`flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        hasActive ? `text-${config.color}-700` : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <GroupIcon className="w-5 h-5" />
                        {group.label}
                      </span>
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    {isOpen && (
                      <div className="ml-8 mt-0.5 space-y-0.5">
                        {group.items.map(item => (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.exact}
                            className={({ isActive }) =>
                              `block px-4 py-2 rounded-lg text-sm transition-all ${
                                isActive
                                  ? `text-${config.color}-700 bg-${config.color}-50 font-medium`
                                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                              }`
                            }
                          >
                            {item.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              /* Flat sidebar (admin, pharmacy, supplier) */
              config.menuItems?.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/admin' || item.path === '/store' || item.path === '/supplier' || item.path === '/'}
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
              })
            )}
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
