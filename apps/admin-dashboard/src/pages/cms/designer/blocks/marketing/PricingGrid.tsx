/**
 * Marketing Block - PricingGrid
 *
 * Grid layout for displaying multiple pricing cards
 */

import { ReactNode } from 'react';

export interface PricingGridProps {
  title?: string;
  subtitle?: string;
  columns?: 1 | 2 | 3;
  gap?: 'sm' | 'md' | 'lg';
  bgColor?: string;
  children?: ReactNode;
}

const gapClasses = {
  sm: 'gap-4',
  md: 'gap-6',
  lg: 'gap-8',
};

const columnClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
};

export default function PricingGrid({
  title = 'Choose Your Plan',
  subtitle,
  columns = 3,
  gap = 'md',
  bgColor,
  children,
}: PricingGridProps) {
  return (
    <div className="py-12 px-4" style={{ backgroundColor: bgColor }}>
      {/* Header */}
      {(title || subtitle) && (
        <div className="text-center mb-12 max-w-3xl mx-auto">
          {title && (
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-lg text-gray-600">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Grid */}
      <div className={`grid ${columnClasses[columns]} ${gapClasses[gap]} max-w-6xl mx-auto items-start`}>
        {children || (
          <div className="p-6 border border-dashed border-gray-300 rounded-lg text-center text-gray-500">
            Add pricing cards here
          </div>
        )}
      </div>
    </div>
  );
}
