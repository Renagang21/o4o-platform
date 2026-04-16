import type { ReactNode } from 'react';
import { MyPageNavigation } from './MyPageNavigation.js';
import type { MyPageNavItem } from './MyPageNavigation.js';

interface MyPageLayoutProps {
  /** Page title displayed above navigation */
  title?: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Base path for mypage routes (default: '/mypage') */
  basePath?: string;
  /** Custom navigation items. Paths are relative to basePath. */
  navItems?: MyPageNavItem[];
  /** Set to false to hide navigation (e.g. for single-page mode) */
  showNav?: boolean;
  children: ReactNode;
}

export function MyPageLayout({
  title,
  subtitle,
  basePath = '/mypage',
  navItems,
  showNav = true,
  children,
}: MyPageLayoutProps) {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
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
      {children}
    </div>
  );
}
