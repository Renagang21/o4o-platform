/**
 * AccountMenu - 상단 계정 영역 UI
 * WO-NETURE-UI-ACCOUNT-MENU-V1
 * WO-O4O-AUTH-RBAC-CLEANUP-V1: isSuperOperator 제거, 단일 메뉴 통합
 *
 * 프로필 아이콘 + 드롭다운 메뉴
 * - 역할에 관계없이 단일 메뉴 구조
 * - admin/operator → 대시보드 링크 표시
 */

import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, LogOut, LayoutDashboard } from 'lucide-react';

import { useAuth, ROLE_LABELS, getNetureDashboardRoute, useLoginModal } from '../contexts';

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

  // WO-O4O-NETURE-AUTH-ROLE-REDIRECT-FIX-V1: 전체 roles로 대시보드 경로 결정
  const dashboardPath = getNetureDashboardRoute(user.roles);
  const activeRole = user.roles[0];
  const roleLabel = ROLE_LABELS[activeRole] || '사용자';

  // WO-O4O-AUTH-RBAC-CLEANUP-V1: 대시보드 대상 판별 (prefixed + unprefixed)
  const DASHBOARD_ROLES = ['supplier', 'partner', 'seller'];
  const hasDashboardRole = user.roles?.some((r: string) =>
    r.endsWith(':admin') || r.endsWith(':operator') || r.endsWith(':supplier') || r.endsWith(':partner') || r.endsWith(':seller') || r === 'platform:super_admin' || DASHBOARD_ROLES.includes(r)
  ) ?? false;

  // WO-O4O-NAME-NORMALIZATION-V1: displayName > lastName+firstName > name > email prefix > '사용자'
  const extUser = user as any;
  const displayName = extUser.displayName
    || ((extUser.lastName || extUser.firstName) ? `${extUser.lastName || ''}${extUser.firstName || ''}`.trim() : '')
    || (user.name && user.name !== user.email ? user.name : '')
    || user.email?.split('@')[0]
    || '사용자';

  return (
    <div ref={menuRef} className="relative">
      {/* 프로필 아이콘 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        aria-label="계정 메뉴"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <User className="w-5 h-5 text-gray-600" />
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* 사용자 정보 */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900 truncate">
              {displayName}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user.email}
            </p>
            <p className="text-xs mt-1 text-gray-500">
              {roleLabel}
            </p>
          </div>

          {/* 메뉴 항목 — WO-O4O-AUTH-RBAC-CLEANUP-V1: 단일 메뉴 구조 */}
          <div className="py-1">
            {/* 대시보드 - 대시보드 대상 역할인 경우 최상단 표시 */}
            {hasDashboardRole && (
              <Link
                to={dashboardPath}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-gray-500" />
                {roleLabel} 대시보드
              </Link>
            )}

            {/* 마이페이지 — WO-O4O-MYPAGE-LABEL-AND-ICON-UNIFICATION-V1: Settings → LayoutDashboard */}
            <Link
              to="/mypage"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-gray-500" />
              마이페이지
            </Link>

            {/* Account Center — 임시 숨김: account.neture.co.kr 서비스 미배포/SSL 미구성 (WO-O4O-ACCOUNT-CENTER-LINK-VISIBILITY-POLICY-ALIGNMENT-V1) */}
            <div className="border-t border-gray-100 my-1" />

            {/* 로그아웃 */}
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
