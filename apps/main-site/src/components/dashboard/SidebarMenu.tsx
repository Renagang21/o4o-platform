import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Package,
  ShoppingCart,
  DollarSign,
  Settings,
  LogOut
} from 'lucide-react';

const SidebarMenu: React.FC = () => {
  const location = useLocation();

  const menuItems = [
    {
      name: '상품관리',
      icon: Package,
      path: '/dashboard/products'
    },
    {
      name: '주문관리',
      icon: ShoppingCart,
      path: '/dashboard/orders'
    },
    {
      name: '정산',
      icon: DollarSign,
      path: '/dashboard/settlements'
    },
    {
      name: '설정',
      icon: Settings,
      path: '/dashboard/settings'
    }
  ];

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-200">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">O4O</h1>
      </div>

      <nav className="mt-6">
        <div className="px-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
          <button className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
            <LogOut className="w-5 h-5 mr-3" />
            로그아웃
          </button>
        </div>
      </nav>
    </aside>
  );
};

export default SidebarMenu; 