/**
 * MobileBottomNavProfileSheet — '내정보' 하단 시트(공통 정본)
 *
 * WO-O4O-CROSSSERVICE-MOBILE-BOTTOM-NAV-COMMONIZATION-V1
 *
 * KPA(`KpaUserMenuItems`) 와 Neture(`NetureUserMenuItems`) 가 각각 들고 있던
 * 동일한 시트 마크업(헤더 이름/이메일 + 닫기 + 메뉴 + 로그아웃)의 정본이다.
 * 메뉴 항목 자체는 서비스 SSOT 이므로 children 으로 주입한다.
 *
 * GlycoPharm / K-Cosmetics 는 '내정보' 가 `/mypage` Link 라 이 시트를 쓰지 않는다.
 */

import { X, LogOut } from 'lucide-react';
import type { ReactNode } from 'react';

export interface MobileBottomNavProfileSheetProps {
  /** 표시 이름. '님' 은 이 컴포넌트가 붙인다. */
  displayName: string;
  email?: string | null;
  /** 서비스 역할 라벨(있는 서비스만). */
  roleLabel?: string | null;
  /** 역할 라벨 색 (Tailwind class). */
  roleLabelClassName?: string;
  onClose: () => void;
  onLogout: () => void;
  /** 서비스별 사용자 메뉴 항목 (SSOT 재사용). */
  children: ReactNode;
  ariaLabel?: string;
  logoutLabel?: string;
}

export function MobileBottomNavProfileSheet({
  displayName,
  email,
  roleLabel,
  roleLabelClassName = 'text-blue-700',
  onClose,
  onLogout,
  children,
  ariaLabel = '내 정보 메뉴',
  logoutLabel = '로그아웃',
}: MobileBottomNavProfileSheetProps) {
  return (
    <div
      role="menu"
      aria-label={ariaLabel}
      className="md:hidden fixed left-0 right-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{displayName}님</p>
          <p className="text-xs text-slate-500 break-all">{email}</p>
          {roleLabel && (
            <p className={`mt-0.5 text-xs font-medium ${roleLabelClassName}`}>{roleLabel}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <nav className="py-1">{children}</nav>
      <div className="border-t border-slate-100 py-1">
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left"
        >
          <LogOut className="w-4 h-4" />
          {logoutLabel}
        </button>
      </div>
    </div>
  );
}
