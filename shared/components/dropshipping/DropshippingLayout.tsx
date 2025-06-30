import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NotificationCenter } from './NotificationCenter';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  DollarSign,
  Users,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  TrendingUp,
  Truck,
  CreditCard,
  BarChart,
  Shield,
  Activity,
  Megaphone,
  Target,
  PieChart
} from 'lucide-react';

interface DropshippingLayoutProps {
  userRole: 'seller' | 'supplier' | 'partner' | 'admin';
}

export const DropshippingLayout: React.FC<DropshippingLayoutProps> = ({ userRole }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  // 역할별 네비게이션 메뉴
  const getNavigationItems = () => {
    switch (userRole) {
      case 'seller':
        return [
          { path: '/seller/dashboard', label: '대시보드', icon: LayoutDashboard },
          { path: '/seller/inventory', label: '재고 관리', icon: Package },
          { path: '/seller/orders', label: '주문 관리', icon: ShoppingCart },
          { path: '/seller/pricing', label: '가격 정책', icon: DollarSign },
          { path: '/seller/suppliers', label: '공급자 관리', icon: Users },
          { path: '/seller/reports', label: '리포트', icon: FileText },
        ];
      case 'supplier':
        return [
          { path: '/supplier/dashboard', label: '대시보드', icon: LayoutDashboard },
          { path: '/supplier/products', label: '상품 관리', icon: Package },
          { path: '/supplier/orders', label: '주문 관리', icon: ShoppingCart },
          { path: '/supplier/shipping', label: '배송 관리', icon: Truck },
          { path: '/supplier/settlement', label: '정산 관리', icon: CreditCard },
          { path: '/supplier/reports', label: '리포트', icon: BarChart },
        ];
      case 'partner':
        return [
          { path: '/partner/dashboard', label: '대시보드', icon: LayoutDashboard },
          { path: '/partner/marketing', label: '마케팅 관리', icon: Megaphone },
          { path: '/partner/commission', label: '커미션 관리', icon: DollarSign },
          { path: '/partner/analytics', label: '성과 분석', icon: PieChart },
        ];
      case 'admin':
        return [
          { path: '/admin/dashboard', label: '대시보드', icon: LayoutDashboard },
          { path: '/admin/users', label: '사용자 관리', icon: Users },
          { path: '/admin/monitoring', label: '시스템 모니터링', icon: Activity },
          { path: '/admin/reports', label: '플랫폼 리포트', icon: BarChart },
          { path: '/admin/settings', label: '설정', icon: Settings },
        ];
      default:
        return [];
    }
  };

  // 역할별 타이틀과 색상
  const getRoleConfig = () => {
    switch (userRole) {
      case 'seller':
        return { 
          title: '판매자 센터', 
          color: 'bg-blue-600',
          textColor: 'text-blue-600',
          bgLight: 'bg-blue-50'
        };
      case 'supplier':
        return { 
          title: '공급자 센터', 
          color: 'bg-green-600',
          textColor: 'text-green-600',
          bgLight: 'bg-green-50'
        };
      case 'partner':
        return { 
          title: '파트너 센터', 
          color: 'bg-purple-600',
          textColor: 'text-purple-600',
          bgLight: 'bg-purple-50'
        };
      case 'admin':
        return { 
          title: '관리자 센터', 
          color: 'bg-red-600',
          textColor: 'text-red-600',
          bgLight: 'bg-red-50'
        };
      default:
        return { 
          title: '드랍쉬핑 플랫폼', 
          color: 'bg-gray-600',
          textColor: 'text-gray-600',
          bgLight: 'bg-gray-50'
        };
    }
  };

  const navigationItems = getNavigationItems();
  const roleConfig = getRoleConfig();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className={cn("h-16 border-b bg-white", roleConfig.color)}>
        <div className="h-full flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <h1 className="text-xl font-bold text-white">{roleConfig.title}</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* 알림 센터 */}
            <div className="bg-white/10 rounded-lg">
              <NotificationCenter role={userRole} />
            </div>
            
            {/* 사용자 메뉴 */}
            <div className="flex items-center gap-3 text-white">
              <div className="text-sm">
                <p className="font-medium">홍길동</p>
                <p className="text-xs opacity-80">{userRole === 'seller' ? '판매자' : userRole === 'supplier' ? '공급자' : userRole === 'partner' ? '파트너' : '관리자'}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* 사이드바 */}
        <aside
          className={cn(
            "bg-white border-r transition-all duration-300",
            sidebarOpen ? "w-64" : "w-16"
          )}
        >
          <nav className="p-4 space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                    isActive
                      ? cn(roleConfig.bgLight, roleConfig.textColor, "font-medium")
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {sidebarOpen && (
                    <span className="text-sm">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* 역할 전환 (관리자만) */}
          {userRole === 'admin' && sidebarOpen && (
            <div className="mt-auto p-4 border-t">
              <p className="text-xs font-medium text-gray-500 mb-2">역할 전환</p>
              <div className="space-y-1">
                <Link
                  to="/seller/dashboard"
                  className="flex items-center gap-2 text-xs text-gray-600 hover:text-blue-600 py-1"
                >
                  <Shield className="h-3 w-3" />
                  판매자 대시보드
                </Link>
                <Link
                  to="/supplier/dashboard"
                  className="flex items-center gap-2 text-xs text-gray-600 hover:text-green-600 py-1"
                >
                  <Shield className="h-3 w-3" />
                  공급자 대시보드
                </Link>
                <Link
                  to="/partner/dashboard"
                  className="flex items-center gap-2 text-xs text-gray-600 hover:text-purple-600 py-1"
                >
                  <Shield className="h-3 w-3" />
                  파트너 대시보드
                </Link>
              </div>
            </div>
          )}
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};