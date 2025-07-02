import React, { useState } from 'react';
import { RoleSelector, UserRole } from './RoleSelector';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface AdminLayoutProps {
  children: React.ReactNode | ((props: {
    currentRole: UserRole;
    activeMenu: string;
    onMenuChange: (menuId: string) => void;
  }) => React.ReactNode);
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>('supplier');
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Generate breadcrumb based on current role and menu
  const getBreadcrumb = () => {
    const roleLabels = {
      supplier: '공급자',
      seller: '판매자', 
      partner: '파트너'
    };
    
    const menuLabels = {
      dashboard: '대시보드',
      products: '상품 관리',
      orders: '주문/배송',
      settlement: '정산 관리',
      catalog: '상품 선택',
      partners: '파트너 마케팅',
      revenue: '매출/정산',
      marketing: '마케팅 관리',
      commission: '커미션 관리',
      analytics: '성과 분석'
    };

    const breadcrumbs = [{ label: roleLabels[currentRole] }];
    
    if (activeMenu !== 'dashboard') {
      breadcrumbs.push({ label: menuLabels[activeMenu as keyof typeof menuLabels] || '대시보드' });
    }

    return breadcrumbs;
  };

  const getPageTitle = () => {
    const menuLabels = {
      dashboard: '대시보드',
      products: '상품 관리',
      orders: '주문/배송',
      settlement: '정산 관리',
      catalog: '상품 선택',
      partners: '파트너 마케팅',
      revenue: '매출/정산',
      marketing: '마케팅 관리',
      commission: '커미션 관리',
      analytics: '성과 분석'
    };

    return menuLabels[activeMenu as keyof typeof menuLabels] || '대시보드';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Role Selector */}
      <RoleSelector 
        currentRole={currentRole} 
        onRoleChange={(role) => {
          setCurrentRole(role);
          setActiveMenu('dashboard'); // Reset to dashboard when role changes
        }} 
      />

      <div className="flex">
        {/* Sidebar */}
        <Sidebar
          currentRole={currentRole}
          activeMenu={activeMenu}
          onMenuChange={setActiveMenu}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content */}
        <div className="flex-1 lg:ml-64 min-w-0">
          {/* Header */}
          <Header
            title={getPageTitle()}
            breadcrumb={getBreadcrumb()}
            onMenuToggle={() => setSidebarOpen(true)}
          />

          {/* Page Content */}
          <main className="p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
              {typeof children === 'function' 
                ? children({
                    currentRole,
                    activeMenu,
                    onMenuChange: setActiveMenu
                  })
                : React.cloneElement(children as React.ReactElement, {
                    currentRole,
                    activeMenu,
                    onMenuChange: setActiveMenu
                  })
              }
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};