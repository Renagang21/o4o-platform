/**
 * GlobalUserProfileDropdown — Header 사용자 프로필 드롭다운 공통 컴포넌트
 *
 * WO-O4O-GLOBAL-USER-PROFILE-DROPDOWN-EXTRACTION-V1
 *
 * 4개 서비스(KPA-Society, GlycoPharm, K-Cosmetics, Neture)에 중복 구현된
 * Header 사용자 영역의 공통 추출. UI/동작만 담당하며, role/serviceKey/auth context
 * 판단은 모두 호출 측에서 수행한 결과를 props로 받는다.
 *
 * 기준 reference: Neture AccountMenu (click trigger, a11y, outside-close, ESC-close)
 */

import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { User, LogOut } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GlobalUserProfileUser {
  /** 표시 이름 — 호출 측에서 getUserDisplayName 등으로 미리 계산 */
  displayName: string;
  /** 이메일 */
  email?: string | null;
  /** 역할 라벨 (e.g. "운영자", "공급자") */
  roleLabel?: string | null;
  /** 헤더 우측 배지 (e.g. Super Operator) */
  badge?: ReactNode;
}

export interface GlobalUserProfileMenuItem {
  /** 항목 식별 키 */
  key: string;
  /** 좌측 아이콘 */
  icon?: ReactNode;
  /** 라벨 */
  label?: ReactNode;
  /** 내부 라우트 경로 — react-router Link 사용 */
  href?: string;
  /** 클릭 핸들러 — href 없을 때 사용 */
  onClick?: () => void;
  /** 표시 변형 */
  variant?: 'default' | 'highlighted';
  /**
   * 커스텀 렌더 — KPA DashboardSwitcher 같은 특수 항목을 흡수.
   * node가 있으면 다른 필드(icon/label/href/onClick)는 무시되고 ReactNode가 그대로 렌더된다.
   *
   * 두 가지 형태 지원:
   *   - `ReactNode` — 정적 노드 (드롭다운 닫힘 처리는 호출 측에서 별도 수행)
   *   - `(close: () => void) => ReactNode` — close 콜백을 받아 onNavigate 등에 전달 가능
   */
  node?: ReactNode | ((close: () => void) => ReactNode);
}

export interface GlobalUserProfileDropdownProps {
  user: GlobalUserProfileUser;
  menuItems: GlobalUserProfileMenuItem[];
  onLogout: () => void;
  logoutLabel?: string;
  /** 트리거 패턴 — 기본 click. KPA 호환을 위해 'hover' 옵션 허용 */
  trigger?: 'click' | 'hover';
  /** 패널 정렬 — 기본 'right' */
  align?: 'right' | 'left';
  /** 패널 너비 Tailwind 클래스 — 기본 w-64 */
  widthClassName?: string;
  /** 추가 wrapper className */
  className?: string;
  /** 트리거 버튼 aria-label — 기본 '계정 메뉴' */
  triggerAriaLabel?: string;
  /** 헤더 영역(이름/이메일/배지) 강조 색상 className — Super Operator 등 */
  headerClassName?: string;
  /** 트리거 버튼 className 오버라이드 — Super Operator 등 변형 색상 */
  triggerClassName?: string;
  /** 트리거 아이콘 색상 className — 기본 'text-gray-600' */
  triggerIconClassName?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GlobalUserProfileDropdown({
  user,
  menuItems,
  onLogout,
  logoutLabel = '로그아웃',
  trigger = 'click',
  align = 'right',
  widthClassName = 'w-64',
  className,
  triggerAriaLabel = '계정 메뉴',
  headerClassName,
  triggerClassName,
  triggerIconClassName,
}: GlobalUserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // outside click 닫기 (click 트리거에서만 활성화)
  useEffect(() => {
    if (trigger !== 'click' || !isOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [trigger, isOpen]);

  // ESC 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const close = () => setIsOpen(false);

  const handleLogout = () => {
    close();
    onLogout();
  };

  const wrapperProps =
    trigger === 'hover'
      ? {
          onMouseEnter: () => setIsOpen(true),
          onMouseLeave: () => setIsOpen(false),
        }
      : {};

  const alignClass = align === 'right' ? 'right-0' : 'left-0';

  return (
    <div
      ref={wrapperRef}
      className={`relative ${className ?? ''}`.trim()}
      {...wrapperProps}
    >
      <button
        type="button"
        onClick={trigger === 'click' ? () => setIsOpen((v) => !v) : undefined}
        className={
          triggerClassName ??
          'flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
        }
        aria-label={triggerAriaLabel}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <User className={`w-5 h-5 ${triggerIconClassName ?? 'text-gray-600'}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute ${alignClass} top-full pt-2 z-50`}
        >
          <div
            className={`${widthClassName} bg-white rounded-lg shadow-lg border border-gray-200 py-2`}
            role="menu"
          >
          {/* 사용자 정보 */}
          <div className={`px-4 py-3 border-b border-gray-100 ${headerClassName ?? ''}`.trim()}>
            <p className="text-sm font-medium text-gray-900 truncate">{user.displayName}</p>
            {user.email && (
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            )}
            {user.roleLabel && (
              <p className="text-xs mt-1 text-gray-500">{user.roleLabel}</p>
            )}
            {user.badge && <div className="mt-1">{user.badge}</div>}
          </div>

          {/* 메뉴 항목 */}
          {menuItems.length > 0 && (
            <div className="py-1">
              {menuItems.map((item) => (
                <MenuRow key={item.key} item={item} onNavigate={close} />
              ))}
            </div>
          )}

          {/* 구분선 + 로그아웃 */}
          <div className="border-t border-gray-100 my-1" />
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            role="menuitem"
          >
            <LogOut className="w-4 h-4 text-gray-500" />
            {logoutLabel}
          </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Menu Row ─────────────────────────────────────────────────────────────────

function MenuRow({
  item,
  onNavigate,
}: {
  item: GlobalUserProfileMenuItem;
  onNavigate: () => void;
}) {
  if (item.node !== undefined) {
    const content = typeof item.node === 'function' ? item.node(onNavigate) : item.node;
    return <>{content}</>;
  }

  const baseClass =
    'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50';
  const colorClass =
    item.variant === 'highlighted' ? 'text-blue-700' : 'text-gray-700';
  const className = `${baseClass} ${colorClass}`;

  if (item.href) {
    return (
      <Link
        to={item.href}
        onClick={onNavigate}
        className={className}
        role="menuitem"
      >
        {item.icon}
        {item.label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        item.onClick?.();
        onNavigate();
      }}
      className={`${className} w-full text-left`}
      role="menuitem"
    >
      {item.icon}
      {item.label}
    </button>
  );
}

export default GlobalUserProfileDropdown;
