/**
 * Role Dashboard Menu Component
 *
 * Supports both section/tab navigation and route-based navigation
 * - Section mode: Uses onChange callback for hash-based navigation
 * - Route mode: Uses href for route-based navigation
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';

export interface DashboardMenuItem<T extends string = string> {
  key: T;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
  href?: string;                      // Route path for navigation
  type?: 'section' | 'route';         // Navigation type
}

interface RoleDashboardMenuProps<T extends string = string> {
  items: DashboardMenuItem<T>[];
  active: T;
  onChange?: (key: T) => void;        // Optional for route-based menus
  orientation?: 'horizontal' | 'vertical';
  variant?: 'tabs' | 'pills' | 'sidebar';
  className?: string;
}

export function RoleDashboardMenu<T extends string = string>({
  items,
  active,
  onChange,
  orientation = 'horizontal',
  variant = 'tabs',
  className
}: RoleDashboardMenuProps<T>) {
  const navigate = useNavigate();
  const isHorizontal = orientation === 'horizontal';

  const handleClick = (item: DashboardMenuItem<T>) => {
    // Priority: type === 'route' with href → navigate
    if (item.type === 'route' && item.href) {
      navigate(item.href);
    }
    // Fallback: onChange callback (section-based)
    else if (onChange) {
      onChange(item.key);
    }
  };

  const renderMenuItem = (item: DashboardMenuItem<T>) => {
    const isActive = active === item.key;

    // Tab variant (horizontal underline)
    if (variant === 'tabs' && isHorizontal) {
      return (
        <button
          key={item.key}
          onClick={() => handleClick(item)}
          className={cn(
            'px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
            isActive
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
          )}
        >
          <div className="flex items-center gap-2">
            {item.icon}
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span className={cn(
                'px-2 py-0.5 text-xs rounded-full',
                isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              )}>
                {item.badge}
              </span>
            )}
          </div>
        </button>
      );
    }

    // Pills variant (rounded buttons)
    if (variant === 'pills') {
      return (
        <button
          key={item.key}
          onClick={() => handleClick(item)}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
            isActive
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          <div className="flex items-center gap-2">
            {item.icon}
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span className={cn(
                'px-2 py-0.5 text-xs rounded-full',
                isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
              )}>
                {item.badge}
              </span>
            )}
          </div>
        </button>
      );
    }

    // Sidebar variant (vertical full-width)
    if (variant === 'sidebar') {
      return (
        <button
          key={item.key}
          onClick={() => handleClick(item)}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors',
            isActive
              ? 'bg-blue-50 text-blue-600'
              : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
          <span className="flex-1 text-left">{item.label}</span>
          {item.badge !== undefined && (
            <span className={cn(
              'px-2 py-0.5 text-xs rounded-full flex-shrink-0',
              isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            )}>
              {item.badge}
            </span>
          )}
        </button>
      );
    }

    return null;
  };

  return (
    <nav
      className={cn(
        'dashboard-menu',
        isHorizontal ? 'flex items-center' : 'flex flex-col',
        variant === 'tabs' && isHorizontal && 'border-b border-gray-200',
        variant === 'pills' && isHorizontal && 'flex-wrap gap-2',
        variant === 'sidebar' && 'space-y-1',
        className
      )}
      role="tablist"
      aria-orientation={orientation}
    >
      {items.map(renderMenuItem)}
    </nav>
  );
}

/**
 * Hook for managing dashboard section state with hash support
 */
export function useDashboardSection<T extends string>(
  defaultSection: T,
  validSections: readonly T[]
): [T, (section: T) => void] {
  const [activeSection, setActiveSection] = React.useState<T>(() => {
    // Try to read from URL hash
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '') as T;
      if (validSections.includes(hash)) {
        return hash;
      }
    }
    return defaultSection;
  });

  const handleSectionChange = React.useCallback((section: T) => {
    setActiveSection(section);

    // Update URL hash
    if (typeof window !== 'undefined') {
      window.location.hash = section;
    }
  }, []);

  // Listen for hash changes (browser back/forward)
  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as T;
      if (validSections.includes(hash)) {
        setActiveSection(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [validSections]);

  return [activeSection, handleSectionChange];
}

export default RoleDashboardMenu;
