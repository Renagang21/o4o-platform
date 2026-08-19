/**
 * MyPageShell — 5 서비스 My Page 공통 화면 골격
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1
 *
 * 목적: 개별 기능(요청/알림/활동/LMS/매장 …)을 넣을 **공통 그릇**을 먼저 고정한다.
 *       기능 내부 로직은 이 파일의 책임이 아니다 (WO §15).
 *
 * 구조 (WO §6):
 *   MyPageShell
 *   ├─ MyPageHeader        breadcrumb / title / subtitle / headerActions
 *   ├─ MyPageNavigation    desktop tab strip + mobile 가로 스크롤(활성 tab auto-reveal)
 *   ├─ StatusNoticeSlot    statusNotice
 *   ├─ UserSummary         userSummary  (MyPageUserSummary 를 넣는 자리)
 *   ├─ MyPageContent       children  (+ CommonEntryCards = MyPageEntryCardGrid)
 *   └─ ServiceExtensionSlot extension
 *
 * 원칙 (WO §6):
 *   서비스별 정책을 이 파일에 하드코딩하지 않는다.
 *   서비스 차이는 전부 props / config / slot 으로 주입한다.
 *   → 이 파일에는 serviceKey · role 문자열 · 서비스 이름 분기가 하나도 없다.
 *
 * 표시 순서 주의 (의도적 결정):
 *   WO §6 의 개념도는 UserSummary 를 Navigation 위에 그리지만, 현행 4 서비스는
 *   모두 tab strip 아래에 요약 카드를 두고 있다. 순서를 뒤집으면 기능 이득 없이
 *   4 서비스 화면이 동시에 흔들리므로 **현행 순서(nav → notice → summary)를 유지**한다.
 *   개념도의 구성 요소는 전부 슬롯으로 존재한다.
 */

import type { ReactNode } from 'react';
import { MyPageNavigation } from './MyPageNavigation.js';
import type { MyPageNavItem } from './MyPageNavigation.js';

export interface MyPageBreadcrumbItem {
  label: string;
  href?: string;
}

export type MyPageLayoutWidth = 'wide' | 'list' | 'form';

export interface MyPageShellProps {
  /** Page title displayed above navigation */
  title?: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Optional breadcrumb shown above the title. Last item rendered as plain text. */
  breadcrumb?: MyPageBreadcrumbItem[];
  /** 제목 우측 액션 슬롯 (알림 벨 등). 좁은 폭에서는 제목 아래로 흐른다. */
  headerActions?: ReactNode;
  /** Container width — 'wide' (1120px) / 'list' (1120px) / 'form' (860px inner). Default keeps existing max-w-4xl behavior when omitted. */
  width?: MyPageLayoutWidth;
  /** Base path for mypage routes (default: '/mypage') */
  basePath?: string;
  /** Custom navigation items. Paths are relative to basePath. */
  navItems?: MyPageNavItem[];
  /** Set to false to hide navigation (e.g. for single-page mode) */
  showNav?: boolean;
  /** 상태/공지 슬롯 — 승인 대기·권한 안내 배너 등. nav 바로 아래. */
  statusNotice?: ReactNode;
  /** 사용자 요약 슬롯 — MyPageUserSummary 를 넣는다. */
  userSummary?: ReactNode;
  /** 서비스 고유 영역 슬롯 — 공통 content 뒤에 렌더된다 (WO §9 Extension). */
  extension?: ReactNode;
  children?: ReactNode;
}

/**
 * Canonical MyPage 외곽 폭 — KPA-Society 기준 정렬.
 *   - 'wide' / 'list' / 'form' : outer 1120px ('form' 은 children 을 860px inner 로 제한)
 *   - width 미지정              : 기존 호환 위해 4xl 유지 (서브페이지 폼 과폭 방지)
 */
function getOuterMaxWidth(width?: MyPageLayoutWidth): string {
  if (!width) return 'max-w-4xl';
  return 'max-w-[1120px]';
}

export function MyPageShell({
  title,
  subtitle,
  breadcrumb,
  headerActions,
  width,
  basePath = '/mypage',
  navItems,
  showNav = true,
  statusNotice,
  userSummary,
  extension,
  children,
}: MyPageShellProps) {
  const outerMaxWidth = getOuterMaxWidth(width);
  const hasBreadcrumb = Boolean(breadcrumb && breadcrumb.length > 0);
  const hasHeader = Boolean(title) || hasBreadcrumb;

  return (
    // 상단 패딩은 header block(py-8)이 제공, 좌우는 반응형 패딩, 하단 pb-10
    <div className={`${outerMaxWidth} mx-auto px-4 sm:px-5 lg:px-6 pb-10`}>
      {/* MyPageHeader — breadcrumb / title / subtitle / actions + 하단 divider */}
      {hasHeader && (
        <div className="py-8 border-b border-gray-300 mb-6">
          {hasBreadcrumb && (
            <nav className="mb-3 text-xs text-gray-500" aria-label="breadcrumb">
              <ol className="flex items-center flex-wrap">
                {breadcrumb!.map((item, idx) => {
                  const isLast = idx === breadcrumb!.length - 1;
                  return (
                    <li key={`${item.label}-${idx}`} className="flex items-center">
                      {idx > 0 && <span className="mx-2 text-gray-300">/</span>}
                      {!isLast && item.href ? (
                        <a href={item.href} className="text-gray-500 hover:text-gray-700 transition-colors">
                          {item.label}
                        </a>
                      ) : (
                        <span className={isLast ? 'text-gray-700' : 'text-gray-500'}>
                          {item.label}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}
          {/* 좁은 폭에서는 세로로 쌓아 제목이 액션에 밀려 줄바꿈되지 않게 한다 (WO §12 header wrapping) */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              {title && (
                <h1 className="text-3xl font-semibold text-gray-900 m-0 break-keep">{title}</h1>
              )}
              {subtitle && (
                <p className="text-base text-gray-500 mt-2">{subtitle}</p>
              )}
            </div>
            {headerActions && <div className="shrink-0">{headerActions}</div>}
          </div>
        </div>
      )}

      {showNav && <MyPageNavigation basePath={basePath} items={navItems} />}

      {statusNotice && <div className="mb-6">{statusNotice}</div>}

      {userSummary}

      {width === 'form' ? (
        <div className="w-full max-w-[860px]">{children}</div>
      ) : (
        children
      )}

      {extension}
    </div>
  );
}

/**
 * MyPageLayout — MyPageShell 의 호환 별칭.
 *
 * 기존 4 서비스 20+ 호출부가 이 이름으로 소비 중이라 이름을 유지한다.
 * 구현은 MyPageShell 하나뿐이며 별도 골격이 존재하지 않는다.
 */
export const MyPageLayout = MyPageShell;
