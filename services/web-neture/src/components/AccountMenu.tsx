/**
 * AccountMenu - 상단 계정 영역 UI
 * WO-NETURE-UI-ACCOUNT-MENU-V1
 * WO-KPA-SUPER-OPERATOR-BASELINE-REFINE-V1: Super Operator 공통 메뉴 지원
 *
 * 프로필 아이콘 + 드롭다운 메뉴
 * - 일반 사용자: 이메일, 마이페이지, 대시보드, 로그아웃
 * - Super Operator: 이메일, 프로필, 로그아웃 (간소화)
 */

import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, LogOut, LayoutDashboard, Settings, Shield } from 'lucide-react';
import { useAuth, ROUTE_OVERRIDES, ROLE_LABELS, useLoginModal } from '../contexts';
import { getPrimaryDashboardRoute } from '@o4o/auth-utils';
import type { User as UserType } from '../contexts';

/**
 * Super Operator 감지 헬퍼
 * WO-KPA-SUPER-OPERATOR-BASELINE-REFINE-V1
 *
 * Super Operator 판단 기준:
 * 1. user.isSuperOperator === true
 * 2. roles에 'platform:operator' 또는 'super_operator' 포함
 * 3. currentRole이 'operator' 계열
 */
function isSuperOperator(user: UserType | null): boolean {
  if (!user) return false;

  // 명시적 플래그
  if ((user as any).isSuperOperator) return true;

  // 역할 기반 판단
  const operatorRoles = ['platform:operator', 'super_operator', 'platform:admin'];
  if (user.roles?.some(r => operatorRoles.includes(r))) return true;
  if (user.roles?.some(r => operatorRoles.includes(r))) return true;

  return false;
}

export default function AccountMenu() {
  const { user, isAuthenticated, logout } = useAuth();
  const { openLoginModal, openRegisterModal } = useLoginModal();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ESC 키로 메뉴 닫기
  useEffect(() => {
    function handleEscKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [isOpen]);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate('/');
  };

  // 비로그인 상태: 로그인 + 회원가입
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => openLoginModal(location.pathname + location.search)}
          className="text-gray-700 px-4 py-2 text-sm font-medium hover:text-primary-600 transition-colors"
        >
          로그인
        </button>
        <button
          onClick={() => openRegisterModal()}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          회원가입
        </button>
      </div>
    );
  }

  // 현재 역할에 따른 대시보드 경로
  const activeRole = user.roles[0];
  const dashboardPath = getPrimaryDashboardRoute([activeRole], ROUTE_OVERRIDES);
  const roleLabel = ROLE_LABELS[activeRole] || '사용자';
  const isOperator = isSuperOperator(user);

  // 표시 이름: lastName + firstName > name > '운영자' 우선순위
  const extUser = user as any;
  let displayName = '운영자';
  if (extUser.lastName || extUser.firstName) {
    displayName = `${extUser.lastName || ''}${extUser.firstName || ''}`.trim() || displayName;
  } else if (user.name && user.name !== user.email) {
    displayName = user.name;
  }

  return (
    <div ref={menuRef} className="relative">
      {/* 프로필 아이콘 버튼 - Super Operator는 다른 색상 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          isOperator
            ? 'bg-amber-100 hover:bg-amber-200 focus:ring-amber-500'
            : 'bg-gray-100 hover:bg-gray-200 focus:ring-primary-500'
        }`}
        aria-label="계정 메뉴"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {isOperator ? (
          <Shield className="w-5 h-5 text-amber-600" />
        ) : (
          <User className="w-5 h-5 text-gray-600" />
        )}
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* 사용자 정보 */}
          <div className={`px-4 py-3 border-b ${isOperator ? 'border-amber-100 bg-amber-50' : 'border-gray-100'}`}>
            <p className="text-sm font-medium text-gray-900 truncate">
              {displayName}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user.email}
            </p>
            <p className={`text-xs mt-1 ${isOperator ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
              {isOperator ? '🛡️ Super Operator' : roleLabel}
            </p>
          </div>

          {/* 메뉴 항목 */}
          <div className="py-1">
            {isOperator ? (
              /* Super Operator 전용 메뉴 (간소화) */
              <>
                {/* 프로필 */}
                <Link
                  to="/my"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <User className="w-4 h-4 text-gray-500" />
                  프로필
                </Link>
              </>
            ) : (
              /* 일반 사용자 메뉴 */
              <>
                {/* 마이페이지 */}
                <Link
                  to="/my"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="w-4 h-4 text-gray-500" />
                  마이페이지
                </Link>

                {/* 내 대시보드 - user 역할이 아닌 경우에만 표시 */}
                {activeRole !== 'user' && (
                  <Link
                    to={dashboardPath}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4 text-gray-500" />
                    내 대시보드
                  </Link>
                )}
              </>
            )}

            {/* 로그아웃 - 공통 */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <LogOut className="w-4 h-4 text-gray-500" />
              로그아웃
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
