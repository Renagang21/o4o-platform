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

function getOuterMaxWidth(width?: MyPageLayoutWidth): string {
  if (!width) return 'max-w-4xl';
  return width === 'form' ? 'max-w-4xl' : 'max-w-[1120px]';
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

  return (
    <div className={`${outerMaxWidth} mx-auto py-10 px-4`}>
      {hasBreadcrumb && (
        <nav className="mb-3 text-sm text-gray-500" aria-label="breadcrumb">
          <ol className="flex items-center flex-wrap gap-1">
            {breadcrumb!.map((item, idx) => {
              const isLast = idx === breadcrumb!.length - 1;
              return (
                <li key={`${item.label}-${idx}`} className="flex items-center gap-1">
                  {idx > 0 && <span className="text-gray-300">/</span>}
                  {!isLast && item.href ? (
                    <a href={item.href} className="text-gray-500 hover:text-gray-700 transition-colors">
                      {item.label}
                    </a>
                  ) : (
                    <span className={isLast ? 'text-gray-800 font-medium' : 'text-gray-500'}>
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
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
