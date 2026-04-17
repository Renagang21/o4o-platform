/**
 * GlobalHeader — O4O Platform 공통 Header
 *
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1
 * 표준: docs/architecture/ui/global-header-standard-v1.md
 *
 * 4-슬롯 구조: BrandSlot / PrimaryNav / UtilityArea / UserArea
 * 높이: 64px 고정
 * 스타일: Tailwind CSS
 *
 * 이 컴포넌트는 서비스별 컨텍스트(Auth, LoginModal 등)에 의존하지 않는다.
 * 모든 데이터는 props로 주입받는다.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, Menu, X } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GlobalHeaderNavItem {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}

export interface GlobalHeaderBrand {
  /** 서비스 로고 아이콘 (ReactNode: emoji, SVG, lucide icon 등) */
  icon: React.ReactNode;
  /** 서비스명 */
  name: string;
  /** 서브타이틀 (선택) */
  subtitle?: string;
  /** 로고 클릭 시 이동 경로 (기본: '/') */
  href?: string;
  /** 브랜드 Primary Color (gradient, accent 등에 사용) */
  primaryColor?: string;
}

export interface GlobalHeaderUser {
  /** 표시 이름 (WO-O4O-NAME-NORMALIZATION-V1에 따라 서비스에서 해석 후 전달) */
  displayName: string;
  /** 이메일 */
  email: string;
  /** 역할 라벨 (선택, 예: "운영자", "약사") */
  roleLabel?: string;
}

export interface GlobalHeaderProps {
  /** 브랜드 정보 */
  brand: GlobalHeaderBrand;
  /** 공개 메뉴 (모든 사용자에게 표시) */
  publicNav: GlobalHeaderNavItem[];
  /** 조건부 메뉴 (인증/역할 조건 충족 시 표시, 서비스에서 필터링 후 전달) */
  contextualNav?: GlobalHeaderNavItem[];
  /** 인증된 사용자 정보 (null 또는 undefined면 비인증) */
  user?: GlobalHeaderUser | null;
  /** 인증 상태 (user가 있으면 자동 true, 명시적 override 가능) */
  isAuthenticated?: boolean;
  /** 로그인 버튼 클릭 */
  onLogin?: () => void;
  /** 회원가입 버튼 클릭 */
  onRegister?: () => void;
  /** 로그아웃 클릭 */
  onLogout?: () => void;
  /** UserArea 드롭다운 내부 커스텀 메뉴 항목 (대시보드, 마이페이지 등) */
  userMenuItems?: React.ReactNode;
  /** UtilityArea 슬롯 (ServiceSwitcher 등) */
  utilitySlot?: React.ReactNode;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GlobalHeader({
  brand,
  publicNav,
  contextualNav,
  user,
  isAuthenticated: isAuthProp,
  onLogin,
  onRegister,
  onLogout,
  userMenuItems,
  utilitySlot,
}: GlobalHeaderProps) {
  const location = useLocation();
  const isAuthenticated = isAuthProp ?? !!user;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const primaryColor = brand.primaryColor || '#2563eb';

  // Close user menu on ESC
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [userMenuOpen]);

