import React from 'react';
import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  Users, 
  Megaphone, 
  BarChart3,
  X
} from 'lucide-react';
import { UserRole } from './RoleSelector';

interface SidebarProps {
  currentRole: UserRole;
  activeMenu: string;
  onMenuChange: (menuId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const roleMenus = {
  supplier: [
    { id: 'dashboard', label: '대시보드', icon: TrendingUp },
    { id: 'products', label: '상품 관리', icon: Package },
    { id: 'orders', label: '주문/배송', icon: ShoppingCart },
    { id: 'settlement', label: '정산 관리', icon: DollarSign }
  ],
  seller: [
    { id: 'dashboard', label: '대시보드', icon: TrendingUp },
    { id: 'catalog', label: '상품 선택', icon: Package },
    { id: 'products', label: '내 상품 관리', icon: Package },
    { id: 'partners', label: '파트너 마케팅', icon: Users },
    { id: 'revenue', label: '매출/정산', icon: DollarSign }
  ],
  partner: [
    { id: 'dashboard', label: '대시보드', icon: TrendingUp },
    { id: 'marketing', label: '마케팅 관리', icon: Megaphone },
    { id: 'commission', label: '커미션 관리', icon: DollarSign },
    { id: 'analytics', label: '성과 분석', icon: BarChart3 }
  ]
};

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentRole, 
  activeMenu, 
  onMenuChange, 
  isOpen, 
  onClose 
}) => {
  const menus = roleMenus[currentRole];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed top-0 left-0 z-50 w-64 h-full bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
          lg:relative lg:transform-none lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between p-6 lg:hidden border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">메뉴</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Logo/Brand */}
        <div className="hidden lg:flex items-center gap-3 p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
          <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              드랍쉬핑
            </span>
            <div className="text-xs text-gray-500 font-medium">관리자</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">
          <ul className="space-y-1">
            {menus.map((menu) => {
              const Icon = menu.icon;
              const isActive = activeMenu === menu.id;
              
              return (
                <li key={menu.id}>
                  <button
                    onClick={() => {
                      onMenuChange(menu.id);
                      onClose(); // Close mobile menu when item is selected
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 
                      hover:scale-105 hover:shadow-sm group relative
                      ${isActive
                        ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className={`
                      p-1.5 rounded-lg transition-all duration-200
                      ${isActive 
                        ? 'bg-white bg-opacity-20' 
                        : 'bg-gray-100 group-hover:bg-gray-200'
                      }
                    `}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-medium">{menu.label}</span>
                    {isActive && (
                      <div className="absolute right-2 w-2 h-2 bg-white rounded-full opacity-80"></div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200 bg-gradient-to-t from-gray-50 to-transparent">
          <div className="text-xs text-gray-500 text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-medium">시스템 정상</span>
            </div>
            <p className="text-gray-400">드랍쉬핑 관리자 v1.0</p>
          </div>
        </div>
      </aside>
    </>
  );
};