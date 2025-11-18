/**
 * Skeleton Loading Components
 * Phase PD-6: Dashboard UX Enhancement
 */

import React from 'react';

export interface SkeletonProps {
  /** Width of skeleton */
  width?: string | number;
  /** Height of skeleton */
  height?: string | number;
  /** Shape of skeleton */
  variant?: 'rect' | 'circle' | 'text';
  /** Animation speed */
  animation?: 'pulse' | 'wave' | 'none';
  /** Additional CSS classes */
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  variant = 'rect',
  animation = 'pulse',
  className = '',
}) => {
  const animationClass = animation === 'pulse' ? 'animate-pulse' : '';

  const variantClasses = {
    rect: 'rounded',
    circle: 'rounded-full',
    text: 'rounded h-4',
  };

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={`bg-gray-200 ${variantClasses[variant]} ${animationClass} ${className}`}
      style={style}
    />
  );
};

/**
 * KPI Card Skeleton
 */
export const KPICardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="circle" width={48} height={48} />
        <Skeleton width={60} height={20} />
      </div>
      <Skeleton width={100} height={32} className="mb-2" />
      <Skeleton width={150} height={16} />
    </div>
  );
};

/**
 * Chart Skeleton
 */
export const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 300 }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <Skeleton width={200} height={24} className="mb-6" />
      <Skeleton width="100%" height={height} />
    </div>
  );
};

/**
 * Table Skeleton
 */
export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <Skeleton width={200} height={24} className="mb-6" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton width={40} height={40} variant="circle" />
            <div className="flex-1 space-y-2">
              <Skeleton width="60%" height={16} />
              <Skeleton width="40%" height={14} />
            </div>
            <Skeleton width={80} height={24} />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Dashboard Skeleton
 * Full dashboard loading state
 */
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header Skeleton */}
      <div className="mb-8">
        <Skeleton width={300} height={36} className="mb-2" />
        <Skeleton width={200} height={20} />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Table Skeleton */}
      <TableSkeleton />
    </div>
  );
};

export default Skeleton;
