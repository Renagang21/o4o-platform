import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Settings, Package, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '@o4o/auth-context';
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setIsDropdownOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
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
  return (
    <div className={`account-module account-module--authenticated ${customClass}`} ref={dropdownRef}>
      <button
        className="account-toggle"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        aria-expanded={isDropdownOpen}
        aria-haspopup="true"
      >
        {showAvatar && (
          <div className="account-avatar" style={{ width: avatarSize, height: avatarSize }}>
            {user.avatar ? (
              <img src={user.avatar} alt={user.name || user.username} />
            ) : (
              <User size={avatarSize * 0.6} />
            )}
          </div>
        )}
        {showName && (
          <span className="account-name">{user.name || user.username}</span>
        )}
        <ChevronDown size={16} className={`account-chevron ${isDropdownOpen ? 'rotate' : ''}`} />
      </button>

      {isDropdownOpen && (
        <div className={`account-dropdown account-dropdown--${dropdownAlignment}`}>
          <div className="account-dropdown-header">
            <div className="account-info">
              <div className="account-info-name">{user.name || user.username}</div>
              <div className="account-info-email">{user.email}</div>
            </div>
          </div>

          <div className="account-dropdown-menu">
            <Link 
              to="/my-account" 
              className="account-menu-item"
              onClick={() => setIsDropdownOpen(false)}
            >
              <Settings size={18} />
              <span>내 계정</span>
            </Link>
            
            <Link 
              to="/my-account/orders" 
              className="account-menu-item"
              onClick={() => setIsDropdownOpen(false)}
            >
              <Package size={18} />
              <span>주문 내역</span>
            </Link>

            <div className="account-menu-divider"></div>

            <button
              className="account-menu-item account-menu-item--logout"
              onClick={handleLogout}
            >
              <LogOut size={18} />
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};