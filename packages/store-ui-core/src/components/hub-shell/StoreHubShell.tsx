/**
 * StoreHubShell — 매장 운영 허브(/store-hub) 공통 Shell
 *
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1
 *
 * KPA-Society(390L) · K-Cosmetics(233L) · GlycoPharm(234L) 의 HUB layout 이
 * "좌측 사이드바(제목/부제 + 메뉴 + 하단 안내) + 우측 Outlet + mobile drawer" 로 동일했다.
 * 그 골격을 여기로 모으고, 서비스는 아래 config 만 소유한다.
 *
 *   nav config(그룹/항목) · accent · label(제목/부제/하단 안내) · sidebarId ·
 *   optional headerSlot · optional footer(서비스 푸터)
 *
 * 서비스 이름 분기(`service === 'kpa'`)는 이 파일에 두지 않는다.
 *
 * 정규화 (CHECK 기록 대상):
 *   - drawer 분기점을 `lg` 로 통일한다 (KPA 는 `md` 였다).
 *   - 본문 폭을 `max-w-7xl` 로 통일한다 (KPA 1400px / KCos·GP `max-w-5xl` 였다).
 *   - KPA 의 inline style 사이드바를 Tailwind 마크업으로 옮긴다. 메뉴·라우트·권한 무변경.
 *
 * 유지 (서비스 정상 업무 차이):
 *   - 그룹 헤더가 있는 메뉴(KPA)와 평면 메뉴(KCos/GP) 를 같은 config 로 표현한다.
 *   - 항목 강조(highlight) · 수치 배지(countBadge) · 준비중 표기(disabledBadge) 는 항목 config.
 */

import type { ComponentType, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { storeAccentTokens } from '../../theme/storeAccent';
import type { StoreAccent } from '../../theme/storeAccent';

export interface StoreHubNavItem {
  key: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  /** `disabledBadge` 가 있으면 생략한다. */
  to?: string;
  /** NavLink 의 exact 매칭 여부 (허브 홈처럼 상위 경로인 항목에 사용) */
  end?: boolean;
  /** '준비 중' 등 — 링크 대신 비활성 항목으로 렌더한다. */
  disabledBadge?: string;
  /** 광고·홍보 성격 강조 (KPA '이벤트·특가') */
  highlight?: boolean;
  /** 우측 수치 배지 (예: '진행 3'). 없으면 미표시. */
  countBadge?: string | null;
}

export interface StoreHubNavGroup {
  /** 빈 문자열이면 그룹 헤더를 렌더하지 않는다 (평면 메뉴). */
  label: string;
  items: StoreHubNavItem[];
}

export interface StoreHubShellProps {
  accent: StoreAccent;
  /** 사이드바 제목 — '약국 운영 허브' / '매장 운영 허브' */
  title: string;
  /** 사이드바 부제 */
  subtitle: string;
  groups: StoreHubNavGroup[];
  /** 사이드바 하단 안내 — '탐색한 자원은 내 약국 (/store)에서 설정·운영합니다.' */
  footerNote: string;
  /** aria-controls 대상 id (서비스별 고유) */
  sidebarId: string;
  /** 사이드바 상단 추가 영역 (선택) */
  headerSlot?: ReactNode;
  /** 서비스 푸터 (StoreFacingFooter 등). 서비스가 주입한다. */
  footer?: ReactNode;
  /** 본문 — 보통 <Outlet /> */
  children: ReactNode;
}

export function StoreHubShell({
  accent,
  title,
  subtitle,
  groups,
  footerNote,
  sidebarId,
  headerSlot,
  footer,
  children,
}: StoreHubShellProps) {
  const ac = storeAccentTokens(accent);

  // WO-O4O-RESPONSIVE-SIDEBAR-P0-BROKEN-MOBILE-DRAWER-FIX-V1:
  //   <lg 에서 sidebar 를 drawer 로 전환 (hamburger + overlay + 자동 close + ESC).
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="max-w-7xl mx-auto px-4 py-8 w-full flex-1">
        {/* Mobile-only sidebar toggle — desktop(lg) 숨김 */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="허브 메뉴 열기"
          aria-expanded={mobileOpen}
          aria-controls={sidebarId}
          className="lg:hidden mb-4 flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Menu className="w-5 h-5" />
          허브 메뉴
        </button>

        {/* Mobile drawer backdrop */}
        {mobileOpen && (
          <div
            className="lg:hidden fixed inset-x-0 top-16 bottom-0 bg-black/40 z-30"
            onClick={closeMobile}
            aria-hidden="true"
          />
        )}

        <div className="flex gap-6 items-start">
          {/* ── 좌측 사이드바 (mobile drawer / desktop sticky) ── */}
          <aside
            id={sidebarId}
            className={`bg-white border border-slate-200 overflow-y-auto z-40 w-72 max-w-[85%] fixed left-0 top-16 bottom-0 transition-transform duration-200 ease-out lg:static lg:top-20 lg:bottom-auto lg:left-auto lg:z-auto lg:w-60 lg:max-w-none lg:shrink-0 lg:self-start lg:rounded-xl lg:overflow-hidden lg:transition-none lg:translate-x-0 lg:sticky ${
              mobileOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="px-4 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800">{title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
              {headerSlot}
            </div>

            <nav className="py-2">
              {groups.map((group) => (
                <div key={group.label || '_root'} className="pb-1">
                  {group.label && (
                    <span className="block px-4 pt-3 pb-1 text-sm font-semibold tracking-wide text-slate-600">
                      {group.label}
                    </span>
                  )}
                  {group.items.map((item) => {
                    const Icon = item.icon;

                    if (item.disabledBadge || !item.to) {
                      return (
                        <div
                          key={item.key}
                          className="flex items-start gap-3 px-4 py-3 opacity-50 cursor-not-allowed"
                        >
                          <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm text-slate-500">{item.label}</span>
                              {item.disabledBadge && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-400 rounded">
                                  {item.disabledBadge}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <NavLink
                        key={item.key}
                        to={item.to}
                        end={item.end}
                        onClick={closeMobile}
                        className={({ isActive }) =>
                          `flex items-start gap-3 px-4 py-3 transition-colors relative ${
                            isActive ? ac.navActive : 'hover:bg-slate-50 text-slate-700'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <span
                                className={`absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-l ${ac.navIndicator}`}
                              />
                            )}
                            <Icon
                              className={`w-4 h-4 mt-0.5 shrink-0 ${
                                isActive
                                  ? ac.navIconActive
                                  : item.highlight
                                    ? 'text-red-600'
                                    : 'text-slate-400'
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className={`text-sm font-medium ${
                                    isActive
                                      ? ''
                                      : item.highlight
                                        ? 'text-red-600 font-semibold'
                                        : 'text-slate-700'
                                  }`}
                                >
                                  {item.label}
                                </span>
                                {item.countBadge && (
                                  <span className="inline-block px-1.5 py-px text-[10px] font-bold leading-tight text-white bg-red-600 rounded-full whitespace-nowrap shrink-0">
                                    {item.countBadge}
                                  </span>
                                )}
                              </span>
                              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                                {item.description}
                              </p>
                            </div>
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              ))}
            </nav>

            <div className="px-4 py-3 border-t border-slate-100">
              <p className="text-[11px] text-slate-400 leading-relaxed">{footerNote}</p>
            </div>
          </aside>

          {/* ── 우측 본문 ── */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>

      {footer}
    </div>
  );
}
