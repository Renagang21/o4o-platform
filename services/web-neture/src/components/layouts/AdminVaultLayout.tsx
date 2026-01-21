/**
 * AdminVaultLayout - o4o 설계 보호 구역 레이아웃
 *
 * Work Order: WO-O4O-ADMIN-VAULT-ACCESS-V1
 *
 * 목적:
 * - o4o 설계·구조 노출 가능 콘텐츠를 보호
 * - 지정된 관리자 계정만 접근 가능
 *
 * 접근 규칙:
 * - 로그인 없음: 접근 불가
 * - 일반 사용자: 접근 불가
 * - o4o-admin-id: 접근 가능
 */

import { Link, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts';
import { isAdminVaultAuthorized } from '../../utils/adminVaultAuth';
import { Shield, FileText, Box, StickyNote, Home, MessageSquare } from 'lucide-react';

export default function AdminVaultLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  // 인증되지 않았거나 권한 없음
  if (!isAuthenticated || !isAdminVaultAuthorized(user?.email)) {
    return <Navigate to="/" replace />;
  }

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navItems = [
    { path: '/admin-vault', label: 'Overview', icon: Home, exact: true },
    { path: '/admin-vault/inquiries', label: 'Inquiries', icon: MessageSquare },
    { path: '/admin-vault/docs', label: 'Docs', icon: FileText },
    { path: '/admin-vault/architecture', label: 'Architecture', icon: Box },
    { path: '/admin-vault/notes', label: 'Notes', icon: StickyNote },
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-amber-500" />
              <span className="text-lg font-semibold text-white">Admin Vault</span>
              <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded">
                Protected
              </span>
            </div>

            {/* Navigation */}
            <nav className="flex items-center space-x-1">
              {navItems.map((item) => {
                const active = item.exact
                  ? location.pathname === item.path
                  : isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded transition-colors ${
                      active
                        ? 'bg-slate-700 text-amber-400'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
              <span className="text-slate-600 mx-2">|</span>
              <Link
                to="/"
                className="px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors"
              >
                Exit Vault
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 border-t border-slate-700 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-slate-500 text-sm">
            <p>o4o Admin Vault - 설계 보호 구역</p>
            <p className="text-xs text-slate-600 mt-1">
              Authorized: {user?.email}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
