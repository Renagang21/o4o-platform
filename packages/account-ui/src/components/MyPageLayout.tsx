import type { ReactNode } from 'react';
import { MyPageNavigation } from './MyPageNavigation.js';
import type { MyPageNavItem } from './MyPageNavigation.js';

export interface MyPageBreadcrumbItem {
  label: string;
  href?: string;
}

export type MyPageLayoutWidth = 'wide' | 'list' | 'form';

interface MyPageLayoutProps {
  /** Page title displayed above navigation */
  title?: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Optional breadcrumb shown above the title. Last item rendered as plain text. */
  breadcrumb?: MyPageBreadcrumbItem[];
  /** Container width — 'wide' (1120px) / 'list' (1120px) / 'form' (860px inner). Default keeps existing max-w-4xl behavior when omitted. */
  width?: MyPageLayoutWidth;
  /** Base path for mypage routes (default: '/mypage') */
  basePath?: string;
  /** Custom navigation items. Paths are relative to basePath. */
  navItems?: MyPageNavItem[];
  /** Set to false to hide navigation (e.g. for single-page mode) */
  showNav?: boolean;
  children: ReactNode;
}

/**
 * Canonical MyPage 외곽 폭 — KPA-Society `layouts/MyPageLayout` 기준 정렬.
 *   - 'wide' / 'list' / 'form' : outer 1120px ('form' 은 children 을 860px inner 로 제한)
 *   - width 미지정              : 기존 호환 위해 4xl 유지 (서브페이지 폼 과폭 방지)
 */
function getOuterMaxWidth(width?: MyPageLayoutWidth): string {
  if (!width) return 'max-w-4xl';
  return 'max-w-[1120px]';
}

export function MyPageLayout({
  title,
  subtitle,
  breadcrumb,
  width,
  basePath = '/mypage',
  navItems,
  showNav = true,
  children,
}: MyPageLayoutProps) {
  const outerMaxWidth = getOuterMaxWidth(width);
  const hasBreadcrumb = breadcrumb && breadcrumb.length > 0;
  const hasHeader = Boolean(title) || hasBreadcrumb;

  return (
    // KPA 정렬: 상단 패딩은 PageHeader(py-8)가 제공, 좌우는 반응형 패딩, 하단 pb-10
    <div className={`${outerMaxWidth} mx-auto px-4 sm:px-5 lg:px-6 pb-10`}>
      {/* PageHeader block — breadcrumb / title / 하단 divider (KPA canonical rhythm) */}
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
          {title && (
            <h1 className="text-3xl font-semibold text-gray-900 m-0">{title}</h1>
          )}
          {subtitle && (
            <p className="text-base text-gray-500 mt-2">{subtitle}</p>
          )}
        </div>
      )}
      {showNav && (
        <MyPageNavigation basePath={basePath} items={navItems} />
      )}
      {width === 'form' ? (
        <div className="w-full max-w-[860px]">{children}</div>
      ) : (
        children
      )}
    </div>
  );
}
