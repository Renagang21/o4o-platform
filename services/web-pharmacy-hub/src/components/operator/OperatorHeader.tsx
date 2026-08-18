/**
 * OperatorHeader — Pharmacy-Hub 운영자 영역 헤더 (OperatorAreaShell 의 header slot)
 *
 * WO-O4O-PHARMACY-HUB-OPERATOR-SHELL-COMMON-CORE-ADOPTION-V1
 *
 * OperatorAreaShell 은 header 를 공통화하지 않고 slot 으로 받는다
 * (서비스별 brand / profile / 알림 차이). KPA 의 KpaGlobalHeader,
 * K-Cosmetics 의 KCosGlobalHeader 에 대응하는 Pharmacy-Hub 최소 헤더다.
 *
 * 매장 셸(StoreTopBar) 과 같은 h-14 sticky 규격을 유지해 두 영역의 상단 높이를 맞춘다.
 */

import { Link, useNavigate } from 'react-router-dom';
import { Home, LogOut, ShieldCheck } from 'lucide-react';
import { getUserDisplayName } from '@o4o/account-ui';
import { useAuth } from '../../contexts/AuthContext';
import { BRAND } from '../../config/service';

/**
 * WO-O4O-PHARMACYHUB-ADMIN-OPERATOR-DUAL-AREA-ADOPTION-AND-PRODUCTION-CLOSURE-V1
 *
 * 관리자 영역(/admin)도 같은 상단바 규격을 쓰므로 **헤더 사본을 만들지 않고**
 * 영역 라벨·홈 경로만 prop 으로 받는다. 기본값은 기존 운영자 영역과 동일하다(동작 불변).
 */
export interface OperatorHeaderProps {
  /** 브랜드 로고 클릭 시 이동할 영역 홈. 기본 `/operator` */
  areaHome?: string;
  /** 영역 배지 문구. 기본 `서비스 운영자` */
  areaLabel?: string;
}

export function OperatorHeader({
  areaHome = '/operator',
  areaLabel = '서비스 운영자',
}: OperatorHeaderProps = {}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const userName = user ? getUserDisplayName(user) : '';

  return (
    <header className="sticky top-0 z-50 shrink-0 border-b border-slate-200/50 bg-white/95 backdrop-blur-lg">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link to={areaHome} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 shadow-md">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <span className="hidden text-base font-bold text-slate-800 sm:inline">{BRAND.name}</span>
          </Link>
          <span className="rounded-lg bg-teal-100 px-3 py-1.5 text-sm font-medium text-teal-700">
            {areaLabel}
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
