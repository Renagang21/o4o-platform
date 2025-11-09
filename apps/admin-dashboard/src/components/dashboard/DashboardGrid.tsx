/**
 * P1 Phase C: Dashboard Grid Layout
 *
 * Responsive grid layout for dashboard widgets with drag-and-drop support (future).
 */

import { FC, ReactNode, Suspense } from 'react';
import type { DashboardLayout } from '@o4o/types';

export interface DashboardGridProps {
  /** Grid layout configuration */
  layout?: DashboardLayout;

  /** Widget components to render */
  children: ReactNode;

  /** Custom grid columns */
  columns?: number;

  /** Custom grid gap */
  gap?: number;
}

/**
 * Dashboard Grid Component
 *
 * Provides a responsive grid layout for widgets
 */
export const DashboardGrid: FC<DashboardGridProps> = ({
  layout,
  children,
  columns = 3,
  gap = 6,
}) => {
  const gridConfig = layout?.gridConfig || { columns, gap };

  return (
    <div
      className="grid gap-6 auto-rows-min"
      style={{
        gridTemplateColumns: `repeat(${gridConfig.columns}, minmax(0, 1fr))`,
        gap: `${gridConfig.gap * 0.25}rem`,
      }}
    >
      <Suspense
        fallback={
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        }
      >
        {children}
      </Suspense>
    </div>
  );
};

/**
 * Responsive Grid Helper Classes
 */
export const gridSizeClasses = {
  small: 'col-span-1',
  medium: 'col-span-1 md:col-span-2',
  large: 'col-span-1 md:col-span-2 lg:col-span-3',
  full: 'col-span-full',
};
