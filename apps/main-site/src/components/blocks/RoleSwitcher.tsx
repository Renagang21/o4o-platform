/**
 * H2-2-5: RoleSwitcher - Enhanced with API integration
 *
 * - Uses /workspace/{role} URLs for unified workspace entry
 * - Detects current active role from URL
 * - RoleAssignment-based role checking
 * - Calls /user/preferences API to persist role preference
 * - Updates AuthContext to maintain role state
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, Check } from 'lucide-react';
import { Dropdown } from '../common/Dropdown';
import { useAuth } from '../../contexts/AuthContext';
import { authClient } from '@o4o/auth-client';
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
 * P2: Workspace 기반 라우팅
 * - 복수 active assignments를 가진 사용자에게만 표시
 * - /workspace/{role} URL로 통일된 진입점 제공
 * - URL 기반 현재 활성 역할 자동 감지
 * - 서버 API 호출 없이 클라이언트 사이드만 처리
 */
export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ data = {} }) => {
  const { showLabel = true, className = '' } = data;
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeRole, setActiveRole] = useState<string | null>(null);

  // R-4-2: Get active assignments (using isActive)
  const activeAssignments = user?.assignments?.filter(a => a.isActive) ?? [];
  const roleList = activeAssignments.map(a => a.role);

  // P2: Detect active role from current URL
  useEffect(() => {
    const pathname = location.pathname;

    // Check workspace URLs
    if (pathname.startsWith('/workspace/')) {
      const role = pathname.split('/')[2];
      setActiveRole(role);
      return;
    }

    // Check dashboard URLs
    if (pathname.startsWith('/dashboard/supplier')) {
      setActiveRole('supplier');
    } else if (pathname.startsWith('/dashboard/seller')) {
      setActiveRole('seller');
    } else if (pathname.startsWith('/dashboard/partner')) {
      setActiveRole('partner');
    } else if (pathname.startsWith('/dashboard/admin')) {
      setActiveRole('admin');
    } else if (pathname.startsWith('/account')) {
      setActiveRole('customer');
    } else if (pathname.startsWith('/store')) {
      setActiveRole('customer');
    } else {
      // Default to first available role
      setActiveRole(roleList[0] || null);
    }
  }, [location.pathname, roleList]);

  // P1: Not authenticated or single role - don't show
  if (!isAuthenticated || !user || activeAssignments.length <= 1) {
    return null;
  }

  // P2: Role options with unified /workspace paths
  const roleOptions: Record<string, RoleOption> = {
    user: {
      id: 'user',
      name: 'Customer',
      description: 'Browse and purchase products',
      path: '/workspace/user',
      icon: '👤'
    },
    seller: {
      id: 'seller',
      name: 'Seller',
      description: 'Manage products and orders',
      path: '/workspace/seller',
      icon: '🛒'
    },
    supplier: {
      id: 'supplier',
      name: 'Supplier',
      description: 'Supply and manage inventory',
      path: '/workspace/supplier',
      icon: '🏭'
    },
    partner: {
      id: 'partner',
      name: 'Partner',
      description: 'Promote products and earn',
      path: '/workspace/partner',
      icon: '🤝'
    },
    admin: {
      id: 'admin',
      name: 'Admin',
      description: 'System administration',
      path: '/workspace/admin',
      icon: '⚙️'
    },
    administrator: {
      id: 'administrator',
      name: 'Administrator',
      description: 'System administration',
      path: '/workspace/admin',
      icon: '⚙️'
    }
  };

  // H2-2-5: Role switch with API integration
  const handleRoleSwitch = async (newRole: string) => {
    const previousRole = activeRole || roleList[0];

    try {
      // Track analytics
      trackRoleSwitch(previousRole, newRole);

      // Call API to persist role preference
      await authClient.api.patch('/user/preferences', {
        currentRole: newRole
      });

      // R-6-3: If currently on /account page, stay on /account with dashboard param
      if (location.pathname.startsWith('/account')) {
        navigate(`/account?dashboard=${newRole}`);
        toast.success(`Switched to ${roleOptions[newRole]?.name || newRole}`);
        return;
      }

      // Otherwise, navigate to workspace URL (will be redirected to actual dashboard)
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

            const isCurrent = activeRole === roleId;

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
