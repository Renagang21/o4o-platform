/**
 * AccountMenu - 상단 계정 영역 UI
 * WO-NETURE-UI-ACCOUNT-MENU-V1
 *
 * 프로필 아이콘 + 드롭다운 메뉴
 * - 이메일 표시 (읽기 전용)
 * - 내 대시보드 링크
 * - 로그아웃
 */

import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth, ROLE_DASHBOARDS, ROLE_LABELS, useLoginModal } from '../contexts';

export default function AccountMenu() {
  const { user, isAuthenticated, logout } = useAuth();
  const { openLoginModal } = useLoginModal();
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

  // 비로그인 상태: 로그인 버튼 (모달 열기)
  if (!isAuthenticated || !user) {
    return (
      <button
        onClick={() => openLoginModal(location.pathname + location.search)}
        className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
      >
        로그인
      </button>
    );
  }

  // 현재 역할에 따른 대시보드 경로
  const dashboardPath = ROLE_DASHBOARDS[user.currentRole] || '/';
  const roleLabel = ROLE_LABELS[user.currentRole] || '사용자';

  return (
    <div ref={menuRef} className="relative">
      {/* 프로필 아이콘 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
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
              {user.email}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {roleLabel}
            </p>
          </div>

          {/* 메뉴 항목 */}
          <div className="py-1">
            {/* 내 대시보드 - user 역할이 아닌 경우에만 표시 */}
            {user.currentRole !== 'user' && (
              <Link
                to={dashboardPath}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-gray-500" />
                내 대시보드
              </Link>
            )}

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
