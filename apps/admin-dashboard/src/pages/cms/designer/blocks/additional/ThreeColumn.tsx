/**
 * Additional Block - ThreeColumn
 *
 * Three column layout
 */

import { ReactNode } from 'react';

export interface ThreeColumnProps {
  gap?: 'sm' | 'md' | 'lg';
  verticalAlign?: 'top' | 'center' | 'bottom';
  children?: ReactNode;
}

const gapClasses = {
  sm: 'gap-4',
  md: 'gap-6',
  lg: 'gap-8',
};

const alignClasses = {
  top: 'items-start',
  center: 'items-center',
  bottom: 'items-end',
};

export default function ThreeColumn({
  gap = 'md',
  verticalAlign = 'top',
  children,
}: ThreeColumnProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 ${gapClasses[gap]} ${alignClasses[verticalAlign]}`}>
      {children || (
        <>
          <div className="p-4 border border-dashed border-gray-300 rounded text-center text-gray-500">
            Column 1
          </div>
          <div className="p-4 border border-dashed border-gray-300 rounded text-center text-gray-500">
            Column 2
          </div>
          <div className="p-4 border border-dashed border-gray-300 rounded text-center text-gray-500">
            Column 3
          </div>
        </>
      )}
    </div>
  );
}
