/**
 * R-3-1: Refactored AccountModule with Active Role Management
 *
 * Features:
 * - Guest: Login | Signup buttons
 * - Authenticated: User avatar + activeRole badge
 * - Dropdown: Profile, Role Switcher, Logout
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Settings, Package, LogOut, Bell, HelpCircle, Heart, Check, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Dropdown } from '../common/Dropdown';
import './AccountModule.css';

interface AccountModuleProps {
  data?: {
    showAvatar?: boolean;
    showName?: boolean;
    avatarSize?: number;
    dropdownAlignment?: 'left' | 'right';
    customClass?: string;
    loginUrl?: string;
    signupUrl?: string;
    accountUrl?: string;
  };
}

// Role display configuration
const ROLE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  customer: { label: '고객', color: 'bg-blue-100 text-blue-800', icon: '👤' },
  seller: { label: '판매자', color: 'bg-green-100 text-green-800', icon: '🛒' },
  supplier: { label: '공급자', color: 'bg-purple-100 text-purple-800', icon: '🏭' },
  partner: { label: '파트너', color: 'bg-orange-100 text-orange-800', icon: '🤝' },
  admin: { label: '관리자', color: 'bg-red-100 text-red-800', icon: '⚙️' },
  administrator: { label: '관리자', color: 'bg-red-100 text-red-800', icon: '⚙️' },
  manager: { label: '매니저', color: 'bg-yellow-100 text-yellow-800', icon: '📊' },
};

export const AccountModule: React.FC<AccountModuleProps> = ({
  data = {}
}) => {
  const {
    showAvatar = true,
    showName = false,
    avatarSize = 32,
    dropdownAlignment = 'right',
    customClass = '',
    loginUrl = '/login',
    signupUrl = '/register',
    accountUrl = '/account'
  } = data;

  const { user, isAuthenticated, logout, activeRole, setActiveRole, getAvailableRoles } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    try {
      logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleRoleSwitch = (newRole: string) => {
    setActiveRole(newRole);
    // Optional: Navigate to role-specific dashboard
    // navigate(`/workspace/${newRole}`);
  };

  // R-3-1: Guest state - show Login | Signup
  if (!isAuthenticated || !user) {
    return (
      <div className={`account-module account-module--guest ${customClass}`}>
        <div className="flex items-center gap-2">
          <Link
            to={loginUrl}
            className="account-login-link px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors flex items-center gap-2"
          >
            <User size={18} />
            <span>로그인</span>
          </Link>
          <span className="text-gray-300">|</span>
          <Link
            to={signupUrl}
            className="account-signup-link px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
          >
            회원가입
          </Link>
        </div>
      </div>
    );
  }

  // R-3-1: Get available roles
  const availableRoles = getAvailableRoles();
  const hasMultipleRoles = availableRoles.length > 1;

  // R-3-1: Authenticated state - show avatar + activeRole badge
  const roleConfig = activeRole ? ROLE_CONFIG[activeRole] : null;

  const trigger = (
    <button
      className="account-toggle flex items-center gap-2"
      aria-label="사용자 메뉴"
      tabIndex={0}
    >
      {showAvatar && (
        <div className="account-avatar relative" style={{ width: avatarSize, height: avatarSize }}>
          {user.avatar ? (
            <img src={user.avatar} alt={user.name || user.email} className="rounded-full" />
          ) : (
            <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
              <User size={avatarSize * 0.6} className="text-gray-600" />
            </div>
          )}
          {/* Active Role Badge */}
          {roleConfig && (
            <span
              className={`absolute -bottom-1 -right-1 text-xs px-1.5 py-0.5 rounded-full ${roleConfig.color} font-medium`}
              title={roleConfig.label}
            >
              {roleConfig.icon}
            </span>
          )}
        </div>
      )}
      {showName && (
        <span className="account-name text-sm font-medium text-gray-700">
          {user.name || user.email}
        </span>
      )}
    </button>
  );

  return (
    <div className={`account-module account-module--authenticated ${customClass}`}>
      <Dropdown trigger={trigger} alignment={dropdownAlignment}>
        {/* User Info Header */}
        <div className="account-dropdown-header px-4 py-3 border-b border-gray-100">
          <div className="account-info">
            <div className="account-info-name font-medium text-gray-900">
              {user.name || user.email}
            </div>
            <div className="account-info-email text-sm text-gray-500">
              {user.email}
            </div>
            {/* Active Role Display */}
            {roleConfig && (
              <div className="mt-2">
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${roleConfig.color}`}>
                  <span>{roleConfig.icon}</span>
                  <span>{roleConfig.label}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Menu Items */}
        <div className="account-dropdown-menu py-2">
          <Link
            to={accountUrl}
            className="account-menu-item flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
          >
            <User size={18} className="text-gray-600" />
            <span>내 계정</span>
          </Link>

          <Link
            to={`${accountUrl}/orders`}
            className="account-menu-item flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
          >
            <Package size={18} className="text-gray-600" />
            <span>주문 내역</span>
          </Link>

          <Link
            to={`${accountUrl}/wishlist`}
            className="account-menu-item flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
          >
            <Heart size={18} className="text-gray-600" />
            <span>위시리스트</span>
          </Link>

          <Link
            to={`${accountUrl}/notifications`}
            className="account-menu-item flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
          >
            <Bell size={18} className="text-gray-600" />
            <span>알림</span>
          </Link>

          <Link
            to={`${accountUrl}/settings`}
            className="account-menu-item flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
          >
            <Settings size={18} className="text-gray-600" />
            <span>설정</span>
          </Link>

          <Link
            to="/support"
            className="account-menu-item flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
          >
            <HelpCircle size={18} className="text-gray-600" />
            <span>고객지원</span>
          </Link>

          {/* R-3-1: Role Switcher (only if multiple roles) */}
          {hasMultipleRoles && (
            <>
              <div className="account-menu-divider my-2 border-t border-gray-100"></div>

              <div className="px-2 py-1">
                <div className="text-xs font-medium text-gray-500 px-2 py-1 flex items-center gap-2">
                  <Users size={14} />
                  <span>역할 전환</span>
                </div>
                {availableRoles.map((role) => {
                  const config = ROLE_CONFIG[role];
                  if (!config) return null;

                  const isCurrent = activeRole === role;

                  return (
                    <button
                      key={role}
                      onClick={() => handleRoleSwitch(role)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
                        isCurrent
                          ? 'bg-blue-50 text-blue-900'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                      disabled={isCurrent}
                    >
                      <div className="flex items-center gap-2">
                        <span>{config.icon}</span>
                        <span className="text-sm">{config.label}</span>
                      </div>
                      {isCurrent && (
                        <Check size={14} className="text-blue-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="account-menu-divider my-2 border-t border-gray-100"></div>

          <button
            className="account-menu-item account-menu-item--logout flex items-center gap-3 px-4 py-2 w-full text-left hover:bg-red-50 transition-colors text-red-600"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>로그아웃</span>
          </button>
        </div>
      </Dropdown>
    </div>
  );
};
