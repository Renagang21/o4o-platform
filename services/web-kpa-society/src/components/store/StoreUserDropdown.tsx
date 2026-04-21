/**
 * StoreUserDropdown - KPA Store TopBar 우측 사용자 드롭다운
 * WO-KPA-SOCIETY-STORE-TOPBAR-ALIGN-WITH-KPA-HEADER-V1
 *
 * KPA 공통 Header의 user dropdown 패턴을 Store TopBar에 적용.
 * Tailwind CSS (StoreTopBar 스타일 일관성).
 */

import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Home, User, Settings, LogOut, Shield } from 'lucide-react';
import { useAuth, type User as UserType } from '../../contexts';
import { DashboardSwitcher, useAccessibleDashboards } from '../common/DashboardSwitcher';
import { SUPER_OPERATOR_ROLES, hasAnyRole } from '../../lib/role-constants';

function isSuperOperator(user: UserType | null): boolean {
  if (!user) return false;
  if ((user as any).isSuperOperator) return true;
  return hasAnyRole(user.roles, SUPER_OPERATOR_ROLES);
}

function getUserDisplayName(user: UserType | null): string {
  if (!user) return '사용자';
  const ext = user as any;
  if (ext.displayName) return ext.displayName;
  if (ext.lastName || ext.firstName) {
    const full = `${ext.lastName || ''}${ext.firstName || ''}`.trim();
    if (full) return full;
  }
  if (user.name && user.name !== user.email) return user.name;
  if (user.email) return user.email.split('@')[0];
  return '사용자';
}

interface StoreUserDropdownProps {
  homeLink?: string;
  onLogout: () => void;
}

export function StoreUserDropdown({ homeLink = '/', onLogout }: StoreUserDropdownProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const accessibleDashboards = useAccessibleDashboards();

  const isAdmin = user ? user.roles.includes('kpa:admin') : false;
  const isOperator = user ? user.roles.includes('kpa:operator') : false;
  const superOp = isSuperOperator(user);

  return (
    <>
      {/* Home link */}
      <NavLink
        to={homeLink}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
      >
        <Home className="w-4 h-4" />
        <span className="hidden md:inline">홈</span>
      </NavLink>

      {/* User icon + dropdown */}
      <div
        className="relative"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <button
          className={`flex items-center justify-center w-9 h-9 rounded-full border cursor-pointer transition-colors ${
            superOp
              ? 'bg-amber-50 border-amber-400'
              : 'bg-slate-100 border-slate-300 hover:border-slate-400'
          }`}
          aria-label="사용자 메뉴"
        >
          <User className={`w-[18px] h-[18px] ${superOp ? 'text-amber-600' : 'text-slate-600'}`} />
        </button>

        {open && (
          <div className="absolute top-full right-0 pt-2 z-50">
            <div className="bg-white rounded-xl shadow-lg ring-1 ring-slate-200/60 min-w-[220px] py-1.5">
              {/* Header: name + email */}
              <div className={`px-4 py-2.5 ${superOp ? 'bg-amber-50/60' : ''}`}>
                <div className="text-sm font-semibold text-slate-900">
                  {getUserDisplayName(user)}님
                </div>
                <div className="text-xs text-slate-500 break-all">
                  {user?.email}
                </div>
                {superOp && (
                  <span className="mt-1 inline-block text-[11px] font-semibold text-amber-600">
                    🛡️ Super Operator
                  </span>
                )}
              </div>

              <div className="h-px bg-slate-200 my-1" />

              {superOp ? (
                /* Super Operator: 간소화 메뉴 */
                <>
                  <DropdownLink
                    to={isAdmin ? '/admin' : '/operator'}
                    icon={<Shield className="w-4 h-4 text-amber-600" />}
                    onClick={() => setOpen(false)}
                  >
                    {isAdmin ? '관리자 콘솔' : '운영 대시보드'}
                  </DropdownLink>
                  <DropdownLink to="/mypage" icon={<Home className="w-4 h-4 text-slate-500" />} onClick={() => setOpen(false)}>
                    마이페이지
                  </DropdownLink>
                </>
              ) : (
                /* 일반 사용자 — WO-KPA-OPERATOR-USER-MENU-CLEANUP-V1 */
                <>
                  {(isAdmin || isOperator) && (
                    <DropdownLink
                      to={isAdmin ? '/admin' : '/operator'}
                      icon={<Shield className="w-4 h-4 text-slate-500" />}
                      onClick={() => setOpen(false)}
                    >
                      {isAdmin ? '관리자 콘솔' : '운영 대시보드'}
                    </DropdownLink>
                  )}
                  {accessibleDashboards.length >= 2 ? (
                    <>
                      <DashboardSwitcher onNavigate={() => setOpen(false)} />
                    </>
                  ) : (
                    <DropdownLink to="/mypage" icon={<Home className="w-4 h-4 text-slate-500" />} onClick={() => setOpen(false)}>
                      마이페이지
                    </DropdownLink>
                  )}
                  <DropdownLink to="/mypage/settings" icon={<Settings className="w-4 h-4 text-slate-500" />} onClick={() => setOpen(false)}>
                    설정
                  </DropdownLink>
                </>
              )}

              <div className="h-px bg-slate-200 my-1" />
              <button
                onClick={() => { setOpen(false); onLogout(); }}
                className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function DropdownLink({ to, icon, onClick, children }: {
  to: string;
  icon: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
      onClick={onClick}
    >
      {icon}
      {children}
    </Link>
  );
}
