import { Link, useLocation } from 'react-router-dom';

export interface MyPageNavItem {
  label: string;
  path: string;
}

const DEFAULT_ITEMS: MyPageNavItem[] = [
  { label: '마이페이지', path: '' },
  { label: '프로필', path: '/profile' },
  { label: '설정', path: '/settings' },
];

interface MyPageNavigationProps {
  /** Base path for mypage routes (default: '/mypage') */
  basePath?: string;
  /** Custom navigation items. Paths are relative to basePath. */
  items?: MyPageNavItem[];
}

export function MyPageNavigation({
  basePath = '/mypage',
  items = DEFAULT_ITEMS,
}: MyPageNavigationProps) {
  const location = useLocation();
  const normalizedBase = basePath.replace(/\/+$/, '');

  return (
    <nav className="mb-6 border-b border-gray-200">
      <div className="flex flex-wrap">
        {items.map((item) => {
          const fullPath = item.path
            ? `${normalizedBase}${item.path}`
            : normalizedBase;

          const isActive = item.path
            ? location.pathname.startsWith(fullPath)
            : location.pathname === normalizedBase;

          return (
            <Link
              key={fullPath}
              to={fullPath}
              className={[
                'px-5 py-3 text-sm font-medium whitespace-nowrap -mb-px border-b-2 transition-colors',
                isActive
                  ? 'text-primary-600 border-primary-600 font-semibold'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300',
              ].join(' ')}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
