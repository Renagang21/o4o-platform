/**
 * P1 Phase C: Stat Widget Component
 *
 * Displays a single statistic with optional trend and target.
 */

import { FC } from 'react';
import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';
import type { StatWidgetData } from '@o4o/types';

export interface StatWidgetProps {
  /** Stat data */
  data: StatWidgetData;

  /** Optional icon */
  icon?: React.ReactNode;

  /** Color theme */
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    icon: 'text-blue-500',
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    icon: 'text-green-500',
  },
  yellow: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-600',
    icon: 'text-yellow-500',
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    icon: 'text-red-500',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    icon: 'text-purple-500',
  },
  gray: {
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    icon: 'text-gray-500',
  },
};

/**
 * Stat Widget Component
 */
export const StatWidget: FC<StatWidgetProps> = ({ data, icon, color = 'blue' }) => {
  const theme = colorClasses[color];

  const formattedValue = formatValue(data.value, data.format);

  return (
    <div className="space-y-3">
      {/* Header with Icon */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">{data.label}</span>
        {icon && <div className={`${theme.icon}`}>{icon}</div>}
      </div>

      {/* Main Value */}
      <div className="flex items-baseline space-x-2">
        <span className={`text-3xl font-bold ${theme.text}`}>{formattedValue}</span>

        {/* Change Indicator */}
        {data.change && (
          <div className="flex items-center space-x-1">
            {data.change.direction === 'up' && (
              <TrendingUp className="w-4 h-4 text-green-500" />
            )}
            {data.change.direction === 'down' && (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            {data.change.direction === 'neutral' && <Minus className="w-4 h-4 text-gray-400" />}
            <span
              className={`text-sm font-medium ${
                data.change.direction === 'up'
                  ? 'text-green-600'
                  : data.change.direction === 'down'
                  ? 'text-red-600'
                  : 'text-gray-500'
              }`}
            >
              {data.change.percentage > 0 ? '+' : ''}
              {data.change.percentage.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Target Progress */}
      {data.target && typeof data.value === 'number' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 flex items-center">
              <Target className="w-3 h-3 mr-1" />
              목표: {formatValue(data.target, data.format)}
            </span>
            <span className="font-medium text-gray-700">
              {Math.min(100, Math.round((data.value / data.target) * 100))}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={`${theme.bg} h-1.5 rounded-full transition-all`}
              style={{
                width: `${Math.min(100, (data.value / data.target) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Context */}
      {data.context && (
        <p className="text-xs text-gray-500">{data.context}</p>
      )}
    </div>
  );
};

/**
 * Format value based on format type
 */
function formatValue(value: number | string, format?: 'number' | 'currency' | 'percentage' | 'duration'): string {
  if (typeof value === 'string') return value;

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
        notation: value >= 100000000 ? 'compact' : 'standard',
      }).format(value);

    case 'percentage':
      return `${value.toFixed(1)}%`;

    case 'duration':
      const hours = Math.floor(value / 3600);
      const minutes = Math.floor((value % 3600) / 60);
      if (hours > 0) return `${hours}시간 ${minutes}분`;
      return `${minutes}분`;

    case 'number':
    default:
      return new Intl.NumberFormat('ko-KR').format(value);
  }
}
