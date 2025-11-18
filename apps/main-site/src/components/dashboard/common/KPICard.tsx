/**
 * KPI Card Component
 * Reusable KPI card for dashboard statistics
 * Phase PD-6: Dashboard UX Enhancement
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface KPICardProps {
  /** Card title */
  title: string;
  /** Main value to display */
  value: string | number;
  /** Subtitle or additional info */
  subtitle?: string;
  /** Icon component (Lucide icon) */
  icon?: LucideIcon;
  /** Emoji icon (alternative to Lucide icon) */
  emoji?: string;
  /** Card color theme */
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
  /** Change percentage or indicator */
  change?: string;
  /** Change type (positive/negative) */
  changeType?: 'increase' | 'decrease' | 'neutral';
  /** Loading state */
  loading?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Badge value (for notifications) */
  badge?: number | string;
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  purple: 'bg-purple-50 text-purple-600',
  orange: 'bg-orange-50 text-orange-600',
  red: 'bg-red-50 text-red-600',
  gray: 'bg-gray-50 text-gray-600',
};

const changeColors = {
  increase: 'text-green-600',
  decrease: 'text-red-600',
  neutral: 'text-gray-600',
};

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  emoji,
  color = 'blue',
  change,
  changeType = 'neutral',
  loading = false,
  onClick,
  badge,
}) => {
  const colorClass = colorClasses[color];
  const changeColor = changeColors[changeType];

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-lg bg-gray-200 w-12 h-12"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-32"></div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl shadow-sm p-6 transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        {/* Icon */}
        <div className={`p-3 rounded-lg ${colorClass} relative`}>
          {Icon && <Icon className="w-6 h-6" />}
          {emoji && <span className="text-2xl">{emoji}</span>}
          {badge && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {badge}
            </span>
          )}
        </div>

        {/* Change Indicator */}
        {change && (
          <span className={`text-sm font-medium ${changeColor}`}>
            {change}
            {changeType === 'increase' && ' ↑'}
            {changeType === 'decrease' && ' ↓'}
          </span>
        )}
      </div>

      {/* Value */}
      <h3 className="text-2xl font-bold text-gray-900 mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </h3>

      {/* Title & Subtitle */}
      <p className="text-sm text-gray-500">{title}</p>
      {subtitle && (
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  );
};

/**
 * KPI Grid Container
 * Grid layout for KPI cards
 */
export const KPIGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {children}
    </div>
  );
};

export default KPICard;
