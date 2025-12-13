/**
 * AGKPIBlock - Antigravity Design System KPI Block
 *
 * Phase 7-A: Core KPI display component
 *
 * Features:
 * - Title and value display
 * - Delta (change) indicator
 * - Color modes: positive/negative/neutral
 * - Icon support
 * - Trend visualization
 */

import React, { ReactNode } from 'react';

export type AGKPIColorMode = 'positive' | 'negative' | 'neutral' | 'info';

export interface AGKPIBlockProps {
  title: string;
  value: string | number;
  delta?: number | string;
  deltaLabel?: string;
  colorMode?: AGKPIColorMode;
  icon?: ReactNode;
  subtitle?: string;
  loading?: boolean;
  trend?: 'up' | 'down' | 'stable';
  className?: string;
}

const colorModeStyles: Record<AGKPIColorMode, { text: string; bg: string; delta: string }> = {
  positive: {
    text: 'text-green-700',
    bg: 'bg-green-50',
    delta: 'text-green-600',
  },
  negative: {
    text: 'text-red-700',
    bg: 'bg-red-50',
    delta: 'text-red-600',
  },
  neutral: {
    text: 'text-gray-700',
    bg: 'bg-gray-50',
    delta: 'text-gray-600',
  },
  info: {
    text: 'text-blue-700',
    bg: 'bg-blue-50',
    delta: 'text-blue-600',
  },
};

function TrendIcon({ trend, colorMode }: { trend: 'up' | 'down' | 'stable'; colorMode: AGKPIColorMode }) {
  const colors = colorModeStyles[colorMode];

  if (trend === 'up') {
    return (
      <svg className={`w-4 h-4 ${colors.delta}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    );
  }
  if (trend === 'down') {
    return (
      <svg className={`w-4 h-4 ${colors.delta}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    );
  }
  return (
    <svg className={`w-4 h-4 ${colors.delta}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
    </svg>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export function AGKPIBlock({
  title,
  value,
  delta,
  deltaLabel,
  colorMode = 'neutral',
  icon,
  subtitle,
  loading = false,
  trend,
  className = '',
}: AGKPIBlockProps) {
  const colors = colorModeStyles[colorMode];

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <Skeleton className="h-4 w-20 mb-3" />
        <Skeleton className="h-8 w-24 mb-2" />
        <Skeleton className="h-4 w-16" />
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        {icon && (
          <span className={`p-2 rounded-lg ${colors.bg}`}>
            {icon}
          </span>
        )}
      </div>

      {/* Value */}
      <div className="mb-1">
        <span className={`text-2xl font-bold ${colors.text}`}>{value}</span>
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-gray-500 mb-2">{subtitle}</p>
      )}

      {/* Delta */}
      {delta !== undefined && (
        <div className="flex items-center gap-1">
          {trend && <TrendIcon trend={trend} colorMode={colorMode} />}
          <span className={`text-sm font-medium ${colors.delta}`}>
            {typeof delta === 'number' && delta > 0 ? '+' : ''}
            {delta}
            {deltaLabel && <span className="text-gray-500 ml-1">{deltaLabel}</span>}
          </span>
        </div>
      )}
    </div>
  );
}

// Grid container for multiple KPI blocks
export interface AGKPIGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function AGKPIGrid({ children, columns = 4, className = '' }: AGKPIGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid gap-4 ${gridCols[columns]} ${className}`}>
      {children}
    </div>
  );
}

export default AGKPIBlock;
