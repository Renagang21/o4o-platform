/**
 * Additional Block - TwoColumn
 *
 * Two column layout
 */

import { ReactNode } from 'react';

export interface TwoColumnProps {
  leftWidth?: 50 | 40 | 60 | 33 | 67;
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

const widthRatios = {
  50: { left: 'md:w-1/2', right: 'md:w-1/2' },
  40: { left: 'md:w-2/5', right: 'md:w-3/5' },
  60: { left: 'md:w-3/5', right: 'md:w-2/5' },
  33: { left: 'md:w-1/3', right: 'md:w-2/3' },
  67: { left: 'md:w-2/3', right: 'md:w-1/3' },
};

export default function TwoColumn({
  leftWidth = 50,
  gap = 'md',
  verticalAlign = 'top',
  children,
}: TwoColumnProps) {
  return (
    <div className={`flex flex-col md:flex-row ${gapClasses[gap]} ${alignClasses[verticalAlign]}`}>
      <div className={`w-full ${widthRatios[leftWidth].left}`}>
        {children || (
          <div className="p-4 border border-dashed border-gray-300 rounded text-center text-gray-500">
            Left Column
          </div>
        )}
      </div>
      <div className={`w-full ${widthRatios[leftWidth].right}`}>
        <div className="p-4 border border-dashed border-gray-300 rounded text-center text-gray-500">
          Right Column
        </div>
      </div>
    </div>
  );
}
