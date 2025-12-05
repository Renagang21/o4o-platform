/**
 * Marketing Block - FeatureGrid
 *
 * Grid layout for displaying multiple features/benefits
 */

import { ReactNode } from 'react';

export interface FeatureGridProps {
  title?: string;
  subtitle?: string;
  columns?: 2 | 3 | 4;
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
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
};

export default function FeatureGrid({
  title = 'Our Features',
  subtitle,
  columns = 3,
  gap = 'md',
  bgColor,
  children,
}: FeatureGridProps) {
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
      <div className={`grid ${columnClasses[columns]} ${gapClasses[gap]} max-w-7xl mx-auto`}>
        {children || (
          <div className="p-6 border border-dashed border-gray-300 rounded-lg text-center text-gray-500">
            Add feature items here
          </div>
        )}
      </div>
    </div>
  );
}
