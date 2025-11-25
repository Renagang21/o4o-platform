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
import {
  User, Settings, Package, LogOut, Bell, HelpCircle, Heart, Check, Users,
  LayoutDashboard, ShoppingBag, Warehouse, Link as LinkIcon, DollarSign
} from 'lucide-react';
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

// H2-2-3: Role-based menu items configuration
interface MenuItem {
  key: string;
  label: string;
  url: string;
  icon: React.ReactNode;
}

const getRoleBasedMenuItems = (role: string | null): MenuItem[] => {
  const commonItems: MenuItem[] = [
    { key: 'account', label: '내 계정', url: '/account', icon: <User size={18} className="text-gray-600" /> },
    { key: 'settings', label: '설정', url: '/account/settings', icon: <Settings size={18} className="text-gray-600" /> },
  ];

  const roleSpecificItems: Record<string, MenuItem[]> = {
    customer: [
      { key: 'orders', label: '주문 내역', url: '/account/orders', icon: <Package size={18} className="text-gray-600" /> },
      { key: 'wishlist', label: '위시리스트', url: '/account/wishlist', icon: <Heart size={18} className="text-gray-600" /> },
      { key: 'notifications', label: '알림', url: '/account/notifications', icon: <Bell size={18} className="text-gray-600" /> },
      { key: 'support', label: '고객지원', url: '/support', icon: <HelpCircle size={18} className="text-gray-600" /> },
    ],
    seller: [
      { key: 'dashboard', label: 'Seller 대시보드', url: '/dashboard/seller', icon: <LayoutDashboard size={18} className="text-gray-600" /> },
      { key: 'products', label: '상품 관리', url: '/dashboard/seller/products', icon: <Package size={18} className="text-gray-600" /> },
      { key: 'orders', label: '주문 관리', url: '/dashboard/seller/orders', icon: <ShoppingBag size={18} className="text-gray-600" /> },
      { key: 'settlements', label: '정산 내역', url: '/dashboard/seller/settlements', icon: <DollarSign size={18} className="text-gray-600" /> },
    ],
    supplier: [
      { key: 'dashboard', label: 'Supplier 대시보드', url: '/dashboard/supplier', icon: <LayoutDashboard size={18} className="text-gray-600" /> },
      { key: 'inventory', label: '재고 관리', url: '/dashboard/supplier/inventory', icon: <Warehouse size={18} className="text-gray-600" /> },
      { key: 'orders', label: '주문 관리', url: '/dashboard/supplier/orders', icon: <Package size={18} className="text-gray-600" /> },
      { key: 'settlements', label: '정산 내역', url: '/dashboard/supplier/settlements', icon: <DollarSign size={18} className="text-gray-600" /> },
    ],
    partner: [
      { key: 'dashboard', label: 'Partner 대시보드', url: '/dashboard/partner', icon: <LayoutDashboard size={18} className="text-gray-600" /> },
      { key: 'links', label: '링크 관리', url: '/dashboard/partner/links', icon: <LinkIcon size={18} className="text-gray-600" /> },
      { key: 'analytics', label: '분석', url: '/dashboard/partner/analytics', icon: <LayoutDashboard size={18} className="text-gray-600" /> },
      { key: 'settlements', label: '정산 내역', url: '/dashboard/partner/settlements', icon: <DollarSign size={18} className="text-gray-600" /> },
    ],
    admin: [
      { key: 'dashboard', label: 'Admin 콘솔', url: 'https://admin.neture.co.kr', icon: <LayoutDashboard size={18} className="text-gray-600" /> },
    ],
    administrator: [
      { key: 'dashboard', label: 'Admin 콘솔', url: 'https://admin.neture.co.kr', icon: <LayoutDashboard size={18} className="text-gray-600" /> },
    ],
  };

  const specificItems = role ? (roleSpecificItems[role] || roleSpecificItems.customer) : roleSpecificItems.customer;

  // Return: common items first, then role-specific items
  return [...commonItems, ...specificItems];
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

  // H2-2-3: Get role-based menu items
  const menuItems = getRoleBasedMenuItems(activeRole);

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

        {/* H2-2-3: Role-based Menu Items */}
        <div className="account-dropdown-menu py-2">
          {menuItems.map((item) => {
            // External link (e.g., Admin console)
            if (item.url.startsWith('http')) {
              return (
                <a
                  key={item.key}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="account-menu-item flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              );
            }

            // Internal link
            return (
              <Link
                key={item.key}
                to={item.url}
                className="account-menu-item flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}

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
