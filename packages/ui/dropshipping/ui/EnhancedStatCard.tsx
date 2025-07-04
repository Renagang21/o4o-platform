import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, MoreHorizontal, Target, Calendar } from 'lucide-react';

interface SparklineData {
  value: number;
  date: string;
}

interface TargetProgress {
  current: number;
  target: number;
  label: string;
}

interface DrillDownData {
  title: string;
  items: Array<{
    label: string;
    value: string | number;
    change?: number;
    status?: 'good' | 'warning' | 'critical';
  }>;
}

interface EnhancedStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: number;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  subtitle?: string;
  loading?: boolean;
  sparklineData?: SparklineData[];
  targetProgress?: TargetProgress;
  drillDownData?: DrillDownData;
  onDrillDown?: () => void;
  className?: string;
}

const colorClasses = {
  blue: {
    icon: 'bg-blue-50 text-blue-600 border-blue-100',
    accent: 'bg-blue-500',
    hover: 'hover:border-blue-300'
  },
  green: {
    icon: 'bg-green-50 text-green-600 border-green-100',
    accent: 'bg-green-500',
    hover: 'hover:border-green-300'
  },
  yellow: {
    icon: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    accent: 'bg-yellow-500',
    hover: 'hover:border-yellow-300'
  },
  red: {
    icon: 'bg-red-50 text-red-600 border-red-100',
    accent: 'bg-red-500',
    hover: 'hover:border-red-300'
  },
  purple: {
    icon: 'bg-purple-50 text-purple-600 border-purple-100',
    accent: 'bg-purple-500',
    hover: 'hover:border-purple-300'
  },
  gray: {
    icon: 'bg-gray-50 text-gray-600 border-gray-100',
    accent: 'bg-gray-500',
    hover: 'hover:border-gray-300'
  }
};

// Simple sparkline component using SVG
const SimpleSparkline: React.FC<{ data: SparklineData[]; color: string }> = ({ data, color }) => {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d.value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-20 h-8">
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          className="opacity-60"
        />
        <circle
          cx={data.length > 0 ? ((data.length - 1) / (data.length - 1)) * 100 : 0}
          cy={data.length > 0 ? 100 - ((data[data.length - 1].value - min) / range) * 100 : 0}
          r="2"
          fill={color}
          className="opacity-80"
        />
      </svg>
    </div>
  );
};

// Progress bar component
const ProgressBar: React.FC<{ progress: TargetProgress; color: string }> = ({ progress, color }) => {
  const percentage = Math.min((progress.current / progress.target) * 100, 100);
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600 font-medium">{progress.label}</span>
        <span className="text-gray-800 font-semibold">
          {percentage.toFixed(1)}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div 
          className={`h-1.5 rounded-full transition-all duration-500 ease-out`}
          style={{ 
            width: `${percentage}%`,
            backgroundColor: color
          }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{typeof progress.current === 'number' ? progress.current.toLocaleString() : progress.current}</span>
        <span>{typeof progress.target === 'number' ? progress.target.toLocaleString() : progress.target}</span>
      </div>
    </div>
  );
};

export const EnhancedStatCard: React.FC<EnhancedStatCardProps> = ({
  title,
  value,
  icon: Icon,
  change,
  color = 'blue',
  subtitle,
  loading = false,
  sparklineData,
  targetProgress,
  drillDownData,
  onDrillDown,
  className = ''
}) => {
  const colors = colorClasses[color];
  const isPositiveChange = change !== undefined && change > 0;
  const isNegativeChange = change !== undefined && change < 0;
  const accentColor = colors.accent.split('-')[1] + '-500';

  if (loading) {
    return (
      <div className={`bg-white p-5 sm:p-6 rounded-xl border border-gray-200 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
            <div className="w-16 h-6 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="w-24 h-8 bg-gray-200 rounded"></div>
            <div className="w-32 h-4 bg-gray-200 rounded"></div>
            <div className="w-full h-2 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`
        bg-white p-5 sm:p-6 rounded-xl border border-gray-200 
        hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ease-out 
        group cursor-pointer relative overflow-hidden
        ${colors.hover} ${className}
      `}
      onClick={onDrillDown}
    >
      {/* Background Gradient */}
      <div className={`absolute top-0 right-0 w-32 h-32 ${colors.accent} opacity-5 rounded-full transform translate-x-16 -translate-y-16`}></div>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={`p-3 rounded-xl border ${colors.icon} group-hover:scale-110 transition-transform duration-200`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        
        <div className="flex items-center gap-2">
          {sparklineData && (
            <SimpleSparkline 
              data={sparklineData} 
              color={`var(--${color}-500, #3b82f6)`}
            />
          )}
          
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
          
          {onDrillDown && (
            <button className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 group-hover:text-gray-800 transition-colors">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </h3>
        <p className="text-sm font-semibold text-gray-700 mb-2">{title}</p>
        
        {subtitle && (
          <p className="text-xs text-gray-500 leading-relaxed mb-3">{subtitle}</p>
        )}

        {/* Target Progress */}
        {targetProgress && (
          <div className="mt-4">
            <ProgressBar 
              progress={targetProgress} 
              color={`var(--${color}-500, #3b82f6)`}
            />
          </div>
        )}

        {/* Quick Insights */}
        {drillDownData && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
              <Target className="w-3 h-3" />
              <span>주요 지표</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {drillDownData.items.slice(0, 2).map((item, index) => (
                <div key={index} className="text-xs">
                  <div className="text-gray-500">{item.label}</div>
                  <div className="font-semibold text-gray-800">
                    {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hover Indicator */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${colors.accent} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
    </div>
  );
};