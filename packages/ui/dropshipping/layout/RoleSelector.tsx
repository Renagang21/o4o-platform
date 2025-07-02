import React from 'react';
import { Package, ShoppingBag, Users } from 'lucide-react';

export type UserRole = 'supplier' | 'seller' | 'partner';

interface RoleSelectorProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

const roleConfig = {
  supplier: {
    label: '공급자',
    icon: Package,
    description: '상품 공급 및 재고 관리',
    color: 'blue'
  },
  seller: {
    label: '판매자',
    icon: ShoppingBag,
    description: '상품 판매 및 마케팅',
    color: 'green'
  },
  partner: {
    label: '파트너',
    icon: Users,
    description: '제휴 마케팅 및 커미션',
    color: 'purple'
  }
};

export const RoleSelector: React.FC<RoleSelectorProps> = ({ currentRole, onRoleChange }) => {
  return (
    <div className="border-b border-gray-200 bg-white sticky top-0 z-40 shadow-sm">
      <div className="px-4 sm:px-6">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto" aria-label="Tabs">
          {(Object.keys(roleConfig) as UserRole[]).map((role) => {
            const config = roleConfig[role];
            const Icon = config.icon;
            const isActive = currentRole === role;
            
            return (
              <button
                key={role}
                onClick={() => onRoleChange(role)}
                className={`
                  flex items-center gap-2 py-3 sm:py-4 px-3 sm:px-4 rounded-t-lg font-semibold text-sm whitespace-nowrap 
                  transition-all duration-200 hover:-translate-y-0.5 relative group
                  ${isActive
                    ? 'bg-gradient-to-b from-red-50 to-white text-red-600 shadow-sm border-b-2 border-red-500'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className={`
                  p-1.5 rounded-lg transition-all duration-200
                  ${isActive 
                    ? 'bg-red-100 text-red-600 shadow-sm' 
                    : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                  }
                `}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                </div>
                <span className="hidden xs:inline sm:inline font-medium">{config.label}</span>
                <span className="xs:hidden font-medium">{config.label.slice(0, 2)}</span>
                
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-red-500"></div>
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>
      
      {/* Role Description - Enhanced with better styling */}
      <div className="hidden sm:block px-4 sm:px-6 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-100">
        <div className="flex items-center gap-3 text-sm">
          <div className={`
            w-3 h-3 rounded-full shadow-sm
            ${currentRole === 'supplier' ? 'bg-blue-500' : 
              currentRole === 'seller' ? 'bg-green-500' : 'bg-purple-500'}
          `}></div>
          <span className="text-gray-700 font-medium">{roleConfig[currentRole].description}</span>
          <div className="ml-auto text-xs text-gray-500 bg-white px-2 py-1 rounded-full shadow-sm border">
            현재 모드
          </div>
        </div>
      </div>
    </div>
  );
};