/**
 * AGStatCard - Statistics Card Component
 *
 * Phase 7-C: Global Components
 *
 * Features:
 * - Number/label display
 * - Trend indicators (up/down)
 * - Delta percentage
 * - Icon support
 */

import React, { ReactNode } from 'react';

export type AGStatTrend = 'up' | 'down' | 'neutral';

export interface AGStatCardProps {
  /** Stat label */
  label: string;
  /** Stat value */
  value: string | number;
  /** Previous value (for delta calculation) */
  previousValue?: number;
  /** Delta percentage (overrides calculation) */
  delta?: number;
  /** Trend direction (overrides calculation) */
  trend?: AGStatTrend;
  /** Delta label (e.g., "vs last month") */
  deltaLabel?: string;
  /** Icon */
  icon?: ReactNode;
  /** Icon background color */
  iconBgColor?: string;
  /** Icon color */
  iconColor?: string;
  /** Loading state */
  loading?: boolean;
  /** Custom class name */
  className?: string;
  /** Compact mode */
  compact?: boolean;
  /** Click handler */
  onClick?: () => void;
}

export function AGStatCard({
  label,
  value,
  previousValue,
  delta,
  trend,
  deltaLabel = '전월 대비',
  icon,
  iconBgColor = 'bg-blue-50',
  iconColor = 'text-blue-600',
  loading = false,
  className = '',
  compact = false,
  onClick,
}: AGStatCardProps) {
  // Calculate delta if not provided
  const calculatedDelta =
    delta ??
    (previousValue !== undefined && typeof value === 'number'
      ? ((value - previousValue) / previousValue) * 100
      : undefined);

  // Determine trend
  const calculatedTrend =
    trend ??
    (calculatedDelta !== undefined
      ? calculatedDelta > 0
        ? 'up'
        : calculatedDelta < 0
        ? 'down'
        : 'neutral'
      : undefined);

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-500',
  };

  const trendBgColors = {
    up: 'bg-green-50',
    down: 'bg-red-50',
    neutral: 'bg-gray-50',
  };

  if (loading) {
    return (
      <div
        className={`
          bg-white rounded-lg border border-gray-200 shadow-sm
          ${compact ? 'p-3' : 'p-4'}
          ${className}
        `}
      >
        <div className="animate-pulse">
          <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
          <div className="h-8 w-24 bg-gray-200 rounded mb-2" />
          <div className="h-3 w-16 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        bg-white rounded-lg border border-gray-200 shadow-sm
        ${compact ? 'p-3' : 'p-4'}
        ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Label */}
          <p className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-500`}>
            {label}
          </p>

          {/* Value */}
          <p className={`${compact ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 mt-1`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>

          {/* Delta */}
          {calculatedDelta !== undefined && calculatedTrend && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={`
                  inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium
                  ${trendColors[calculatedTrend]} ${trendBgColors[calculatedTrend]}
                `}
              >
                {calculatedTrend === 'up' && (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                )}
                {calculatedTrend === 'down' && (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                )}
                {Math.abs(calculatedDelta).toFixed(1)}%
              </span>
              <span className="text-xs text-gray-500">{deltaLabel}</span>
            </div>
          )}
        </div>

        {/* Icon */}
        {icon && (
          <div
            className={`
              flex-shrink-0 ${compact ? 'w-8 h-8' : 'w-10 h-10'}
              rounded-lg ${iconBgColor} ${iconColor}
              flex items-center justify-center
            `}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * AGStatGrid - Grid layout for stat cards
 */
export interface AGStatGridProps {
  /** Number of columns */
  cols?: 2 | 3 | 4 | 5;
  /** Children (AGStatCard components) */
  children: ReactNode;
  /** Custom class name */
  className?: string;
}

export function AGStatGrid({
  cols = 4,
  children,
  className = '',
}: AGStatGridProps) {
  const colClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5',
  };

  return (
    <div className={`grid ${colClasses[cols]} gap-4 ${className}`}>
      {children}
    </div>
  );
}

export default AGStatCard;
