import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Settings, Package, LogOut, Bell, HelpCircle, Heart } from 'lucide-react';
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
  };
}

export const AccountModule: React.FC<AccountModuleProps> = ({ 
  data = {} 
}) => {
  const {
    showAvatar = true,
    showName = false,
    avatarSize = 32,
    dropdownAlignment = 'right',
    customClass = ''
  } = data;

  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    try {
      logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleMenuClick = (callback?: () => void) => {
    callback?.();
  };

  // Not authenticated - show login link
  if (!isAuthenticated || !user) {
    return (
      <div className={`account-module account-module--guest ${customClass}`}>
        <Link to="/login" className="account-login-link">
          <User size={20} />
          <span>로그인</span>
        </Link>
      </div>
    );
  }

  // Authenticated - show user menu
  const trigger = (
    <button
      className="account-toggle"
      aria-label="사용자 메뉴"
      tabIndex={0}
    >
      {showAvatar && (
        <div className="account-avatar" style={{ width: avatarSize, height: avatarSize }}>
          {user.avatar ? (
            <img src={user.avatar} alt={user.name || user.email} />
          ) : (
            <User size={avatarSize * 0.6} />
          )}
        </div>
      )}
      {showName && (
        <span className="account-name">{user.name || user.email}</span>
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
          </div>
        </div>

        {/* Menu Items */}
        <div className="account-dropdown-menu py-2">
          <Link
            to="/my-account"
            className="account-menu-item flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
            onClick={() => handleMenuClick()}
          >
            <User size={18} className="text-gray-600" />
            <span>프로필</span>
          </Link>

          <Link
            to="/my-account/orders"
            className="account-menu-item flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
            onClick={() => handleMenuClick()}
          >
            <Package size={18} className="text-gray-600" />
            <span>주문 내역</span>
          </Link>

          <Link
            to="/my-account/wishlist"
            className="account-menu-item flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
            onClick={() => handleMenuClick()}
          >
            <Heart size={18} className="text-gray-600" />
            <span>위시리스트</span>
          </Link>

          <Link
            to="/my-account/notifications"
            className="account-menu-item flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
            onClick={() => handleMenuClick()}
          >
            <Bell size={18} className="text-gray-600" />
            <span>알림</span>
          </Link>

          <Link
            to="/my-account/settings"
            className="account-menu-item flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
            onClick={() => handleMenuClick()}
          >
            <Settings size={18} className="text-gray-600" />
            <span>설정</span>
          </Link>

          <Link
            to="/support"
            className="account-menu-item flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
            onClick={() => handleMenuClick()}
          >
            <HelpCircle size={18} className="text-gray-600" />
            <span>고객지원</span>
          </Link>

          <div className="account-menu-divider my-2 border-t border-gray-100"></div>

          <button
            className="account-menu-item account-menu-item--logout flex items-center gap-3 px-4 py-2 w-full text-left hover:bg-red-50 transition-colors text-red-600"
            onClick={() => handleMenuClick(handleLogout)}
          >
            <LogOut size={18} />
            <span>로그아웃</span>
          </button>
        </div>
      </Dropdown>
    </div>
  );
};