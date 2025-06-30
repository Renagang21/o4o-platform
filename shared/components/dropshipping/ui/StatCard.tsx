import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: number;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  subtitle?: string;
  loading?: boolean;
}

const colorClasses = {
  blue: {
    icon: 'bg-blue-50 text-blue-600',
    change: 'text-blue-600',
    border: 'border-blue-200'
  },
  green: {
    icon: 'bg-green-50 text-green-600',
    change: 'text-green-600',
    border: 'border-green-200'
  },
  yellow: {
    icon: 'bg-yellow-50 text-yellow-600',
    change: 'text-yellow-600',
    border: 'border-yellow-200'
  },
  red: {
    icon: 'bg-red-50 text-red-600',
    change: 'text-red-600',
    border: 'border-red-200'
  },
  purple: {
    icon: 'bg-purple-50 text-purple-600',
    change: 'text-purple-600',
    border: 'border-purple-200'
  },
  gray: {
    icon: 'bg-gray-50 text-gray-600',
    change: 'text-gray-600',
    border: 'border-gray-200'
  }
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  change,
  color = 'blue',
  subtitle,
  loading = false
}) => {
  const colors = colorClasses[color];
  const isPositiveChange = change !== undefined && change > 0;
  const isNegativeChange = change !== undefined && change < 0;

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
            <div className="w-16 h-4 bg-gray-200 rounded"></div>
          </div>
          <div className="w-24 h-8 bg-gray-200 rounded mb-2"></div>
          <div className="w-32 h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`
      bg-white p-5 sm:p-6 rounded-xl border border-gray-100 
      hover:shadow-lg hover:border-gray-200 hover:-translate-y-0.5
      transition-all duration-300 ease-out cursor-pointer group
      ${colors.border}
    `}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className={`
          p-3 rounded-xl shadow-sm group-hover:shadow-md transition-shadow duration-200
          ${colors.icon}
        `}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        
        {change !== undefined && (
          <div className={`
            flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs sm:text-sm font-semibold
            ${isPositiveChange 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
              : isNegativeChange 
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : 'bg-gray-50 text-gray-600 border border-gray-200'
            }
          `}>
            {isPositiveChange && <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />}
            {isNegativeChange && <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />}
            <span>{change > 0 ? '+' : ''}{change}%</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div>
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 group-hover:text-gray-800 transition-colors">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </h3>
        <p className="text-sm font-semibold text-gray-700 mb-0.5">{title}</p>
        {subtitle && (
          <p className="text-xs text-gray-500 leading-relaxed">{subtitle}</p>
        )}
      </div>
      
      {/* Subtle accent line */}
      <div className={`mt-4 h-1 w-full rounded-full opacity-20 ${colors.icon.split(' ')[0]}`}></div>
    </div>
  );
};