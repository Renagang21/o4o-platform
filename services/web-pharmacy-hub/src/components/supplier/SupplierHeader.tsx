/**
 * SupplierHeader — Pharmacy-Hub 공급자 영역 헤더
 *
 * WO-O4O-PHARMACY-HUB-SUPPLIER-SHELL-COMMON-CORE-ADOPTION-V1
 *
 * 운영자 영역의 OperatorHeader / 매장 영역의 StoreTopBar 와 같은 h-14 sticky 규격을 유지해
 * 세 역할 영역의 상단 높이를 맞춘다. 역할 뱃지와 brand 링크만 다르다.
 */

import { Link, useNavigate } from 'react-router-dom';
import { Home, LogOut, Truck } from 'lucide-react';
import { getUserDisplayName } from '@o4o/account-ui';
import { useAuth } from '../../contexts/AuthContext';
import { BRAND, ROLE_LABELS, ROLES } from '../../config/service';

export function SupplierHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const userName = user ? getUserDisplayName(user) : '';

  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-slate-200/50 bg-white/95 backdrop-blur-lg">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link to="/supplier" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 shadow-md">
              <Truck className="h-4 w-4 text-white" />
            </div>
            <span className="hidden text-base font-bold text-slate-800 sm:inline">{BRAND.name}</span>
          </Link>
          <span className="rounded-lg bg-teal-100 px-3 py-1.5 text-sm font-medium text-teal-700">
            {ROLE_LABELS[ROLES.supplier]}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <Home className="h-4 w-4" />
            <span className="hidden md:inline">홈</span>
          </Link>
          {userName && (
            <span className="hidden text-sm font-medium text-slate-700 md:block">{userName}</span>
          )}
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">로그아웃</span>
          </button>
        </div>
      </div>
    </header>
  );
}
