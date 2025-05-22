import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import { useAdminNotificationStore } from '../../store/adminNotificationStore';
import { Bell } from 'lucide-react';
import { useAdminSearchStore } from '../../store/adminSearchStore';
import { useAdminSessionStore } from '../../store/adminSessionStore';

const navItems = [
  { to: '/admin/dashboard', label: '대시보드', roles: ['superadmin', 'manager', 'editor', 'viewer'] },
  { to: '/admin/products', label: '상품 관리', roles: ['superadmin', 'manager', 'editor'] },
  { to: '/admin/orders', label: '주문 관리', roles: ['superadmin', 'manager'] },
  { to: '/admin/users', label: '사용자 관리', roles: ['superadmin', 'manager'] },
  { to: '/admin/logs', label: '활동 로그', roles: ['superadmin'] },
  { to: '/admin/settings', label: '설정', roles: ['superadmin'] },
];

const AdminLayout: React.FC = () => {
  const { isAdminAuthenticated, logout, admin } = useAdminAuthStore();
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useAdminNotificationStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const { query, results, loading, search } = useAdminSearchStore();
  const [searchInput, setSearchInput] = useState('');
  const {
    sessions,
    currentSessionEmail,
    switchSession,
    removeSession,
    addSession,
    currentSession,
  } = useAdminSessionStore();
  const [accountDropdown, setAccountDropdown] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  useEffect(() => {
    if (searchInput.trim()) {
      search(searchInput, admin?.role || 'viewer');
      setSearchOpen(true);
    } else {
      setSearchOpen(false);
    }
  }, [searchInput, admin, search]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountDropdown(false);
      }
    }
    if (accountDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [accountDropdown]);

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 bg-gray-800 text-white flex flex-col py-8 px-4">
        <div className="text-xl font-bold mb-8">관리자 패널</div>
        {isAdminAuthenticated && (
          <>
            <nav className="flex flex-col gap-2 mb-8">
              {navItems.filter(item => admin && item.roles.includes(admin.role)).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-4 py-2 rounded hover:bg-gray-700 transition ${isActive ? 'bg-blue-600' : ''}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-2">
              <div className="text-sm text-gray-300 mb-2">{admin?.email}</div>
              <button
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-bold"
                onClick={() => {
                  logout();
                  navigate('/admin/login');
                }}
              >
                로그아웃
              </button>
            </div>
          </>
        )}
      </aside>
      <main className="flex-1 bg-gray-50">
        {/* Top bar with account switcher, search, notification bell */}
        <div className="flex items-center justify-end px-8 py-4 bg-white border-b relative">
          <div className="relative mr-4" ref={accountRef}>
            <button
              className="flex items-center gap-2 px-3 py-2 border rounded bg-gray-100 hover:bg-gray-200"
              onClick={() => setAccountDropdown(v => !v)}
            >
              <span className="font-bold text-blue-700">{currentSession?.email || admin?.email}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </button>
            {accountDropdown && (
              <div className="absolute left-0 top-12 w-72 bg-white rounded shadow-lg border z-50">
                <div className="px-4 py-2 text-xs text-gray-500 bg-gray-100">계정 전환</div>
                {sessions.map(s => (
                  <div
                    key={s.email}
                    className={`flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-blue-50 ${s.email === currentSessionEmail ? 'bg-blue-100 font-bold' : ''}`}
                    onClick={() => {
                      if (s.email !== currentSessionEmail) {
                        switchSession(s.email);
                        window.location.reload();
                      }
                    }}
                  >
                    <span>{s.email}</span>
                    {s.email === currentSessionEmail && <span className="text-xs text-blue-600 ml-2">(현재)</span>}
                    {sessions.length > 1 && (
                      <button
                        className="ml-2 text-red-500 hover:underline text-xs"
                        onClick={e => { e.stopPropagation(); removeSession(s.email); window.location.reload(); }}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                ))}
                <div className="px-4 py-2 border-t">
                  <button
                    className="w-full text-left text-blue-600 hover:underline"
                    onClick={() => { setAccountDropdown(false); /* TODO: open login modal */ alert('로그인 폼 모달 구현 필요'); }}
                  >
                    + 다른 계정 추가
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="relative mr-4">
            <input
              ref={searchRef}
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="통합 검색 (상품/주문/회원)"
              className="border rounded px-3 py-2 w-64 focus:outline-none focus:ring"
              onFocus={() => searchInput && setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            />
            {searchOpen && (searchInput.trim()) && (
              <div className="absolute left-0 top-12 w-96 bg-white rounded shadow-lg border z-50 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-gray-400">검색 중...</div>
                ) : (
                  <>
                    {results.products.length > 0 && (
                      <div>
                        <div className="px-4 py-2 text-xs text-gray-500 bg-gray-100">상품</div>
                        {results.products.map(item => (
                          <div
                            key={item.id}
                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                            onMouseDown={() => navigate(item.link)}
                          >
                            <span className="font-medium text-blue-700">{item.label}</span>
                            {item.subLabel && <span className="ml-2 text-xs text-gray-400">{item.subLabel}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {results.orders.length > 0 && (
                      <div>
                        <div className="px-4 py-2 text-xs text-gray-500 bg-gray-100">주문</div>
                        {results.orders.map(item => (
                          <div
                            key={item.id}
                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                            onMouseDown={() => navigate(item.link)}
                          >
                            <span className="font-medium text-green-700">{item.label}</span>
                            {item.subLabel && <span className="ml-2 text-xs text-gray-400">{item.subLabel}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {results.users.length > 0 && (
                      <div>
                        <div className="px-4 py-2 text-xs text-gray-500 bg-gray-100">회원</div>
                        {results.users.map(item => (
                          <div
                            key={item.id}
                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                            onMouseDown={() => navigate(item.link)}
                          >
                            <span className="font-medium text-purple-700">{item.label}</span>
                            {item.subLabel && <span className="ml-2 text-xs text-gray-400">{item.subLabel}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {results.products.length === 0 && results.orders.length === 0 && results.users.length === 0 && (
                      <div className="p-4 text-center text-gray-400">검색 결과가 없습니다.</div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <button
            ref={bellRef}
            className="relative mr-4"
            onClick={() => setDropdownOpen((v) => !v)}
            aria-label="알림"
          >
            <Bell className="w-6 h-6 text-gray-700" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {unreadCount}
              </span>
            )}
          </button>
          {dropdownOpen && (
            <div className="absolute right-8 top-12 w-80 bg-white rounded shadow-lg border z-50">
              <div className="flex items-center justify-between px-4 py-2 border-b">
                <span className="font-bold">알림</span>
                <button className="text-xs text-blue-600" onClick={markAllAsRead}>모두 읽음</button>
              </div>
              <ul className="max-h-80 overflow-y-auto">
                {notifications.length === 0 && (
                  <li className="px-4 py-4 text-gray-400 text-center">알림이 없습니다.</li>
                )}
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`