  // Close user menu on click outside
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  const allNav = [
    ...publicNav,
    ...(contextualNav && contextualNav.length > 0 ? contextualNav : []),
  ];
  const hasContextualNav = contextualNav && contextualNav.length > 0;

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
      <div className="max-w-[1280px] mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          {/* ── BrandSlot ── */}
          <Link to={brand.href || '/'} className="flex items-center gap-2 no-underline shrink-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}cc, ${primaryColor})`,
                boxShadow: `0 4px 12px ${primaryColor}40`,
              }}
            >
              {typeof brand.icon === 'string' ? (
                <span>{brand.icon}</span>
              ) : (
                brand.icon
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl text-slate-800 leading-tight">
                {brand.name}
              </span>
              {brand.subtitle && (
                <span className="text-[10px] text-slate-500 -mt-0.5">
                  {brand.subtitle}
                </span>
              )}
            </div>
          </Link>

          {/* ── PrimaryNav (desktop) ── */}
          <nav className="hidden md:flex items-center gap-1">
            {publicNav.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors no-underline ${
                  isActive(item.href, location.pathname)
                    ? 'text-slate-900 bg-slate-100'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </Link>
            ))}
            {hasContextualNav && (
              <div className="w-px h-5 bg-slate-200 mx-1" aria-hidden="true" />
            )}
            {contextualNav?.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors no-underline ${
                  isActive(item.href, location.pathname)
                    ? 'bg-slate-100'
                    : 'hover:bg-slate-50'
                }`}
                style={{
                  color: isActive(item.href, location.pathname)
                    ? primaryColor
                    : `${primaryColor}cc`,
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* ── UtilityArea + UserArea (desktop) ── */}
          <div className="hidden md:flex items-center gap-3">
            {/* Utility Slot (ServiceSwitcher 등) */}
            {isAuthenticated && utilitySlot}

            {/* UserArea */}
            {isAuthenticated && user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center justify-center p-1 rounded-full border-none bg-transparent cursor-pointer hover:bg-slate-100 transition-colors"
                  aria-label="사용자 메뉴"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor}88, ${primaryColor})`,
                      boxShadow: `0 2px 8px ${primaryColor}50`,
                    }}
                  >
                    <User className="w-5 h-5 text-white" />
                  </div>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-slate-200 py-2 z-50">
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-800 m-0">
                        {user.displayName}님
                      </p>
                      <p className="text-xs text-slate-500 m-0 mt-0.5">
                        {user.email}
                      </p>
                      {user.roleLabel && (
                        <p
                          className="text-[11px] font-medium m-0 mt-1"
                          style={{ color: primaryColor }}
                        >
                          {user.roleLabel}
                        </p>
                      )}
                    </div>

                    {/* Custom menu items (대시보드, 마이페이지 등) */}
                    {userMenuItems && (
                      <div className="py-1" onClick={() => setUserMenuOpen(false)}>
                        {userMenuItems}
                      </div>
                    )}

                    {/* Logout */}
                    <div className="border-t border-slate-100 pt-1">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onLogout?.();
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 bg-transparent border-none cursor-pointer text-left hover:bg-red-50 transition-colors"
                      >
                        로그아웃
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {onLogin && (
                  <button
                    onClick={onLogin}
                    className="px-4 py-2 text-sm font-medium text-slate-500 bg-transparent border-none cursor-pointer hover:text-slate-700 transition-colors"
                  >
                    로그인
                  </button>
                )}
                {onRegister && (
                  <Link
                    to="/register"
                    className="px-4 py-2 text-sm font-medium text-white rounded-xl no-underline shadow-sm hover:opacity-90 transition-opacity"
                    style={{
                      backgroundColor: primaryColor,
                      boxShadow: `0 4px 12px ${primaryColor}40`,
                    }}
                    onClick={() => onRegister()}
                  >
                    회원가입
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* ── Mobile Menu Toggle ── */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg border-none bg-transparent cursor-pointer hover:bg-slate-100 transition-colors"
            aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-slate-600" />
            ) : (
              <Menu className="w-6 h-6 text-slate-600" />
            )}
          </button>
        </div>

        {/* ── Mobile Menu ── */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200">
            <nav className="flex flex-col gap-1">
              {allNav.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`px-4 py-3 rounded-xl text-sm font-medium no-underline transition-colors ${
                    isActive(item.href, location.pathname)
                      ? 'text-slate-900 bg-slate-100'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-4 pt-4 border-t border-slate-200">
              {isAuthenticated && user ? (
                <div className="space-y-1">
                  <div className="px-4 py-2">
                    <p className="text-sm font-semibold text-slate-800">
                      {user.displayName}님
                    </p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  {userMenuItems}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogout?.();
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 bg-transparent border-none cursor-pointer hover:bg-red-50 rounded-xl"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {onLogin && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onLogin();
                      }}
                      className="block w-full py-3 text-center text-sm font-medium text-slate-500 border border-slate-200 rounded-xl bg-white cursor-pointer hover:bg-slate-50"
                    >
                      로그인
                    </button>
                  )}
                  {onRegister && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onRegister();
                      }}
                      className="block w-full py-3 text-center text-sm font-medium text-white rounded-xl border-none cursor-pointer"
                      style={{ backgroundColor: primaryColor }}
                    >
                      회원가입
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

// ─── UserMenuItem helper ─────────────────────────────────────────────────────

/** 드롭다운/모바일 메뉴에서 사용할 수 있는 표준 메뉴 항목 */
export function GlobalHeaderMenuItem({
  to,
  icon,
  children,
  onClick,
}: {
  to: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-600 no-underline hover:bg-slate-50 transition-colors"
    >
      {icon && <span className="text-slate-400">{icon}</span>}
      {children}
    </Link>
  );
}
