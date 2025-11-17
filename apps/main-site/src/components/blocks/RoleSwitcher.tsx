/**
 * P1: RoleSwitcher - assignments 기반 재작성
 *
 * - RoleAssignment 기반으로 완전히 재작성
 * - deprecated role 필드 모두 제거
 * - /user/preferences API 호출 제거
 * - 실제 대시보드 라우트와 일치하는 URL 사용
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Check } from 'lucide-react';
import { Dropdown } from '../common/Dropdown';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { trackRoleSwitch } from '../../utils/analytics';

interface RoleSwitcherProps {
  data?: {
    showLabel?: boolean;
    className?: string;
  };
}

interface RoleOption {
  id: string;
  name: string;
  description: string;
  path: string;
  icon: string;
}

/**
 * 역할 전환 버튼 (헤더용)
 *
 * P1: assignments 기반으로 재작성
 * - 복수 active assignments를 가진 사용자에게만 표시
 * - 역할 선택 시 해당 대시보드로 SPA 라우팅
 * - 서버 API 호출 없이 클라이언트 사이드만 처리
 */
export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ data = {} }) => {
  const { showLabel = true, className = '' } = data;
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [currentSelection, setCurrentSelection] = useState<string | null>(null);

  // P1: Get active assignments
  const activeAssignments = user?.assignments?.filter(a => a.active) ?? [];
  const roleList = activeAssignments.map(a => a.role);

  // P1: Not authenticated or single role - don't show
  if (!isAuthenticated || !user || activeAssignments.length <= 1) {
    return null;
  }

  // P1: Role options with correct dashboard paths (matches App.tsx routes)
  const roleOptions: Record<string, RoleOption> = {
    customer: {
      id: 'customer',
      name: 'Customer',
      description: 'Browse and purchase products',
      path: '/store/products',
      icon: '👤'
    },
    seller: {
      id: 'seller',
      name: 'Seller',
      description: 'Manage products and orders',
      path: '/dashboard/seller',
      icon: '🛒'
    },
    supplier: {
      id: 'supplier',
      name: 'Supplier',
      description: 'Supply and manage inventory',
      path: '/dashboard/supplier',
      icon: '🏭'
    },
    partner: {
      id: 'partner',
      name: 'Partner',
      description: 'Promote products and earn',
      path: '/dashboard/partner',
      icon: '🤝'
    },
    admin: {
      id: 'admin',
      name: 'Admin',
      description: 'System administration',
      path: '/dashboard/admin',
      icon: '⚙️'
    },
    administrator: {
      id: 'administrator',
      name: 'Administrator',
      description: 'System administration',
      path: '/dashboard/admin',
      icon: '⚙️'
    }
  };

  // P1: Simple role switch - navigate only (no API call)
  const handleRoleSwitch = (newRole: string) => {
    const previousRole = currentSelection || roleList[0];

    try {
      // Update local selection
      setCurrentSelection(newRole);

      // Track analytics
      trackRoleSwitch(previousRole, newRole);

      // SPA routing only
      const targetPath = roleOptions[newRole]?.path || '/';
      navigate(targetPath);

      toast.success(`Switched to ${roleOptions[newRole]?.name || newRole}`);
    } catch (error: any) {
      toast.error('Failed to switch role');
      console.error('Role switch error:', error);
    }
  };

  const trigger = (
    <button
      className="role-switcher-toggle flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
      aria-label="Switch role"
      tabIndex={0}
    >
      <Users size={18} />
      {showLabel && <span className="text-sm font-medium">Switch Role</span>}
    </button>
  );

  return (
    <div className={`role-switcher ${className}`}>
      <Dropdown trigger={trigger} alignment="right">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="text-sm font-medium text-gray-900">Select Role</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {activeAssignments.length} active role{activeAssignments.length > 1 ? 's' : ''}
          </div>
        </div>

        {/* Role List */}
        <div className="py-2">
          {roleList.map((roleId) => {
            const role = roleOptions[roleId];
            if (!role) return null;

            const isCurrent = window.location.pathname.startsWith(role.path);

            return (
              <div key={roleId} className="px-2">
                <button
                  onClick={() => handleRoleSwitch(roleId)}
                  className={`w-full flex items-start gap-3 px-3 py-2 rounded-md transition-colors ${
                    isCurrent
                      ? 'bg-blue-50 text-blue-900'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                  disabled={isCurrent}
                >
                  <span className="text-lg mt-0.5">{role.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{role.name}</span>
                      {isCurrent && (
                        <Check size={14} className="text-blue-600" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {role.description}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500">
            Switching roles will navigate to the appropriate dashboard.
          </p>
        </div>
      </Dropdown>
    </div>
  );
};

export default RoleSwitcher;
